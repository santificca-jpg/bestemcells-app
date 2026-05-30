// scripts/importar-historicos.js
//
// Marca como "histórico" (es_historico = true) a los pacientes listados en un Excel.
// Un paciente histórico NUNCA cuenta como primera vez, aunque DriCloud diga
// "Primera consulta -" en el tipo de cita.
//
// Uso:
//   node scripts/importar-historicos.js data/historicos.xlsx
//
// El Excel debe tener al menos columna(s) con el nombre del paciente. El script
// busca columnas que se llamen (case-insensitive, sin acentos):
//   - "Apellido" + "Nombre"   → arma "Apellido, Nombre"
//   - "Nombre completo"       → usa el valor tal cual
//   - "Nombre" + "Apellido"   → mismo resultado
//
// Hace match contra era_patients normalizando: minúsculas + sin acentos.
// Imprime un reporte de matcheados / no encontrados al final.

require("dotenv").config({ path: ".env.local" });
const xlsx = require("xlsx");
const path = require("path");
const { createClient } = require("@supabase/supabase-js");

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

function normalizar(s) {
  if (!s) return "";
  return String(s)
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/🧬/g, "")
    .replace(/[^a-z0-9\s,]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function findCol(header, ...nombres) {
  const normNombres = nombres.map((n) => normalizar(n));
  for (const [idx, h] of header.entries()) {
    if (normNombres.includes(normalizar(h))) return idx;
  }
  return -1;
}

(async () => {
  const file = process.argv[2];
  if (!file) {
    console.error("Falta el path al Excel. Uso: node scripts/importar-historicos.js data/historicos.xlsx");
    process.exit(1);
  }

  const fullPath = path.resolve(file);
  console.log(`Leyendo Excel: ${fullPath}`);

  const wb = xlsx.readFile(fullPath);
  const sheet = wb.Sheets[wb.SheetNames[0]];
  const rows = xlsx.utils.sheet_to_json(sheet, { header: 1, defval: "" });

  if (rows.length < 2) {
    console.error("Excel vacío o sin filas de datos.");
    process.exit(1);
  }

  const header = rows[0].map((h) => String(h));
  const idxNombreCompleto = findCol(header, "nombre completo", "paciente");
  const idxApellido = findCol(header, "apellido", "apellidos");
  const idxNombre = findCol(header, "nombre", "nombres");

  if (idxNombreCompleto === -1 && (idxApellido === -1 || idxNombre === -1)) {
    console.error("No encontré columnas válidas. Esperaba 'Nombre completo' o 'Apellido' + 'Nombre'. Encabezado:", header);
    process.exit(1);
  }

  // Construir lista de nombres normalizados desde el Excel
  const historicosExcel = [];
  for (let i = 1; i < rows.length; i++) {
    const r = rows[i];
    let nombreCompleto = "";
    if (idxNombreCompleto !== -1) {
      nombreCompleto = String(r[idxNombreCompleto] ?? "").trim();
    } else {
      const ape = String(r[idxApellido] ?? "").trim();
      const nom = String(r[idxNombre] ?? "").trim();
      if (!ape && !nom) continue;
      nombreCompleto = nom ? `${nom} ${ape}` : ape;
    }
    if (!nombreCompleto) continue;
    historicosExcel.push({ nombre: nombreCompleto, norm: normalizar(nombreCompleto) });
  }

  console.log(`Pacientes en Excel: ${historicosExcel.length}`);

  // Traer todos los pacientes de la DB
  const { data: pacientesDb, error } = await supabase
    .from("era_patients")
    .select("id, nombre_completo, es_historico");

  if (error) {
    console.error("Error consultando era_patients:", error.message);
    process.exit(1);
  }

  console.log(`Pacientes en DB: ${pacientesDb.length}`);

  // Índice por nombre normalizado de la DB
  const dbIndex = new Map();
  for (const p of pacientesDb) {
    const k = normalizar(p.nombre_completo);
    if (!dbIndex.has(k)) dbIndex.set(k, []);
    dbIndex.get(k).push(p);
  }

  const idsAMarcar = new Set();
  const noEncontrados = [];

  for (const h of historicosExcel) {
    // Match exacto
    if (dbIndex.has(h.norm)) {
      for (const p of dbIndex.get(h.norm)) idsAMarcar.add(p.id);
      continue;
    }
    // Match por inclusión (Excel "Bogado, Flavio" vs DB "🧬 Flavio Bogado" → ambos normalizan distinto)
    // Probamos cada token contra los registros de DB
    const tokens = h.norm.split(/[\s,]+/).filter((t) => t.length >= 3);
    let matched = false;
    for (const [k, regs] of dbIndex.entries()) {
      if (tokens.every((t) => k.includes(t))) {
        for (const p of regs) idsAMarcar.add(p.id);
        matched = true;
      }
    }
    if (!matched) noEncontrados.push(h.nombre);
  }

  console.log(`\nPacientes a marcar como histórico: ${idsAMarcar.size}`);
  console.log(`No encontrados en DB: ${noEncontrados.length}`);
  if (noEncontrados.length > 0 && noEncontrados.length <= 30) {
    console.log("Lista de no encontrados:");
    for (const n of noEncontrados) console.log(`  - ${n}`);
  }

  if (idsAMarcar.size === 0) {
    console.log("Nada para actualizar. Salgo.");
    return;
  }

  // Update por lotes de 100
  const ids = [...idsAMarcar];
  let updated = 0;
  for (let i = 0; i < ids.length; i += 100) {
    const batch = ids.slice(i, i + 100);
    const { error: upErr } = await supabase
      .from("era_patients")
      .update({ es_historico: true })
      .in("id", batch);
    if (upErr) {
      console.error(`Error actualizando lote ${i}-${i + 100}:`, upErr.message);
    } else {
      updated += batch.length;
    }
  }

  console.log(`\n✓ Marcados como histórico: ${updated} / ${idsAMarcar.size}`);

  // Recalcular es_primera_vez de las citas afectadas:
  // si el paciente ahora es histórico, NINGUNA cita suya puede ser primera vez.
  const { error: citasErr, count } = await supabase
    .from("era_appointments")
    .update({ es_primera_vez: false }, { count: "exact" })
    .in("paciente_id", ids)
    .eq("es_primera_vez", true);

  if (citasErr) {
    console.error("Error reseteando es_primera_vez de citas:", citasErr.message);
  } else {
    console.log(`✓ Citas reseteadas (es_primera_vez = false): ${count ?? "?"}`);
  }
})();
