import { createClient } from "@supabase/supabase-js";
import type { Vertical } from "./types";

const VALID_VERTICALS = new Set<string>([
  "longevidad", "dolor", "sueroterapia", "estudios", "procedimientos",
  "nutricion", "kinesiologia", "estetica",
]);

function toVertical(v: string | null): Vertical {
  if (v && VALID_VERTICALS.has(v)) return v as Vertical;
  return "longevidad";
}

function getMonday(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function addDays(d: Date, n: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

const MESES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

type RawAppt = {
  id: string;
  paciente_id: string;
  fecha_hora: string;
  duracion_min: number;
  estado: string;
  vertical_calculada: string | null;
  observaciones: string | null;
  motivo_consulta: string | null;
  era_professionals: { nombre: string } | null;
  es_primera_vez: boolean | null;
  era_patients: { nombre_completo: string; es_vip: boolean } | null;
};

type RawApptMin = {
  paciente_id: string;
  fecha_hora: string;
  estado: string;
  vertical_calculada: string | null;
  es_primera_vez: boolean | null;
  era_patients: { es_vip: boolean; nombre_completo: string } | null;
  era_professionals: { nombre: string } | null;
};

// Técnicas de sueroterapia: no cuentan como visitas médicas
const EXCLUIR_TECNICOS = ["fedoto", "tucker", "montero"] as const;

function esTecnico(nombre: string): boolean {
  const lower = nombre.toLowerCase();
  return EXCLUIR_TECNICOS.some((e) => lower.includes(e));
}

function computeKpis(rows: RawApptMin[]) {
  const sinTecnicos = rows.filter((r) => !esTecnico(r.era_professionals?.nombre ?? ""));
  const total = sinTecnicos.length;
  const canceladas = sinTecnicos.filter((r) => r.estado === "cancelada").length;
  const noShows = sinTecnicos.filter((r) => r.estado === "no-show").length;
  const activos = sinTecnicos.filter((r) => r.estado !== "cancelada" && r.estado !== "no-show");

  // Visitas únicas: paciente + día (no importa cuántos turnos tenga el mismo día)
  const visitasSet = new Set(
    activos.map((r) => `${r.paciente_id}:${r.fecha_hora.substring(0, 10)}`)
  );
  const visitas = visitasSet.size;

  // VIP: detectado por flag en DB o por emoji 🧬 en el nombre
  const vipPatients = new Set(
    activos
      .filter((r) => r.era_patients?.es_vip || r.era_patients?.nombre_completo?.includes("🧬"))
      .map((r) => r.paciente_id)
  );

  // Primera vez: ya lo calcula el sync (es_primera_vez en DB) según TipoCita,
  // pacientes históricos y profesionales/verticales excluidos.
  const primeraVezPatients = new Set(
    activos.filter((r) => r.es_primera_vez === true).map((r) => r.paciente_id)
  );
  const primeraVez = primeraVezPatients.size;

  const denominador = total > 0 ? total : 1;
  const tasaAsistencia =
    Math.round(((total - canceladas - noShows) / denominador) * 1000) / 10;
  const tasaPv = visitas > 0 ? Math.round((primeraVez / visitas) * 1000) / 10 : 0;

  return {
    visitas_unicas: visitas,
    tasa_asistencia: tasaAsistencia,
    primera_vez: primeraVez,
    vip: vipPatients.size,
    canceladas,
    no_shows: noShows,
    tasa_pv: tasaPv,
  };
}

const ALL_VERTICALS: Vertical[] = [
  "longevidad", "dolor", "sueroterapia", "estudios",
  "procedimientos", "nutricion", "kinesiologia", "estetica",
];

function computeDistribucion(rows: RawApptMin[]) {
  const activos = rows.filter((r) =>
    r.estado !== "cancelada" &&
    r.estado !== "no-show" &&
    !esTecnico(r.era_professionals?.nombre ?? "")
  );

  // Inicializar todas las verticales en 0 para que siempre aparezcan
  const totales: Record<Vertical, number> = Object.fromEntries(
    ALL_VERTICALS.map((v) => [v, 0])
  ) as Record<Vertical, number>;

  for (const r of activos) {
    const v = toVertical(r.vertical_calculada);
    totales[v]++;
  }

  const total = activos.length || 1;

  // Sub-verticales dentro de longevidad: cardiología (Ottonello) y endocrinología (Sabaté)
  const longevidadActivos = activos.filter((r) => toVertical(r.vertical_calculada) === "longevidad");
  const ottonelloCount = longevidadActivos.filter((r) =>
    r.era_professionals?.nombre?.toLowerCase().includes("ottonello")
  ).length;
  const sabateCount = longevidadActivos.filter((r) => {
    const n = r.era_professionals?.nombre?.toLowerCase() ?? "";
    return n.includes("sabaté") || n.includes("sabate");
  }).length;

  return ALL_VERTICALS
    .sort((a, b) => totales[b] - totales[a])
    .map((vertical) => {
      const cantidad = totales[vertical];
      const item: { vertical: Vertical; cantidad: number; porcentaje: number; sub?: { label: string; profesional: string; cantidad: number }[] } = {
        vertical,
        cantidad,
        porcentaje: activos.length > 0 ? Math.round((cantidad / total) * 1000) / 10 : 0,
      };
      if (vertical === "longevidad") {
        const sub = [];
        if (ottonelloCount > 0) sub.push({ label: "Cardiología", profesional: "Ottonello", cantidad: ottonelloCount });
        if (sabateCount > 0)   sub.push({ label: "Endocrinología", profesional: "Sabaté", cantidad: sabateCount });
        if (sub.length > 0) item.sub = sub;
      }
      return item;
    });
}

function computeTurnosPorDia(rows: RawAppt[], monday: Date) {
  const dias = ["Lun", "Mar", "Mié", "Jue", "Vie"];
  return dias.map((dia, i) => {
    const fecha = addDays(monday, i);
    const fechaStr = `${String(fecha.getDate()).padStart(2, "0")}/${String(fecha.getMonth() + 1).padStart(2, "0")}`;
    const cantidad = rows.filter((r) => {
      const d = new Date(r.fecha_hora);
      return d.getDay() === i + 1;
    }).length;
    return { dia, fecha: fechaStr, cantidad };
  });
}

export type DashboardData = {
  semana_label: string;
  total_profesionales: number;
  ultima_sync: string | null;
  kpi: {
    visitas_unicas: number;
    tasa_asistencia: number;
    primera_vez: number;
    vip: number;
    canceladas: number;
    no_shows: number;
    tasa_pv: number;
    // Recurrencia mensual: visitas únicas del mes / pacientes únicos del mes
    tasa_recurrencia: number;
    visitas_mes: number;
    pacientes_unicos_mes: number;
    vs_semana_anterior: {
      visitas_unicas: number;
      tasa_asistencia: number;
      primera_vez: number;
      canceladas: number;
    };
  };
  distribucion: { vertical: Vertical; cantidad: number; porcentaje: number; sub?: { label: string; profesional: string; cantidad: number }[] }[];
  turnos_por_dia: { dia: string; fecha: string; cantidad: number }[];
  proximas: {
    id: string;
    fecha_hora: string;
    paciente: { nombre_completo: string; es_vip: boolean };
    profesional: { nombre: string };
    servicio: string;
    vertical: Vertical;
    es_primera_vez: boolean;
    motivo_consulta: string | null;
    observaciones: string | null;
  }[];
};

const SERVICIO_LABEL: Record<Vertical, string> = {
  longevidad:     "Longevidad",
  dolor:          "Dolor / Regenerativa",
  sueroterapia:   "Sueroterapia",
  estudios:       "Estudios diagnósticos",
  procedimientos: "Procedimientos",
  nutricion:      "Nutrición",
  kinesiologia:   "Kinesiología",
  estetica:       "Estética",
};

export async function getDashboardData(): Promise<DashboardData | null> {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data: latest } = await supabase
    .from("era_appointments")
    .select("fecha_hora")
    .order("fecha_hora", { ascending: false })
    .limit(1)
    .single();

  if (!latest) return null;

  const monday = getMonday(new Date(latest.fecha_hora));
  const friday = addDays(monday, 4);
  friday.setHours(23, 59, 59, 999);

  const prevMonday = addDays(monday, -7);
  const prevFriday = addDays(prevMonday, 4);
  prevFriday.setHours(23, 59, 59, 999);

  const { data: currentRows, error } = await supabase
    .from("era_appointments")
    .select(`
      id, paciente_id, fecha_hora, duracion_min, estado, vertical_calculada, es_primera_vez, observaciones, motivo_consulta,
      era_professionals!profesional_id(nombre),
      era_patients!paciente_id(nombre_completo, es_vip)
    `)
    .gte("fecha_hora", monday.toISOString())
    .lte("fecha_hora", friday.toISOString())
    .order("fecha_hora");

  if (error) return null;

  const { data: prevRows } = await supabase
    .from("era_appointments")
    .select(`
      paciente_id, fecha_hora, estado, vertical_calculada, es_primera_vez,
      era_patients!paciente_id(es_vip, nombre_completo),
      era_professionals!profesional_id(nombre)
    `)
    .gte("fecha_hora", prevMonday.toISOString())
    .lte("fecha_hora", prevFriday.toISOString());

  // Datos del mes completo para tasa de recurrencia mensual
  const startOfMonth = new Date(monday.getFullYear(), monday.getMonth(), 1);
  const endOfMonth = new Date(monday.getFullYear(), monday.getMonth() + 1, 0, 23, 59, 59, 999);
  const { data: monthRows } = await supabase
    .from("era_appointments")
    .select("paciente_id, fecha_hora, estado, era_professionals!profesional_id(nombre)")
    .gte("fecha_hora", startOfMonth.toISOString())
    .lte("fecha_hora", endOfMonth.toISOString());

  // Último sync exitoso (bitácora era_sync_log)
  const { data: lastSync } = await supabase
    .from("era_sync_log")
    .select("finished_at")
    .eq("status", "ok")
    .not("finished_at", "is", null)
    .order("finished_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const rows = (currentRows ?? []) as unknown as RawAppt[];
  const prev = (prevRows ?? []) as unknown as RawApptMin[];

  const kpiCurrent = computeKpis(rows as unknown as RawApptMin[]);
  const kpiPrev = computeKpis(prev);

  // Recurrencia mensual: visitas únicas del mes / pacientes únicos del mes
  const monthActivos = (monthRows ?? []).filter((r: any) =>
    r.estado !== "cancelada" &&
    r.estado !== "no-show" &&
    !esTecnico(r.era_professionals?.nombre ?? "")
  );
  const visitasMesSet = new Set(
    monthActivos.map((r: any) => `${r.paciente_id}:${r.fecha_hora.substring(0, 10)}`)
  );
  const visitasMes = visitasMesSet.size;
  const pacientesUnicosMes = new Set(monthActivos.map((r: any) => r.paciente_id)).size;
  const tasaRecurrencia =
    pacientesUnicosMes > 0 ? Math.round((visitasMes / pacientesUnicosMes) * 10) / 10 : 0;

  const semanaLabel = `${monday.getDate()}–${friday.getDate()} ${MESES[monday.getMonth()]} ${monday.getFullYear()}`;

  // Solo pacientes de primera vez, excluyendo estudios diagnósticos (son múltiples slots del mismo paciente)
  const proximas = rows
    .filter((r) => r.es_primera_vez === true && toVertical(r.vertical_calculada) !== "estudios")
    .map((r) => {
      const nombreRaw = r.era_patients?.nombre_completo ?? "Paciente";
      const esVipPorEmoji = nombreRaw.includes("🧬");
      const nombreLimpio = nombreRaw.replace(/🧬\s*/g, "").trim();
      const vertical = toVertical(r.vertical_calculada);
      return {
        id: r.id,
        fecha_hora: r.fecha_hora,
        paciente: {
          nombre_completo: nombreLimpio,
          es_vip: (r.era_patients?.es_vip ?? false) || esVipPorEmoji,
        },
        profesional: { nombre: r.era_professionals?.nombre ?? "" },
        servicio: SERVICIO_LABEL[vertical],
        vertical,
        es_primera_vez: true,
        motivo_consulta: r.motivo_consulta ?? null,
        observaciones: r.observaciones ?? null,
      };
    });

  const profNames = new Set(
    rows.map((r) => r.era_professionals?.nombre).filter(Boolean)
  );

  return {
    semana_label: semanaLabel,
    total_profesionales: profNames.size,
    ultima_sync: lastSync?.finished_at ?? null,
    kpi: {
      ...kpiCurrent,
      tasa_recurrencia: tasaRecurrencia,
      visitas_mes: visitasMes,
      pacientes_unicos_mes: pacientesUnicosMes,
      vs_semana_anterior: {
        visitas_unicas: kpiPrev.visitas_unicas,
        tasa_asistencia: kpiPrev.tasa_asistencia,
        primera_vez: kpiPrev.primera_vez,
        canceladas: kpiPrev.canceladas,
      },
    },
    distribucion: computeDistribucion(rows as unknown as RawApptMin[]),
    turnos_por_dia: computeTurnosPorDia(rows, monday),
    proximas,
  };
}

// ─── AGENDA ──────────────────────────────────────────────────────────────────

export type AgendaCita = {
  id: string;
  fecha_hora: string;
  paciente: { nombre_completo: string; es_vip: boolean };
  profesional: { nombre: string };
  servicio: string;
  vertical: Vertical;
  es_primera_vez: boolean;
};

export type AgendaData = {
  semana_label: string;
  dias: { label: string; fecha: string }[];
  profesionales: string[];
  citas: AgendaCita[];
};

export async function getAgendaData(): Promise<AgendaData | null> {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data: latest } = await supabase
    .from("era_appointments")
    .select("fecha_hora")
    .order("fecha_hora", { ascending: false })
    .limit(1)
    .single();

  if (!latest) return null;

  const monday = getMonday(new Date(latest.fecha_hora));
  const friday = addDays(monday, 4);
  friday.setHours(23, 59, 59, 999);

  const { data: rows, error } = await supabase
    .from("era_appointments")
    .select(`
      id, paciente_id, fecha_hora, estado, vertical_calculada, es_primera_vez,
      era_professionals!profesional_id(nombre),
      era_patients!paciente_id(nombre_completo, es_vip),
      era_services!servicio_id(nombre)
    `)
    .gte("fecha_hora", monday.toISOString())
    .lte("fecha_hora", friday.toISOString())
    .order("fecha_hora");

  if (error || !rows) return null;

  const semanaLabel = `${monday.getDate()}–${friday.getDate()} ${MESES[monday.getMonth()]} ${monday.getFullYear()}`;

  const DIAS_LABEL = ["Lun", "Mar", "Mié", "Jue", "Vie"];
  const dias = DIAS_LABEL.map((label, i) => {
    const d = addDays(monday, i);
    const dia = String(d.getDate()).padStart(2, "0");
    const mes = String(d.getMonth() + 1).padStart(2, "0");
    return {
      label: `${label} ${d.getDate()}/${d.getMonth() + 1}`,
      fecha: `${d.getFullYear()}-${mes}-${dia}`,
    };
  });

  const citas: AgendaCita[] = (rows as any[])
    .filter((r) => !esTecnico(r.era_professionals?.nombre ?? ""))
    .map((r) => {
      const nombreRaw = r.era_patients?.nombre_completo ?? "Paciente";
      const esVipEmoji = nombreRaw.includes("🧬");
      const nombreLimpio = nombreRaw.replace(/🧬\s*/g, "").trim();
      const vertical = toVertical(r.vertical_calculada);
      return {
        id: r.id,
        fecha_hora: r.fecha_hora,
        paciente: {
          nombre_completo: nombreLimpio,
          es_vip: (r.era_patients?.es_vip ?? false) || esVipEmoji,
        },
        profesional: { nombre: r.era_professionals?.nombre ?? "" },
        servicio: r.era_services?.nombre ?? SERVICIO_LABEL[vertical],
        vertical,
        es_primera_vez: r.es_primera_vez ?? false,
      };
    });

  const profesionales = [
    ...new Set(citas.map((c) => c.profesional.nombre).filter(Boolean)),
  ].sort();

  return { semana_label: semanaLabel, dias, profesionales, citas };
}

// ─── PROFESIONALES ───────────────────────────────────────────────────────────

export type ProfesionalPerf = {
  id: string; // id de la agenda principal del profesional (la de más turnos)
  nombre: string;
  turnos: number;          // total agendado en la semana
  asistidos: number;
  tasa_asistencia: number; // % asistidos / agendado
  ocupacion_pct: number | null; // % minutos agendados / (agendados + libres). null si no hay datos de agenda abierta
  verticales: { vertical: Vertical; cantidad: number; pct: number }[];
};

export type ProfesionalesData = {
  semana_label: string;
  profesionales: ProfesionalPerf[];
};

export async function getProfesionalesData(): Promise<ProfesionalesData | null> {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data: latest } = await supabase
    .from("era_appointments")
    .select("fecha_hora")
    .order("fecha_hora", { ascending: false })
    .limit(1)
    .single();

  if (!latest) return null;

  const monday = getMonday(new Date(latest.fecha_hora));
  const friday = addDays(monday, 4);
  friday.setHours(23, 59, 59, 999);

  const mondayDateOnly = monday.toISOString().split("T")[0];
  const fridayDateOnly = new Date(friday.getTime()).toISOString().split("T")[0];

  const [{ data: rows, error }, { data: openRows }] = await Promise.all([
    supabase
      .from("era_appointments")
      .select(`
        profesional_id, estado, duracion_min, vertical_calculada,
        era_professionals!profesional_id(id, nombre)
      `)
      .gte("fecha_hora", monday.toISOString())
      .lte("fecha_hora", friday.toISOString()),
    supabase
      .from("era_open_minutes")
      .select("profesional_id, minutos_libres")
      .gte("fecha", mondayDateOnly)
      .lte("fecha", fridayDateOnly),
  ]);

  if (error || !rows) return null;

  const semanaLabel = `${monday.getDate()}–${friday.getDate()} ${MESES[monday.getMonth()]} ${monday.getFullYear()}`;

  // Agrupamos por NOMBRE del profesional (un mismo médico puede tener varias agendas en DriCloud)
  type Entry = {
    nombre: string;
    idsAgenda: Map<string, number>; // profesional_id → turnos en esa agenda (para elegir la principal)
    turnos: number;
    asistidos: number;
    minutosAgendados: number;
    verticalesCount: Map<Vertical, number>;
  };
  const byNombre = new Map<string, Entry>();

  for (const r of rows as any[]) {
    const profId = r.profesional_id as string;
    const nombre = r.era_professionals?.nombre as string | undefined;
    if (!profId || !nombre) continue;

    let e = byNombre.get(nombre);
    if (!e) {
      e = {
        nombre,
        idsAgenda: new Map(),
        turnos: 0,
        asistidos: 0,
        minutosAgendados: 0,
        verticalesCount: new Map(),
      };
      byNombre.set(nombre, e);
    }

    e.idsAgenda.set(profId, (e.idsAgenda.get(profId) ?? 0) + 1);
    e.turnos++;
    // "Asistido" = no cancelado ni no-show. DriCloud no marca estado "asistio" explícito,
    // así que tomamos como asistidos a todo lo confirmado que no fue cancelado.
    if (r.estado !== "cancelada" && r.estado !== "no-show") e.asistidos++;
    e.minutosAgendados += (r.duracion_min as number | null) ?? 0;

    const v = toVertical(r.vertical_calculada);
    e.verticalesCount.set(v, (e.verticalesCount.get(v) ?? 0) + 1);
  }

  // Mapeo profesional_id (de cualquier agenda) → nombre del profesional, para sumar minutos libres por nombre.
  const idToNombre = new Map<string, string>();
  for (const [nombre, e] of byNombre.entries()) {
    for (const profId of e.idsAgenda.keys()) idToNombre.set(profId, nombre);
  }

  // Sumar minutos libres por nombre de profesional, y registrar para qué profesionales
  // tenemos al menos un día con datos de agenda abierta (para distinguir "100% ocupado"
  // de "no hay datos sincronizados").
  const minutosLibresPorNombre = new Map<string, number>();
  const nombresConDatosOpen = new Set<string>();
  for (const r of (openRows ?? []) as any[]) {
    const nombre = idToNombre.get(r.profesional_id as string);
    if (!nombre) continue;
    nombresConDatosOpen.add(nombre);
    minutosLibresPorNombre.set(nombre, (minutosLibresPorNombre.get(nombre) ?? 0) + (r.minutos_libres as number));
  }

  const profesionales: ProfesionalPerf[] = [...byNombre.values()]
    .map((e) => {
      // Elegir como id "principal" la agenda con más turnos (para el link a /era/profesionales/[id])
      const idPrincipal = [...e.idsAgenda.entries()].sort((a, b) => b[1] - a[1])[0][0];

      const verticales = [...e.verticalesCount.entries()]
        .map(([vertical, cantidad]) => ({
          vertical,
          cantidad,
          pct: e.turnos > 0 ? Math.round((cantidad / e.turnos) * 100) : 0,
        }))
        .sort((a, b) => b.cantidad - a.cantidad);

      // Ocupación: solo se calcula si tenemos al menos un día con datos en era_open_minutes.
      // Si no, devolvemos null (la tabla muestra "—") para no confundir con "100% ocupado".
      const minutosLibres = minutosLibresPorNombre.get(e.nombre) ?? 0;
      const denom = e.minutosAgendados + minutosLibres;
      const ocupacion_pct = nombresConDatosOpen.has(e.nombre) && denom > 0
        ? Math.round((e.minutosAgendados / denom) * 100)
        : null;

      return {
        id: idPrincipal,
        nombre: e.nombre,
        turnos: e.turnos,
        asistidos: e.asistidos,
        tasa_asistencia: e.turnos > 0 ? Math.round((e.asistidos / e.turnos) * 1000) / 10 : 0,
        ocupacion_pct,
        verticales,
      };
    })
    .sort((a, b) => b.asistidos - a.asistidos);

  return { semana_label: semanaLabel, profesionales };
}

// ─── PROFESIONAL DETAIL ──────────────────────────────────────────────────────

// Tipo más completo que ProfesionalPerf: incluye desglose de PV/VIP/canceladas
// que solo tiene sentido en la vista de detalle individual, no en la tabla agregada.
export type ProfesionalDetailPerf = {
  id: string;
  nombre: string;
  especialidad: string;
  turnos: number;
  asistidos: number;
  cancelados: number;
  no_shows: number;
  primera_vez: number;
  vip: number;
  tasa_asistencia: number;
};

export type ProfesionalDetail = {
  semana_label: string;
  perf: ProfesionalDetailPerf;
  citas: AgendaCita[];
};

export async function getProfesionalDetail(id: string): Promise<ProfesionalDetail | null> {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data: latest } = await supabase
    .from("era_appointments")
    .select("fecha_hora")
    .order("fecha_hora", { ascending: false })
    .limit(1)
    .single();

  if (!latest) return null;

  const monday = getMonday(new Date(latest.fecha_hora));
  const friday = addDays(monday, 4);
  friday.setHours(23, 59, 59, 999);

  const [{ data: profData }, { data: rows, error }] = await Promise.all([
    supabase
      .from("era_professionals")
      .select("id, nombre, especialidad")
      .eq("id", id)
      .single(),
    supabase
      .from("era_appointments")
      .select(`
        id, paciente_id, fecha_hora, estado, vertical_calculada, es_primera_vez,
        era_patients!paciente_id(nombre_completo, es_vip),
        era_services!servicio_id(nombre)
      `)
      .eq("profesional_id", id)
      .gte("fecha_hora", monday.toISOString())
      .lte("fecha_hora", friday.toISOString())
      .order("fecha_hora"),
  ]);

  if (!profData || error || !rows) return null;

  const semanaLabel = `${monday.getDate()}–${friday.getDate()} ${MESES[monday.getMonth()]} ${monday.getFullYear()}`;

  let turnos = 0, asistidos = 0, cancelados = 0, no_shows = 0, primera_vez = 0;
  const vip_ids = new Set<string>();

  const citas: AgendaCita[] = (rows as any[]).map((r) => {
    const nombreRaw = r.era_patients?.nombre_completo ?? "Paciente";
    const esVipEmoji = nombreRaw.includes("🧬");
    const nombreLimpio = nombreRaw.replace(/🧬\s*/g, "").trim();
    const vertical = toVertical(r.vertical_calculada);

    turnos++;
    if (r.estado === "asistio") asistidos++;
    else if (r.estado === "cancelada") cancelados++;
    else if (r.estado === "no-show") no_shows++;
    if (r.es_primera_vez) primera_vez++;
    if ((r.era_patients?.es_vip || esVipEmoji) && r.paciente_id) vip_ids.add(r.paciente_id);

    return {
      id: r.id,
      fecha_hora: r.fecha_hora,
      paciente: {
        nombre_completo: nombreLimpio,
        es_vip: (r.era_patients?.es_vip ?? false) || esVipEmoji,
      },
      profesional: { nombre: profData.nombre },
      servicio: r.era_services?.nombre ?? SERVICIO_LABEL[vertical],
      vertical,
      es_primera_vez: r.es_primera_vez ?? false,
    };
  });

  return {
    semana_label: semanaLabel,
    perf: {
      id: profData.id,
      nombre: profData.nombre,
      especialidad: profData.especialidad ?? "",
      turnos, asistidos, cancelados, no_shows, primera_vez,
      vip: vip_ids.size,
      tasa_asistencia: turnos > 0 ? Math.round((asistidos / turnos) * 1000) / 10 : 0,
    },
    citas,
  };
}

// ─── EMBUDOS ─────────────────────────────────────────────────────────────────

export type HoraCount = { hora: string; cantidad: number };
export type DiaEmbudos = {
  dia: string;
  fecha: string;
  horas: HoraCount[];
  franja_pico: { desde: string; hasta: string; total: number };
  total_dia: number;
};
export type EmbudosData = {
  semana_label: string;
  dias: DiaEmbudos[];
};

const DIAS_EMB = ["Lun", "Mar", "Mié", "Jue", "Vie"];

export async function getEmbudosData(): Promise<EmbudosData | null> {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data: latest } = await supabase
    .from("era_appointments")
    .select("fecha_hora")
    .order("fecha_hora", { ascending: false })
    .limit(1)
    .single();

  if (!latest) return null;

  const monday = getMonday(new Date(latest.fecha_hora));
  const friday = addDays(monday, 4);
  friday.setHours(23, 59, 59, 999);

  const { data: rows, error } = await supabase
    .from("era_appointments")
    .select("paciente_id, fecha_hora, estado, era_professionals!profesional_id(nombre)")
    .gte("fecha_hora", monday.toISOString())
    .lte("fecha_hora", friday.toISOString());

  if (error || !rows) return null;

  const semanaLabel = `${monday.getDate()}–${friday.getDate()} ${MESES[monday.getMonth()]} ${monday.getFullYear()}`;

  // Activos = no cancelados, sin técnicos de sueroterapia
  const activos = (rows as any[]).filter((r) =>
    r.estado !== "cancelada" && !esTecnico(r.era_professionals?.nombre ?? "")
  );

  // Agrupar por fecha → hora → set de paciente_id (pacientes únicos por hora)
  const byDayHour = new Map<string, Map<number, Set<string>>>();
  for (const r of activos) {
    const dateStr = r.fecha_hora.substring(0, 10);
    const hour = parseInt(r.fecha_hora.substring(11, 13));
    if (!byDayHour.has(dateStr)) byDayHour.set(dateStr, new Map());
    const hm = byDayHour.get(dateStr)!;
    if (!hm.has(hour)) hm.set(hour, new Set());
    hm.get(hour)!.add(r.paciente_id);
  }

  const dias: DiaEmbudos[] = DIAS_EMB.map((dia, i) => {
    const fecha = addDays(monday, i);
    const fechaStr = `${fecha.getDate()}/${fecha.getMonth() + 1}`;
    const dateKey = `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, "0")}-${String(fecha.getDate()).padStart(2, "0")}`;
    const hourMap = byDayHour.get(dateKey) ?? new Map<number, Set<string>>();

    // Horas del día con actividad (mínimo 8 a 20)
    const minH = Math.min(8, ...[...hourMap.keys()]);
    const maxH = Math.max(20, ...[...hourMap.keys()]);
    const horas: HoraCount[] = Array.from({ length: maxH - minH + 1 }, (_, idx) => {
      const h = minH + idx;
      return { hora: `${String(h).padStart(2, "0")}:00`, cantidad: hourMap.get(h)?.size ?? 0 };
    });

    // Ventana deslizante de 3 horas → máximo de pacientes únicos en esa franja
    let bestStart = minH, bestTotal = 0;
    for (let start = minH; start <= maxH - 2; start++) {
      const window = new Set<string>();
      for (let h = start; h < start + 3; h++) hourMap.get(h)?.forEach((id) => window.add(id));
      if (window.size > bestTotal) { bestTotal = window.size; bestStart = start; }
    }

    // Total de pacientes únicos del día
    const dayPatients = new Set(activos
      .filter((r) => r.fecha_hora.substring(0, 10) === dateKey)
      .map((r) => r.paciente_id)
    );

    return {
      dia,
      fecha: fechaStr,
      horas,
      franja_pico: {
        desde: `${String(bestStart).padStart(2, "0")}:00`,
        hasta: `${String(bestStart + 3).padStart(2, "0")}:00`,
        total: bestTotal,
      },
      total_dia: dayPatients.size,
    };
  });

  return { semana_label: semanaLabel, dias };
}
