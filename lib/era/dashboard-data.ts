import { createClient } from "@supabase/supabase-js";
import type { Vertical } from "./types";

const VALID_VERTICALS = new Set<string>([
  "longevidad", "dolor", "sueroterapia", "estudios",
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
  es_primera_vez: boolean;
  era_professionals: { nombre: string } | null;
  era_patients: { nombre_completo: string; es_vip: boolean } | null;
};

type RawApptMin = {
  paciente_id: string;
  estado: string;
  vertical_calculada: string | null;
  es_primera_vez: boolean;
  era_patients: { es_vip: boolean } | null;
};

function computeKpis(rows: RawApptMin[]) {
  const total = rows.length;
  const canceladas = rows.filter((r) => r.estado === "cancelada").length;
  const noShows = rows.filter((r) => r.estado === "no-show").length;
  const activos = rows.filter((r) => r.estado !== "cancelada" && r.estado !== "no-show");

  const uniquePatients = new Set(activos.map((r) => r.paciente_id));
  const vipPatients = new Set(
    activos.filter((r) => r.era_patients?.es_vip).map((r) => r.paciente_id)
  );
  const primeraVez = activos.filter((r) => r.es_primera_vez).length;

  const visitas = uniquePatients.size;
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

function computeDistribucion(rows: RawApptMin[]) {
  const activos = rows.filter((r) => r.estado !== "cancelada" && r.estado !== "no-show");
  const totales: Record<string, number> = {};
  for (const r of activos) {
    const v = toVertical(r.vertical_calculada);
    totales[v] = (totales[v] || 0) + 1;
  }
  const total = activos.length || 1;
  return Object.entries(totales)
    .sort((a, b) => b[1] - a[1])
    .map(([vertical, cantidad]) => ({
      vertical: vertical as Vertical,
      cantidad,
      porcentaje: Math.round((cantidad / total) * 1000) / 10,
    }));
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
    vs_semana_anterior: {
      visitas_unicas: number;
      tasa_asistencia: number;
      primera_vez: number;
      vip: number;
      canceladas: number;
    };
  };
  distribucion: { vertical: Vertical; cantidad: number; porcentaje: number }[];
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
  longevidad:   "Longevidad",
  dolor:        "Dolor / Regenerativa",
  sueroterapia: "Sueroterapia",
  estudios:     "Estudios diagnósticos",
  nutricion:    "Nutrición",
  kinesiologia: "Kinesiología",
  estetica:     "Estética",
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
      id, paciente_id, fecha_hora, duracion_min, estado, vertical_calculada, es_primera_vez,
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
      paciente_id, estado, vertical_calculada, es_primera_vez,
      era_patients!paciente_id(es_vip)
    `)
    .gte("fecha_hora", prevMonday.toISOString())
    .lte("fecha_hora", prevFriday.toISOString());

  const rows = (currentRows ?? []) as unknown as RawAppt[];
  const prev = (prevRows ?? []) as unknown as RawApptMin[];

  const kpiCurrent = computeKpis(rows as unknown as RawApptMin[]);
  const kpiPrev = computeKpis(prev);

  const semanaLabel = `${monday.getDate()}–${friday.getDate()} ${MESES[monday.getMonth()]} ${monday.getFullYear()}`;

  const proximas = rows.slice(0, 8).map((r) => {
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
      es_primera_vez: r.es_primera_vez ?? false,
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
      vs_semana_anterior: {
        visitas_unicas: kpiPrev.visitas_unicas,
        tasa_asistencia: kpiPrev.tasa_asistencia,
        primera_vez: kpiPrev.primera_vez,
        vip: kpiPrev.vip,
        canceladas: kpiPrev.canceladas,
      },
    },
    distribucion: computeDistribucion(rows as unknown as RawApptMin[]),
    turnos_por_dia: computeTurnosPorDia(rows, monday),
    proximas,
  };
}
