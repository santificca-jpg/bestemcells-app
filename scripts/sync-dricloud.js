// scripts/sync-dricloud.js
//
// Scrape la agenda de DriCloud y sincroniza los turnos en Supabase.
//
// Uso:
//   node scripts/sync-dricloud.js                          → semana actual (lun-vie)
//   node scripts/sync-dricloud.js 2026-04-13               → día puntual
//   node scripts/sync-dricloud.js 2026-04-13 2026-04-17    → rango de fechas
//
// Requiere: haber ejecutado la migración SQL en Supabase primero.

require("dotenv").config({ path: ".env.local" });
const { chromium } = require("playwright");
const { createClient } = require("@supabase/supabase-js");

// ─── Configuración ────────────────────────────────────────────────────────────

const DRICLOUD_BASE  = process.env.DRICLOUD_BASE_URL;
const DRICLOUD_SLUG  = process.env.DRICLOUD_URL_CLINICA;
const USUARIO        = process.env.DRICLOUD_USUARIO;
const PASSWORD       = process.env.DRICLOUD_PASSWORD;
const PLANNING_URL   = `${DRICLOUD_BASE}/${DRICLOUD_SLUG}/Planning`;

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// ─── Mapeo de sala (despacho) → vertical ─────────────────────────────────────
// En DriCloud las salas "Lounge Drip*" son sueroterapia y "Sala de Procedimientos"
// es procedimientos. El resto se resuelve por especialidad del profesional.

function salaToVertical(sala) {
  if (!sala) return null;
  const lower = sala.toLowerCase();
  if (lower.includes("drip") || lower.includes("suero")) return "sueroterapia";
  if (lower.includes("procedimiento"))                   return "procedimientos";
  return null; // fallar → usar especialidad del doctor
}

// ─── Mapeo de especialidades → vertical ──────────────────────────────────────

const SPECIALTY_TO_VERTICAL = {
  "regenerativa y dolor":        "dolor",
  "dolor":                       "dolor",
  "longevidad y wellness":       "longevidad",
  "longevidad":                  "longevidad",
  "nutrición":                   "nutricion",
  "nutricion":                   "nutricion",
  "nutrición regenerativa":      "nutricion",
  "nutricion regenerativa":      "nutricion",
  "kinesiología":                "kinesiologia",
  "kinesiologia":                "kinesiologia",
  "rehabilitación regenerativa": "kinesiologia",
  "rehabilitacion regenerativa": "kinesiologia",
  "estética":                    "estetica",
  "estetica":                    "estetica",
  "estética y antiage":          "estetica",
  "estetica y antiage":          "estetica",
  "sueroterapia":                "sueroterapia",
  "estudios":                    "estudios",
  "diagnóstico":                 "estudios",
};

function especialidadToVertical(especialidad) {
  if (!especialidad) return "longevidad";
  const lower = especialidad.toLowerCase();
  for (const [key, vertical] of Object.entries(SPECIALTY_TO_VERTICAL)) {
    if (lower.includes(key)) return vertical;
  }
  return "longevidad";
}

// Vertical final: sala > especialidad del doctor
function resolverVertical(sala, especialidad) {
  return salaToVertical(sala) ?? especialidadToVertical(especialidad);
}

// ─── Helpers de fecha ────────────────────────────────────────────────────────

function getLunesViernes() {
  const now = new Date();
  const day = now.getDay(); // 0=dom, 1=lun, ..., 6=sab
  const diffToMonday = day === 0 ? -6 : 1 - day;
  const lunes = new Date(now);
  lunes.setDate(now.getDate() + diffToMonday);
  const viernes = new Date(lunes);
  viernes.setDate(lunes.getDate() + 4);
  return { lunes, viernes };
}

function parseDate(str) {
  const [y, m, d] = str.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function toDricloudDate(date) {
  // DD/MM/YYYY
  const d = String(date.getDate()).padStart(2, "0");
  const m = String(date.getMonth() + 1).padStart(2, "0");
  return `${d}/${m}/${date.getFullYear()}`;
}

function toISO(date, hora) {
  // date = Date object, hora = "HH:MM"
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}T${hora}:00`;
}

function getDatesInRange(start, end) {
  const dates = [];
  const cur = new Date(start);
  while (cur <= end) {
    const dow = cur.getDay();
    if (dow !== 0 && dow !== 6) dates.push(new Date(cur)); // excluir sáb y dom
    cur.setDate(cur.getDate() + 1);
  }
  return dates;
}

// ─── Parseo del HTML de Planning ─────────────────────────────────────────────
//
// Estructura real de DriCloud:
//   <div id="despacho10">
//     <div class="doctorAsignado dr6964">  ← doctor A (franja horaria)
//       <h2>Dr./Dra. Nombre (especialidad)</h2>
//     </div>
//     <div class="doctorAsignado dr6941">  ← doctor B (franja horaria)
//       ...
//     </div>
//     <ul>
//       <li onclick="AltaEditCita('CPA_ID', 'DOCTOR_ID', 'HH:MM')">  ← turno
//     </ul>
//   </div>
//
// El segundo param de AltaEditCita = ID del doctor asignado a ese turno.

function parsePlanningHTML(html, date) {
  const appointments = [];
  const doctorsMap = {}; // slot_id → { nombre, especialidad, vertical, sala }

  // 0. Extraer el nombre de sala (despacho) para cada slot_id
  //    Estructura: <div id="despachoN" ...> ... <h2>Sala Name</h2> ...  <div class="doctorAsignado drSLOT">
  const salaPerSlot = {}; // slot_id → sala_name
  const despachoParts = html.split(/<div[^>]+class="[^"]*\bdespacho\b[^"]*"[^>]*>/);
  for (const part of despachoParts.slice(1)) {
    // Extraer nombre de sala del panel-heading
    const headingMatch = part.match(/panel-heading[\s\S]{0,300}?<h2[^>]*>[\s\S]*?<\/span>\s*([^<]+?)\s*<\/h2>/);
    if (!headingMatch) continue;
    const salaNombre = headingMatch[1].trim();

    // Extraer todos los slot IDs en este despacho
    const slotMatches = [...part.matchAll(/doctorAsignado dr(\d+)/g)];
    for (const sm of slotMatches) {
      salaPerSlot[sm[1]] = salaNombre;
    }
  }

  // 1. Construir mapa de doctores desde todos los bloques doctorAsignado
  const doctorBlockRegex = /<div class="doctorAsignado dr(\d+)"[^>]*>[\s\S]*?<h2[^>]*>\s*([\s\S]*?)\s*<\/h2>/g;
  let blockMatch;

  while ((blockMatch = doctorBlockRegex.exec(html)) !== null) {
    const slotId      = blockMatch[1];
    const h2Text      = blockMatch[2].replace(/<[^>]+>/g, "").trim();

    // Formato: "Dr./Dra. Apellido, Nombre (N. Especialidad)" o "Lic. Nombre Apellido (...)"
    const nameMatch = h2Text.match(/(?:Dr\.\/Dra\.|Lic\.?)\s*(.+?)(?:\s*\(([^)]+)\))?$/);
    if (!nameMatch) continue;

    const nombreCompleto = nameMatch[1].trim();
    const especialidad   = nameMatch[2] ? nameMatch[2].replace(/^\d+\.\s*/, "").trim() : "";
    const sala           = salaPerSlot[slotId] ?? "";
    const vertical       = resolverVertical(sala, especialidad);

    doctorsMap[slotId] = { nombre: nombreCompleto, especialidad, sala, vertical };
  }

  // 2. Extraer todos los turnos ocupados del HTML completo
  // Orden real en el HTML: title → class → data-width → onclick
  const citaRegex = /<li\s+[^>]*?title="Modificar\/Eliminar cita ([^"]+)"[^>]*?class="cita occupy([^"]*)"[^>]*?data-width="(\d+)"[^>]*?onclick="AltaEditCita\('(\d+)',\s*'(\d+)',\s*'([^']+)'\)"/g;
  let citaMatch;

  while ((citaMatch = citaRegex.exec(html)) !== null) {
    const title      = citaMatch[1];
    const extraClass = citaMatch[2].trim();
    const duracion   = parseInt(citaMatch[3], 10);
    const cpaId      = citaMatch[4];
    const slotId     = citaMatch[5]; // mapea a doctorsMap
    const hora       = citaMatch[6];

    const cancelada = extraClass.includes("BgLineasDiagonales");
    const estado = cancelada ? "cancelada" : "confirmada";

    // Paciente: título es "HH:MM - APELLIDO, Nombre"
    const patientRaw = title.replace(/^\d+:\d+\s*-\s*/, "").trim();
    const patientParts = patientRaw.split(",").map((s) => s.trim());
    const nombrePaciente = patientParts.length >= 2
      ? `${patientParts[1]} ${patientParts[0]}`
      : patientRaw;

    appointments.push({
      cpa_id:              cpaId,
      slot_id:             slotId,
      nombre_paciente:     nombrePaciente,
      nombre_paciente_raw: patientRaw,
      hora,
      duracion_min:        duracion,
      estado,
      fecha_hora:          toISO(date, hora),
    });
  }

  return { appointments, doctorsMap };
}

// ─── Supabase: upsert helpers ────────────────────────────────────────────────

async function upsertProfesional(docId, data) {
  const { data: existing } = await supabase
    .from("era_professionals")
    .select("id")
    .eq("dricloud_id", docId)
    .single();

  if (existing) return existing.id;

  const { data: inserted, error } = await supabase
    .from("era_professionals")
    .insert({
      dricloud_id:      docId,
      nombre:           data.nombre,
      especialidad:     data.especialidad,
      vertical_default: data.vertical,
      activo:           true,
    })
    .select("id")
    .single();

  if (error) throw new Error(`Error insertando profesional ${data.nombre}: ${error.message}`);
  return inserted.id;
}

async function upsertPaciente(nombreRaw, fechaIso) {
  const apptDate   = fechaIso.split("T")[0];
  const esVip      = nombreRaw.includes("🧬");
  const dricloudId = nombreRaw.toLowerCase().replace(/[^a-záéíóúñü0-9]/g, "_");

  const { data: existing } = await supabase
    .from("era_patients")
    .select("id, primera_visita_fecha, es_vip")
    .eq("dricloud_id", dricloudId)
    .single();

  if (existing) {
    const updates = {};

    // Actualizar primera_visita_fecha si esta cita es anterior
    const fechaCita   = new Date(fechaIso);
    const fechaActual = existing.primera_visita_fecha
      ? new Date(existing.primera_visita_fecha)
      : null;
    let primeraVisitaFecha = existing.primera_visita_fecha;
    if (!fechaActual || fechaCita < fechaActual) {
      updates.primera_visita_fecha = apptDate;
      primeraVisitaFecha = apptDate;
    }

    // Marcar VIP si el emoji aparece en el nombre
    if (esVip && !existing.es_vip) updates.es_vip = true;

    if (Object.keys(updates).length > 0) {
      await supabase.from("era_patients").update(updates).eq("id", existing.id);
    }

    return { id: existing.id, primeraVisitaFecha };
  }

  // Separar nombre / apellidos
  const parts        = nombreRaw.split(",").map((s) => s.trim());
  const apellidos    = parts[0] || "";
  const nombre       = parts[1] || "";
  const nombreCompleto = nombre ? `${nombre} ${apellidos}` : apellidos;

  const { data: inserted, error } = await supabase
    .from("era_patients")
    .insert({
      dricloud_id:          dricloudId,
      nombre_completo:      nombreCompleto,
      primera_visita_fecha: apptDate,
      es_vip:               esVip,
    })
    .select("id")
    .single();

  if (error) throw new Error(`Error insertando paciente ${nombreCompleto}: ${error.message}`);
  return { id: inserted.id, primeraVisitaFecha: apptDate };
}

async function upsertCita(cpaId, pacienteId, profesionalId, data) {
  const { error } = await supabase
    .from("era_appointments")
    .upsert(
      {
        dricloud_id:        cpaId,
        paciente_id:        pacienteId,
        profesional_id:     profesionalId,
        fecha_hora:         data.fecha_hora,
        duracion_min:       data.duracion_min,
        estado:             data.estado,
        vertical_calculada: data.vertical,
        es_primera_vez:     data.es_primera_vez,
      },
      { onConflict: "dricloud_id" }
    );

  if (error) throw new Error(`Error upserting cita ${cpaId}: ${error.message}`);
}

// ─── Scraper principal ────────────────────────────────────────────────────────

async function scrapeDia(page, date) {
  const dateStr = toDricloudDate(date);
  const url = `${PLANNING_URL}/?dateString=${dateStr}&tipo=1`;

  console.log(`  Cargando ${dateStr}...`);
  await page.goto(url, { waitUntil: "domcontentloaded" });
  // Esperar a que aparezca al menos un bloque de despacho
  await page.waitForSelector('[id^="despacho"]', { timeout: 15000 }).catch(() => {});
  await page.waitForTimeout(2000);

  const html = await page.content();
  return parsePlanningHTML(html, date);
}

async function login(page) {
  console.log("Haciendo login en DriCloud...");
  await page.goto(`${DRICLOUD_BASE}/${DRICLOUD_SLUG}`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(1500);

  await page.locator('input[name="User"]').fill(USUARIO);
  await page.locator('input[name="Password"]').fill(PASSWORD);
  await page.locator('input[name="Password"]').press("Enter");
  await page.waitForLoadState("domcontentloaded");
  await page.waitForTimeout(2000);

  const url = page.url();
  if (!url.includes("Home") && !url.includes("Planning")) {
    throw new Error(`Login fallido. URL actual: ${url}`);
  }
  console.log("Login OK ✓\n");
}

// ─── Main ─────────────────────────────────────────────────────────────────────

(async () => {
  // Determinar rango de fechas
  let startDate, endDate;
  const args = process.argv.slice(2);

  if (args.length === 0) {
    const { lunes, viernes } = getLunesViernes();
    startDate = lunes;
    endDate   = viernes;
  } else if (args.length === 1) {
    startDate = parseDate(args[0]);
    endDate   = startDate;
  } else {
    startDate = parseDate(args[0]);
    endDate   = parseDate(args[1]);
  }

  const dates = getDatesInRange(startDate, endDate);
  console.log(`\n=== Sync DriCloud → Supabase ===`);
  console.log(`Fechas: ${toDricloudDate(startDate)} → ${toDricloudDate(endDate)} (${dates.length} días hábiles)\n`);

  const browser = await chromium.launch({ headless: true });
  const page    = await browser.newPage();
  page.setDefaultTimeout(20000);

  let totalInserted = 0;
  let totalErrors   = 0;

  try {
    await login(page);

    for (const date of dates) {
      const { appointments, doctorsMap } = await scrapeDia(page, date);
      console.log(`  → ${appointments.length} turno(s) encontrado(s)`);

      // Upsert profesionales del día
      const profIdMap = {}; // slot_id → uuid
      for (const [slotId, docData] of Object.entries(doctorsMap)) {
        try {
          profIdMap[slotId] = await upsertProfesional(slotId, docData);
        } catch (e) {
          console.error(`  ⚠️  Profesional ${docData.nombre}: ${e.message}`);
        }
      }

      // Upsert citas
      for (const appt of appointments) {
        try {
          const { id: pacienteId, primeraVisitaFecha } = await upsertPaciente(appt.nombre_paciente_raw, appt.fecha_hora);
          const profesionalId = profIdMap[appt.slot_id];

          if (!profesionalId) {
            console.error(`  ⚠️  No se encontró profesional para slot_id=${appt.slot_id}`);
            totalErrors++;
            continue;
          }

          const esPrimeraVez = primeraVisitaFecha === appt.fecha_hora.split("T")[0];

          await upsertCita(appt.cpa_id, pacienteId, profesionalId, {
            fecha_hora:    appt.fecha_hora,
            duracion_min:  appt.duracion_min,
            estado:        appt.estado,
            vertical:      doctorsMap[appt.slot_id]?.vertical ?? "longevidad",
            es_primera_vez: esPrimeraVez,
          });

          totalInserted++;
        } catch (e) {
          console.error(`  ⚠️  Cita ${appt.cpa_id} (${appt.nombre_paciente}): ${e.message}`);
          totalErrors++;
        }
      }
    }

    console.log(`\n✅ Sync completado`);
    console.log(`   Turnos sincronizados: ${totalInserted}`);
    if (totalErrors > 0) console.log(`   Errores: ${totalErrors}`);

  } catch (err) {
    console.error(`\n❌ Error fatal: ${err.message}`);
  } finally {
    await browser.close();
  }
})();
