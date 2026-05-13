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

// ─── Mapeo de especialidades → vertical ──────────────────────────────────────
// La sala/despacho NO determina la vertical — solo el TipoCita y la especialidad.

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

// ─── Mapeo de TipoCita → vertical ────────────────────────────────────────────
// TipoCita tiene prioridad. Si no hay match, se usa la especialidad del profesional.

function tipoCitaToVertical(tipoCita) {
  if (!tipoCita) return null;
  const t = tipoCita.toLowerCase().trim();

  // Estudios diagnósticos
  if (t === "pic" || t === "adn test" || t.includes("oligoscan") || t === "d-roms") return "estudios";

  // Procedimientos (células madre, PRP, fibroblastos, etc.)
  if (t.includes("célula") || t.includes("celula") || t.includes("exosoma") ||
      t.includes("fibroblast") || t.includes("implante msc") ||
      t.includes("infusión ev") || t.includes("infusion ev") ||
      t.includes("prp")) return "procedimientos";

  // Sueroterapia
  if (t.includes("drip") || t.includes("sueroterapia")) return "sueroterapia";

  // Estética
  if (t.includes("botox") || t.includes("hialurónico") || t.includes("hialuronico") ||
      t.includes("mesoterapia") || t.includes("peeling") ||
      t.includes("laser") || t.includes("láser") ||
      t.includes("long lasting") || t.includes("dermatolog")) return "estetica";

  // Kinesiología
  if (t.includes("kinesiolog")) return "kinesiologia";

  return null; // sin override → usar especialidad del doctor
}

// ─── Fetch del TipoCita vía API de DriCloud ───────────────────────────────────
// Llama a GetEventDetailCita (mismo endpoint que usa el modal) y parsea el select.

async function fetchTipoCitas(page, cpaIds) {
  const uniqueIds = [...new Set(cpaIds.filter((id) => id && id !== "0"))];
  if (uniqueIds.length === 0) return {};

  const slug = `/${DRICLOUD_SLUG}`;
  const result = {};

  // Procesar en bloques de 5 para no saturar DriCloud
  for (let i = 0; i < uniqueIds.length; i += 5) {
    const batch = uniqueIds.slice(i, i + 5);

    const batchResult = await page.evaluate(async ([slug, ids]) => {
      const out = {};
      await Promise.all(ids.map(async (id) => {
        try {
          const resp = await fetch(`${slug}/Cita/GetEventDetailCita`, {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: `id=${id}&fechaStr=&tipo=1`,
            credentials: "same-origin",
          });
          const html = await resp.text();
          const selMatch = html.match(/<select[^>]+id="ddlTipoCitaNewEvent"[^>]*>([\s\S]*?)<\/select>/);
          if (selMatch) {
            const optMatch = selMatch[1].match(/<option[^>]+selected="selected"[^>]*>\s*([^<]+?)\s*<\/option>/);
            if (optMatch) out[id] = optMatch[1].trim();
          }
        } catch (_) { /* ignorar errores individuales */ }
      }));
      return out;
    }, [slug, batch]);

    Object.assign(result, batchResult);
  }

  return result;
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
  const doctorsMap = {}; // slot_id → { nombre, especialidad }

  // Construir mapa de doctores desde todos los bloques doctorAsignado
  const doctorBlockRegex = /<div class="doctorAsignado dr(\d+)"[^>]*>[\s\S]*?<h2[^>]*>\s*([\s\S]*?)\s*<\/h2>/g;
  let blockMatch;

  while ((blockMatch = doctorBlockRegex.exec(html)) !== null) {
    const slotId  = blockMatch[1];
    const h2Text  = blockMatch[2].replace(/<[^>]+>/g, "").trim();

    // Formato: "Dr./Dra. Apellido, Nombre (N. Especialidad)" o "Lic. Nombre Apellido (...)"
    const nameMatch = h2Text.match(/(?:Dr\.\/Dra\.|Lic\.?)\s*(.+?)(?:\s*\(([^)]+)\))?$/);
    if (!nameMatch) continue;

    const nombreCompleto = nameMatch[1].trim();
    const especialidad   = nameMatch[2] ? nameMatch[2].replace(/^\d+\.\s*/, "").trim() : "";

    doctorsMap[slotId] = { nombre: nombreCompleto, especialidad };
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
      vertical_default: especialidadToVertical(data.especialidad),
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
  const { appointments, doctorsMap } = parsePlanningHTML(html, date);

  // Consultar TipoCita para todos los turnos — es la fuente de verdad principal.
  // La sala/despacho no se usa para clasificar verticales.
  const allCpaIds = appointments.filter((a) => a.cpa_id !== "0").map((a) => a.cpa_id);

  if (allCpaIds.length > 0) {
    console.log(`    → Consultando TipoCita para ${allCpaIds.length} turno(s)...`);
    const tipoCitaMap = await fetchTipoCitas(page, allCpaIds);

    for (const appt of appointments) {
      const tipoCita = tipoCitaMap[appt.cpa_id];
      const override = tipoCitaToVertical(tipoCita);
      if (override) appt.tipoCitaVertical = override;
    }
  }

  return { appointments, doctorsMap };
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
            vertical:      appt.tipoCitaVertical ?? especialidadToVertical(doctorsMap[appt.slot_id]?.especialidad ?? "") ?? "longevidad",
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
