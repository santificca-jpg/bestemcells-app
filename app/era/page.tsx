import { getDashboardData } from "@/lib/era/dashboard-data";
import KpiCard from "@/components/era/KpiCard";
import { VERTICAL_META } from "@/lib/era/verticals";
import VerticalBadge from "@/components/era/VerticalBadge";
import DashboardCharts from "@/components/era/DashboardCharts";
import type { Vertical } from "@/lib/era/types";

export const revalidate = 300; // refrescar datos cada 5 minutos

export default async function EraOverview() {
  const data = await getDashboardData();

  if (!data) {
    return (
      <div className="p-6 text-center text-red-500 font-semibold">
        No se pudieron cargar los datos. Verificá la conexión con Supabase.
      </div>
    );
  }

  const { kpi, distribucion, turnos_por_dia, proximas, semana_label, total_profesionales } = data;
  const vs = kpi.vs_semana_anterior;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div
        className="rounded-xl px-6 py-5 flex justify-between items-center text-white"
        style={{ background: "linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)" }}
      >
        <div>
          <h1 className="text-xl font-black">Dashboard ERA Longevity</h1>
          <p className="text-white/60 text-sm mt-0.5">
            {semana_label} · {total_profesionales} profesionales
          </p>
        </div>
        <div className="bg-white/15 border border-white/30 rounded-full px-4 py-2 text-sm font-semibold">
          {semana_label}
        </div>
      </div>

      {/* KPIs */}
      <section>
        <h2 className="text-xs font-bold uppercase tracking-wide border-l-4 pl-3 mb-3" style={{ borderColor: "#0f3460", color: "#1a1a2e" }}>
          Resumen de la semana
        </h2>
        <div className="grid grid-cols-7 gap-3">
          <KpiCard
            valor={kpi.visitas_unicas}
            label="Visitas únicas"
            sub={`vs ${vs.visitas_unicas} sem. ant.`}
            delta={kpi.visitas_unicas - vs.visitas_unicas}
            color="#0f3460"
          />
          <KpiCard
            valor={`${kpi.tasa_asistencia}%`}
            label="Tasa asistencia"
            sub={`${vs.tasa_asistencia}% sem. ant.`}
            delta={parseFloat((kpi.tasa_asistencia - vs.tasa_asistencia).toFixed(1))}
            color="#27ae60"
          />
          <KpiCard
            valor={`${kpi.primera_vez} 🆕`}
            label="Primera vez"
            sub={`vs ${vs.primera_vez} sem. ant.`}
            delta={kpi.primera_vez - vs.primera_vez}
            color="#1967d2"
          />
          <KpiCard
            valor={`${kpi.vip} 🧬`}
            label="Pacientes VIP"
            sub={`vs ${vs.vip} sem. ant.`}
            delta={kpi.vip - vs.vip}
            color="#f39c12"
          />
          <KpiCard
            valor={kpi.canceladas}
            label="Cancelados"
            sub={`vs ${vs.canceladas} sem. ant.`}
            delta={-(kpi.canceladas - vs.canceladas)}
            color="#e74c3c"
          />
          <KpiCard
            valor={`${kpi.tasa_pv}%`}
            label="% Primera vez"
            sub={`${kpi.primera_vez} PV / ${kpi.visitas_unicas} visitas`}
            color="#7c3aed"
          />
          <KpiCard
            valor={`${kpi.tasa_recurrencia}%`}
            label="Tasa recurrencia"
            sub={`${kpi.recurrentes} de ${kpi.visitas_unicas} pacientes`}
            color="#0891b2"
          />
        </div>
      </section>

      {/* Verticales */}
      <section>
        <h2 className="text-xs font-bold uppercase tracking-wide border-l-4 pl-3 mb-3" style={{ borderColor: "#0f3460", color: "#1a1a2e" }}>
          Distribución por vertical
        </h2>
        <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${distribucion.length}, 1fr)` }}>
          {distribucion.map(({ vertical, cantidad, porcentaje }) => {
            const meta = VERTICAL_META[vertical] ?? VERTICAL_META["longevidad"];
            return (
              <div
                key={vertical}
                className="rounded-lg p-3 text-center border-t-4"
                style={{ background: meta.bg, borderColor: meta.color }}
              >
                <div className="text-xs font-bold uppercase tracking-wide mb-1" style={{ color: meta.color }}>
                  {meta.emoji} {meta.label}
                </div>
                <div className="text-2xl font-black leading-none" style={{ color: meta.color }}>
                  {cantidad}
                </div>
                <div className="text-xs mt-1 opacity-80" style={{ color: meta.color }}>
                  {porcentaje}%
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Gráficos (cliente) */}
      <DashboardCharts turnos_por_dia={turnos_por_dia} distribucion={distribucion} />

      {/* Primeras citas de la semana */}
      <section>
        <h2 className="text-xs font-bold uppercase tracking-wide border-l-4 pl-3 mb-3" style={{ borderColor: "#0f3460", color: "#1a1a2e" }}>
          Primeras citas de la semana
        </h2>
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          {proximas.length === 0 ? (
            <div className="px-4 py-6 text-sm text-gray-400 text-center">Sin citas registradas</div>
          ) : proximas.map((c) => {
            const meta = VERTICAL_META[c.vertical] ?? VERTICAL_META["longevidad"];
            const dt = new Date(c.fecha_hora);
            const hora = `${String(dt.getUTCHours()).padStart(2, "0")}:${String(dt.getUTCMinutes()).padStart(2, "0")}`;
            const dia = String(dt.getUTCDate()).padStart(2, "0");
            const mes = String(dt.getUTCMonth() + 1).padStart(2, "0");
            return (
              <div
                key={c.id}
                className="flex items-center gap-3 px-4 py-2.5 border-b border-gray-100 last:border-0 hover:bg-gray-50 transition-colors"
                style={{ borderLeft: `3px solid ${meta.color}` }}
              >
                <div className="text-xs font-bold text-gray-400 w-16 shrink-0">
                  {dia}/{mes} {hora}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold text-gray-800 truncate">
                    {c.paciente.nombre_completo}
                    {c.paciente.es_vip && <span className="ml-1">🧬</span>}
                  </div>
                  <div className="text-xs text-gray-400 truncate">{c.servicio}</div>
                </div>
                <div className="text-xs text-gray-400 italic shrink-0">{c.profesional.nombre}</div>
                <div className="flex gap-1 shrink-0">
                  {c.es_primera_vez && (
                    <span className="text-xs font-bold px-1.5 py-0.5 rounded bg-blue-100 text-blue-700">PV</span>
                  )}
                  <VerticalBadge vertical={c.vertical as Vertical} />
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Comparativo */}
      <section>
        <h2 className="text-xs font-bold uppercase tracking-wide border-l-4 pl-3 mb-3" style={{ borderColor: "#0f3460", color: "#1a1a2e" }}>
          Comparativo semana actual vs anterior
        </h2>
        <div className="bg-white rounded-xl shadow-sm p-4">
          <div className="grid grid-cols-4 gap-4 pb-2 mb-2 border-b-2 border-gray-200 text-xs font-bold text-gray-400 uppercase">
            <span>Métrica</span>
            <span className="text-center">Sem. anterior</span>
            <span className="text-center">Sem. actual</span>
            <span className="text-right">Δ</span>
          </div>
          {[
            { label: "Visitas únicas", s1: vs.visitas_unicas, s2: kpi.visitas_unicas, pos: true },
            { label: "Tasa asistencia", s1: `${vs.tasa_asistencia}%`, s2: `${kpi.tasa_asistencia}%`, pos: true },
            { label: "Primera vez", s1: vs.primera_vez, s2: kpi.primera_vez, pos: true },
            { label: "VIP", s1: vs.vip, s2: kpi.vip, pos: true },
            { label: "Cancelados", s1: vs.canceladas, s2: kpi.canceladas, pos: false },
          ].map(({ label, s1, s2, pos }) => {
            const n1 = typeof s1 === "string" ? parseFloat(s1) : s1;
            const n2 = typeof s2 === "string" ? parseFloat(s2) : s2;
            const diff = n2 - n1;
            const good = pos ? diff >= 0 : diff <= 0;
            return (
              <div key={label} className="grid grid-cols-4 gap-4 py-2 border-b border-gray-100 last:border-0 text-sm items-center">
                <span className="text-gray-600">{label}</span>
                <span className="text-center font-semibold">{s1}</span>
                <span className="text-center font-semibold">{s2}</span>
                <span className={`text-right text-xs font-bold ${diff === 0 ? "text-gray-400" : good ? "text-green-600" : "text-red-500"}`}>
                  {diff > 0 ? `▲ +${diff.toFixed(1).replace(".0", "")}` : diff < 0 ? `▼ ${diff.toFixed(1).replace(".0", "")}` : "—"}
                </span>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
