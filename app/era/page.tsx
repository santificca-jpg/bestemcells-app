"use client";

import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from "recharts";
import KpiCard from "@/components/era/KpiCard";
import {
  KPI_SEMANA,
  DISTRIBUCION_VERTICALES,
  TURNOS_POR_DIA,
  CITAS_SEMANA,
} from "@/lib/era/mock-data";
import { VERTICAL_META } from "@/lib/era/verticals";
import VerticalBadge from "@/components/era/VerticalBadge";

const vs = KPI_SEMANA.vs_semana_anterior;

const PROXIMAS = CITAS_SEMANA.filter(
  (c) => c.fecha_hora >= "2026-04-15T00:00"
).slice(0, 8);

export default function EraOverview() {
  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div
        className="rounded-xl px-6 py-5 flex justify-between items-center text-white"
        style={{ background: "linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)" }}
      >
        <div>
          <h1 className="text-xl font-black">Dashboard ERA Longevity</h1>
          <p className="text-white/60 text-sm mt-0.5">Semana 13–17 Abril 2026 · 11 profesionales</p>
        </div>
        <div className="bg-white/15 border border-white/30 rounded-full px-4 py-2 text-sm font-semibold">
          Semana 2 · Abril 2026
        </div>
      </div>

      {/* KPIs */}
      <section>
        <h2 className="text-xs font-bold text-navy-900 uppercase tracking-wide border-l-4 border-navy-700 pl-3 mb-3" style={{ borderColor: "#0f3460", color: "#1a1a2e" }}>
          Resumen de la semana
        </h2>
        <div className="grid grid-cols-6 gap-3">
          <KpiCard
            valor={KPI_SEMANA.visitas_unicas}
            label="Visitas únicas"
            sub={`vs ${vs.visitas_unicas} sem. ant.`}
            delta={KPI_SEMANA.visitas_unicas - vs.visitas_unicas}
            color="#0f3460"
          />
          <KpiCard
            valor={`${KPI_SEMANA.tasa_asistencia}%`}
            label="Tasa asistencia"
            sub={`${vs.tasa_asistencia}% sem. ant.`}
            delta={parseFloat((KPI_SEMANA.tasa_asistencia - vs.tasa_asistencia).toFixed(1))}
            color="#27ae60"
          />
          <KpiCard
            valor={`${KPI_SEMANA.primera_vez} 🆕`}
            label="Primera vez"
            sub={`vs ${vs.primera_vez} sem. ant.`}
            delta={KPI_SEMANA.primera_vez - vs.primera_vez}
            color="#1967d2"
          />
          <KpiCard
            valor={`${KPI_SEMANA.vip} 🧬`}
            label="Pacientes VIP"
            sub={`vs ${vs.vip} sem. ant.`}
            delta={KPI_SEMANA.vip - vs.vip}
            color="#f39c12"
          />
          <KpiCard
            valor={KPI_SEMANA.canceladas}
            label="Cancelados"
            sub={`vs ${vs.canceladas} sem. ant.`}
            delta={-(KPI_SEMANA.canceladas - vs.canceladas)}
            color="#e74c3c"
          />
          <KpiCard
            valor={`${KPI_SEMANA.tasa_pv}%`}
            label="% Primera vez"
            sub={`${KPI_SEMANA.primera_vez} PV / ${KPI_SEMANA.visitas_unicas} visitas`}
            color="#7c3aed"
          />
        </div>
      </section>

      {/* Verticales */}
      <section>
        <h2 className="text-xs font-bold uppercase tracking-wide border-l-4 pl-3 mb-3" style={{ borderColor: "#0f3460", color: "#1a1a2e" }}>
          Distribución por vertical
        </h2>
        <div className="grid grid-cols-7 gap-2">
          {DISTRIBUCION_VERTICALES.map(({ vertical, cantidad, porcentaje }) => {
            const meta = VERTICAL_META[vertical];
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

      {/* Gráficos */}
      <div className="grid grid-cols-3 gap-4">
        {/* Turnos por día */}
        <div className="col-span-2 bg-white rounded-xl p-4 shadow-sm">
          <div className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3">
            📅 Turnos por día
          </div>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={TURNOS_POR_DIA}>
              <XAxis dataKey="dia" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip formatter={(v) => [`${v} turnos`]} />
              <Bar dataKey="cantidad" fill="#0f3460" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Donut verticales */}
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <div className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3">
            🏷 Verticales
          </div>
          <ResponsiveContainer width="100%" height={180}>
            <PieChart>
              <Pie
                data={DISTRIBUCION_VERTICALES}
                dataKey="cantidad"
                nameKey="vertical"
                cx="50%"
                cy="50%"
                innerRadius={45}
                outerRadius={70}
              >
                {DISTRIBUCION_VERTICALES.map(({ vertical }) => (
                  <Cell key={vertical} fill={VERTICAL_META[vertical].color} />
                ))}
              </Pie>
              <Tooltip
                formatter={(v, name) => [`${v} turnos`, VERTICAL_META[name as keyof typeof VERTICAL_META]?.label ?? name]}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Próximas citas */}
      <section>
        <h2 className="text-xs font-bold uppercase tracking-wide border-l-4 pl-3 mb-3" style={{ borderColor: "#0f3460", color: "#1a1a2e" }}>
          Próximas citas (Mié–Vie)
        </h2>
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          {PROXIMAS.map((c) => {
            const meta = VERTICAL_META[c.vertical];
            const hora = c.fecha_hora.split("T")[1];
            const dia = c.fecha_hora.split("T")[0].split("-")[2];
            const mes = c.fecha_hora.split("T")[0].split("-")[1];
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
                  <VerticalBadge vertical={c.vertical} />
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Comparativo */}
      <section>
        <h2 className="text-xs font-bold uppercase tracking-wide border-l-4 pl-3 mb-3" style={{ borderColor: "#0f3460", color: "#1a1a2e" }}>
          Comparativo Semana 1 vs Semana 2
        </h2>
        <div className="bg-white rounded-xl shadow-sm p-4">
          <div className="grid grid-cols-4 gap-4 pb-2 mb-2 border-b-2 border-gray-200 text-xs font-bold text-gray-400 uppercase">
            <span>Métrica</span>
            <span className="text-center">Sem 1</span>
            <span className="text-center">Sem 2</span>
            <span className="text-right">Δ</span>
          </div>
          {[
            { label: "Visitas únicas", s1: vs.visitas_unicas, s2: KPI_SEMANA.visitas_unicas, pos: false },
            { label: "Tasa asistencia", s1: `${vs.tasa_asistencia}%`, s2: `${KPI_SEMANA.tasa_asistencia}%`, delta: KPI_SEMANA.tasa_asistencia - vs.tasa_asistencia, pos: true },
            { label: "Primera vez", s1: vs.primera_vez, s2: KPI_SEMANA.primera_vez, pos: true },
            { label: "VIP", s1: vs.vip, s2: KPI_SEMANA.vip, pos: true },
            { label: "Cancelados", s1: vs.canceladas, s2: KPI_SEMANA.canceladas, pos: false },
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
                  {diff > 0 ? `▲ +${diff.toFixed(1).replace(".0","")}` : diff < 0 ? `▼ ${diff.toFixed(1).replace(".0","")}` : "—"}
                </span>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
