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
  era_professionals: { nombre: string } | null;
  era_patients: { nombre_completo: string; es_vip: boolean; primera_visita_fecha: string | null } | null;
};

type RawApptMin = {
  paciente_id: string;
  fecha_hora: string;
  estado: string;
  vertical_calculada: string | null;
  era_patients: { es_vip: boolean; nombre_completo: string; primera_visita_fecha: string | null } | null;
  era_professionals: { nombre: string } | null;
};

// Excluidos de "primera vez" (derivaciones internas)
const EXCLUIR_PV = ["camilli", "cornejo", "hiese"] as const;

// Técnicas de sueroterapia: no cuentan como visitas médicas
const EXCLUIR_TECNICOS = ["fedoto", "tucker", "montero"] as const;

function esProfExcluido(nombre: string): boolean {
  const lower = nombre.toLowerCase();
  return EXCLUIR_PV.some((e) => lower.includes(e));
}

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

  // Primera vez: fecha del turno coincide con la primera visita del paciente,
  // excluyendo turnos de Camilli, Cornejo y Hiese (derivaciones internas)
  const primeraVezPatients = new Set(
    activos
      .filter((r) => {
        const apptDate = r.fecha_hora.substring(0, 10);
        const pvFecha = r.era_patients?.primera_visita_fecha;
        const profNombre = r.era_professionals?.nombre ?? "";
        return pvFecha === apptDate && !esProfExcluido(profNombre);
      })
      .map((r) => r.paciente_id)
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
  kpi: {
    visitas_unicas: number;
    tasa_asistencia: number;
    primera_vez: number;
    vip: number;
    canceladas: number;
    no_shows: number;
    tasa_pv: number;
    tasa_recurrencia: number;
    recurrentes: number;
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
      id, paciente_id, fecha_hora, duracion_min, estado, vertical_calculada,
      era_professionals!profesional_id(nombre),
      era_patients!paciente_id(nombre_completo, es_vip, primera_visita_fecha)
    `)
    .gte("fecha_hora", monday.toISOString())
    .lte("fecha_hora", friday.toISOString())
    .order("fecha_hora");

  if (error) return null;

  const { data: prevRows } = await supabase
    .from("era_appointments")
    .select(`
      paciente_id, fecha_hora, estado, vertical_calculada,
      era_patients!paciente_id(es_vip, nombre_completo, primera_visita_fecha),
      era_professionals!profesional_id(nombre)
    `)
    .gte("fecha_hora", prevMonday.toISOString())
    .lte("fecha_hora", prevFriday.toISOString());

  // Pacientes activos en las 4 semanas previas a la semana actual (para tasa de recurrencia)
  const fourWeeksAgo = addDays(monday, -28);
  const { data: prior4Rows } = await supabase
    .from("era_appointments")
    .select("paciente_id, estado")
    .gte("fecha_hora", fourWeeksAgo.toISOString())
    .lt("fecha_hora", monday.toISOString());

  const rows = (currentRows ?? []) as unknown as RawAppt[];
  const prev = (prevRows ?? []) as unknown as RawApptMin[];

  const kpiCurrent = computeKpis(rows as unknown as RawApptMin[]);
  const kpiPrev = computeKpis(prev);

  // Tasa de recurrencia: pacientes de esta semana que también vinieron en las 4 semanas anteriores
  const prior4PatientIds = new Set(
    (prior4Rows ?? [])
      .filter((r: { estado: string }) => r.estado !== "cancelada" && r.estado !== "no-show")
      .map((r: { paciente_id: string }) => r.paciente_id)
  );
  const activosCurrent = (rows as unknown as RawApptMin[]).filter(
    (r) => r.estado !== "cancelada" && r.estado !== "no-show"
  );
  const uniquePatientsCurrent = new Set(activosCurrent.map((r) => r.paciente_id));
  const recurrenteCount = [...uniquePatientsCurrent].filter((id) => prior4PatientIds.has(id)).length;
  const tasaRecurrencia =
    uniquePatientsCurrent.size > 0
      ? Math.round((recurrenteCount / uniquePatientsCurrent.size) * 1000) / 10
      : 0;

  const semanaLabel = `${monday.getDate()}–${friday.getDate()} ${MESES[monday.getMonth()]} ${monday.getFullYear()}`;

  const proximas = rows.slice(0, 8).map((r) => {
    const nombreRaw = r.era_patients?.nombre_completo ?? "Paciente";
    const esVipPorEmoji = nombreRaw.includes("🧬");
    const nombreLimpio = nombreRaw.replace(/🧬\s*/g, "").trim();
    const vertical = toVertical(r.vertical_calculada);
    const apptDate = r.fecha_hora.substring(0, 10);
    const profNombre = r.era_professionals?.nombre ?? "";
    const esPrimeraVez =
      r.era_patients?.primera_visita_fecha === apptDate && !esProfExcluido(profNombre);
    return {
      id: r.id,
      fecha_hora: r.fecha_hora,
      paciente: {
        nombre_completo: nombreLimpio,
        es_vip: (r.era_patients?.es_vip ?? false) || esVipPorEmoji,
      },
      profesional: { nombre: profNombre },
      servicio: SERVICIO_LABEL[vertical],
      vertical,
      es_primera_vez: esPrimeraVez,
    };
  });

  const profNames = new Set(
    rows.map((r) => r.era_professionals?.nombre).filter(Boolean)
  );

  return {
    semana_label: semanaLabel,
    total_profesionales: profNames.size,
    kpi: {
      ...kpiCurrent,
      tasa_recurrencia: tasaRecurrencia,
      recurrentes: recurrenteCount,
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

  const citas: AgendaCita[] = (rows as any[]).map((r) => {
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

  const { data: rows, error } = await supabase
    .from("era_appointments")
    .select(`
      profesional_id, paciente_id, estado, es_primera_vez,
      era_professionals!profesional_id(id, nombre, especialidad),
      era_patients!paciente_id(es_vip)
    `)
    .gte("fecha_hora", monday.toISOString())
    .lte("fecha_hora", friday.toISOString());

  if (error || !rows) return null;

  const semanaLabel = `${monday.getDate()}–${friday.getDate()} ${MESES[monday.getMonth()]} ${monday.getFullYear()}`;

  type Entry = {
    prof: { id: string; nombre: string; especialidad: string };
    turnos: number; asistidos: number; cancelados: number; no_shows: number;
    primera_vez: number; vip_ids: Set<string>;
  };
  const byProf = new Map<string, Entry>();

  for (const r of rows as any[]) {
    const profId = r.profesional_id as string;
    if (!profId || !r.era_professionals) continue;

    if (!byProf.has(profId)) {
      byProf.set(profId, {
        prof: {
          id: r.era_professionals.id ?? profId,
          nombre: r.era_professionals.nombre ?? "",
          especialidad: r.era_professionals.especialidad ?? "",
        },
        turnos: 0, asistidos: 0, cancelados: 0, no_shows: 0,
        primera_vez: 0, vip_ids: new Set(),
      });
    }

    const e = byProf.get(profId)!;
    e.turnos++;
    if (r.estado === "asistio") e.asistidos++;
    else if (r.estado === "cancelada") e.cancelados++;
    else if (r.estado === "no-show") e.no_shows++;
    if (r.es_primera_vez) e.primera_vez++;
    if (r.era_patients?.es_vip && r.paciente_id) e.vip_ids.add(r.paciente_id as string);
  }

  const profesionales: ProfesionalPerf[] = [...byProf.values()]
    .map(({ prof, turnos, asistidos, cancelados, no_shows, primera_vez, vip_ids }) => ({
      id: prof.id,
      nombre: prof.nombre,
      especialidad: prof.especialidad,
      turnos,
      asistidos,
      cancelados,
      no_shows,
      primera_vez,
      vip: vip_ids.size,
      tasa_asistencia: turnos > 0 ? Math.round((asistidos / turnos) * 1000) / 10 : 0,
    }))
    .sort((a, b) => b.turnos - a.turnos);

  return { semana_label: semanaLabel, profesionales };
}

// ─── PROFESIONAL DETAIL ──────────────────────────────────────────────────────

export type ProfesionalDetail = {
  semana_label: string;
  perf: ProfesionalPerf;
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

export type EmbudoHorario = {
  hora: string;
  lunes: number;
  martes: number;
  miercoles: number;
  jueves: number;
  viernes: number;
  total: number;
};

export type EmbudosData = {
  semana_label: string;
  embudos: EmbudoHorario[];
};

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
    .select("fecha_hora, estado")
    .gte("fecha_hora", monday.toISOString())
    .lte("fecha_hora", friday.toISOString());

  if (error || !rows) return null;

  const semanaLabel = `${monday.getDate()}–${friday.getDate()} ${MESES[monday.getMonth()]} ${monday.getFullYear()}`;

  type Slot = { lunes: number; martes: number; miercoles: number; jueves: number; viernes: number };
  const slotMap = new Map<string, Slot>();

  for (const r of rows as { fecha_hora: string; estado: string }[]) {
    if (r.estado === "cancelada") continue;
    const h = parseInt(r.fecha_hora.substring(11, 13));
    const m = parseInt(r.fecha_hora.substring(14, 16));
    const hora = `${String(h).padStart(2, "0")}:${m < 30 ? "00" : "30"}`;

    const dateStr = r.fecha_hora.substring(0, 10);
    const dow = new Date(dateStr + "T12:00:00Z").getUTCDay();
    if (dow < 1 || dow > 5) continue;

    if (!slotMap.has(hora)) {
      slotMap.set(hora, { lunes: 0, martes: 0, miercoles: 0, jueves: 0, viernes: 0 });
    }
    const keys = ["lunes", "martes", "miercoles", "jueves", "viernes"] as const;
    slotMap.get(hora)![keys[dow - 1]]++;
  }

  if (slotMap.size === 0) return { semana_label: semanaLabel, embudos: [] };

  const sortedHoras = [...slotMap.keys()].sort();
  const allHoras: string[] = [];
  let curH = parseInt(sortedHoras[0].substring(0, 2));
  let curM = parseInt(sortedHoras[0].substring(3, 5));
  const endH = parseInt(sortedHoras[sortedHoras.length - 1].substring(0, 2));
  const endM = parseInt(sortedHoras[sortedHoras.length - 1].substring(3, 5));

  while (curH < endH || (curH === endH && curM <= endM)) {
    allHoras.push(`${String(curH).padStart(2, "0")}:${curM === 0 ? "00" : "30"}`);
    if (curM === 0) curM = 30;
    else { curM = 0; curH++; }
  }

  const embudos: EmbudoHorario[] = allHoras.map((hora) => {
    const s = slotMap.get(hora) ?? { lunes: 0, martes: 0, miercoles: 0, jueves: 0, viernes: 0 };
    return { hora, ...s, total: s.lunes + s.martes + s.miercoles + s.jueves + s.viernes };
  });

  return { semana_label: semanaLabel, embudos };
}
