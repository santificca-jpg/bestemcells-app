"use client";

import { use } from "react";
import Link from "next/link";
import { PERFORMANCE_PROFESIONALES, CITAS_SEMANA } from "@/lib/era/mock-data";
import { VERTICAL_META } from "@/lib/era/verticals";
import type { Vertical } from "@/lib/era/types";

export default function DrilldownProfesional({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const perf = PERFORMANCE_PROFESIONALES.find((p) => p.profesional.id === id);

  if (!perf) {
    return (
      <div className="p-6">
        <Link href="/era/profesionales" className="text-blue-600 text-sm hover:underline">← Volver</Link>
        <p className="mt-4 text-gray-500">Profesional no encontrado.</p>
      </div>
    );
  }

  const citas = CITAS_SEMANA
    .filter((c) => c.profesional.id === id)
    .sort((a, b) => a.fecha_hora.localeCompare(b.fecha_hora));

  const porVertical = Object.entries(
    citas.reduce((acc, c) => {
      acc[c.vertical] = (acc[c.vertical] || 0) + 1;
      return acc;
    }, {} as Record<string, number>)
  ).sort((a, b) => b[1] - a[1]);

  return (
    <div className="p-6 space-y-5">
      <Link href="/era/profesionales" className="text-blue-600 text-sm hover:underline">← Profesionales</Link>

      {/* Header */}
      <div className="bg-white rounded-xl p-5 shadow-sm border-l-4" style={{ borderColor: "#0f3460" }}>
        <h1 className="text-xl font-black text-gray-800">{perf.profesional.nombre}</h1>
        <p className="text-sm text-gray-500 mt-0.5">{perf.profesional.especialidad}</p>
        <div className="grid grid-cols-6 gap-3 mt-4">
          {[
            { label: "Turnos", valor: perf.turnos },
            { label: "Asistencia", valor: `${perf.tasa_asistencia}%` },
            { label: "Ocupación", valor: `${perf.tasa_ocupacion}%` },
            { label: "Primera vez", valor: perf.primera_vez },
            { label: "VIP", valor: perf.vip > 0 ? `${perf.vip} 🧬` : "—" },
            { label: "Cancelados", valor: perf.cancelados + perf.no_shows || "—" },
          ].map(({ label, valor }) => (
            <div key={label} className="text-center">
              <div className="text-2xl font-black text-gray-800">{valor}</div>
              <div className="text-xs text-gray-400 uppercase tracking-wide mt-0.5">{label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Verticales que atiende */}
      <div className="bg-white rounded-xl p-4 shadow-sm">
        <h2 className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3">Verticales atendidas esta semana</h2>
        <div className="flex gap-2 flex-wrap">
          {porVertical.map(([v, n]) => {
            const meta = VERTICAL_META[v as Vertical];
            return (
              <div key={v} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold" style={{ background: meta.bg, color: meta.color }}>
                {meta.emoji} {meta.label} <span className="font-black">({n})</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Citas de la semana */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100">
          <h2 className="text-sm font-bold text-gray-700">Citas de la semana ({citas.length})</h2>
        </div>
        {citas.map((c) => {
          const meta = VERTICAL_META[c.vertical];
          const [fecha, hora] = c.fecha_hora.split("T");
          const [, mes, dia] = fecha.split("-");
          return (
            <div
              key={c.id}
              className="flex items-center gap-3 px-4 py-2.5 border-b border-gray-100 last:border-0 hover:bg-gray-50"
              style={{ borderLeft: `3px solid ${c.es_primera_vez ? "#eab308" : meta.color}` }}
            >
              <div className="text-xs font-bold text-gray-400 w-20 shrink-0">{dia}/{mes} {hora}</div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold text-gray-800 truncate">
                  {c.paciente.nombre_completo}
                  {c.paciente.es_vip && <span className="ml-1">🧬</span>}
                </div>
                <div className="text-xs text-gray-400 truncate">{c.servicio}</div>
              </div>
              <div className="flex gap-1 shrink-0">
                {c.es_primera_vez && (
                  <span className="text-xs font-bold px-1.5 py-0.5 rounded bg-blue-100 text-blue-700">PV</span>
                )}
                <span className="text-xs font-bold px-1.5 py-0.5 rounded text-white" style={{ background: meta.color, fontSize: "0.6rem" }}>
                  {meta.label.toUpperCase().slice(0,6)}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
