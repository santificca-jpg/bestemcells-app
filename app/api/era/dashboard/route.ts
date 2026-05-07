import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import type { Vertical } from "@/lib/era/types";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

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
      vertical,
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

export async function GET() {
  // 1. Find the most recent appointment date
  const { data: latest, error: latestErr } = await supabase
    .from("era_appointments")
    .select("fecha_hora")
    .order("fecha_hora", { ascending: false })
    .limit(1)
    .single();

  if (latestErr || !latest) {
    return NextResponse.json({ error: "Sin datos en Supabase" }, { status: 404 });
  }

  // 2. Calculate current and previous week ranges
  const monday = getMonday(new Date(latest.fecha_hora));
  const friday = addDays(monday, 4);
  friday.setHours(23, 59, 59, 999);

  const prevMonday = addDays(monday, -7);
  const prevFriday = addDays(prevMonday, 4);
  prevFriday.setHours(23, 59, 59, 999);

  // 3. Fetch current week appointments with patient and professional data
  const { data: currentRows, error: currErr } = await supabase
    .from("era_appointments")
    .select(`
      id, paciente_id, fecha_hora, duracion_min, estado, vertical_calculada, es_primera_vez,
      era_professionals!profesional_id(nombre),
      era_patients!paciente_id(nombre_completo, es_vip)
    `)
    .gte("fecha_hora", monday.toISOString())
    .lte("fecha_hora", friday.toISOString())
    .order("fecha_hora");

  if (currErr) {
    return NextResponse.json({ error: currErr.message }, { status: 500 });
  }

  // 4. Fetch previous week (minimal fields for comparison)
  const { data: prevRows } = await supabase
    .from("era_appointments")
    .select(`
      paciente_id, fecha_hora, estado, vertical_calculada, es_primera_vez,
      era_patients!paciente_id(es_vip)
    `)
    .gte("fecha_hora", prevMonday.toISOString())
    .lte("fecha_hora", prevFriday.toISOString());

  const rows = (currentRows || []) as unknown as RawAppt[];
  const prev = (prevRows || []) as unknown as RawApptMin[];

  // 5. Compute KPIs
  const kpiCurrent = computeKpis(rows as unknown as RawApptMin[]);
  const kpiPrev = computeKpis(prev);

  // 6. Week label for header
  const semanaLabel = `${monday.getDate()}–${friday.getDate()} ${MESES[monday.getMonth()]} ${monday.getFullYear()}`;

  // 7. Upcoming / recent appointments (first 8 of the week)
  const proximas = rows.slice(0, 8).map((r) => {
    const nombreRaw = r.era_patients?.nombre_completo ?? "Paciente";
    // DriCloud incluye 🧬 en el nombre para marcar pacientes VIP
    const esVipPorEmoji = nombreRaw.includes("🧬");
    const nombreLimpio = nombreRaw.replace(/🧬\s*/g, "").trim();
    return {
    id: r.id,
    fecha_hora: r.fecha_hora,
    paciente: {
      nombre_completo: nombreLimpio,
      es_vip: (r.era_patients?.es_vip ?? false) || esVipPorEmoji,
    },
    profesional: {
      nombre: r.era_professionals?.nombre ?? "",
    },
    servicio: toVertical(r.vertical_calculada)
      .replace("longevidad", "Longevidad")
      .replace("dolor", "Dolor / Regenerativa")
      .replace("sueroterapia", "Sueroterapia")
      .replace("estudios", "Estudios diagnósticos")
      .replace("nutricion", "Nutrición")
      .replace("kinesiologia", "Kinesiología")
      .replace("estetica", "Estética"),
    vertical: toVertical(r.vertical_calculada),
    es_primera_vez: r.es_primera_vez ?? false,
  };
  });

  // 8. Total professionals with appointments this week
  const profNames = new Set(
    rows.map((r) => r.era_professionals?.nombre).filter(Boolean)
  );

  return NextResponse.json({
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
  });
}
