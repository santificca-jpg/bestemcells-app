"use client";

import { useState } from "react";
import Link from "next/link";
import { PERFORMANCE_PROFESIONALES } from "@/lib/era/mock-data";

type SortKey = "turnos" | "tasa_asistencia" | "primera_vez" | "tasa_ocupacion" | "vip";

export default function ProfesionalesPage() {
  const [sortBy, setSortBy] = useState<SortKey>("turnos");

  const sorted = [...PERFORMANCE_PROFESIONALES].sort((a, b) => b[sortBy] - a[sortBy]);

  const col = (label: string, key: SortKey) => (
    <th
      className="px-3 py-2 text-center text-xs font-bold text-gray-500 uppercase cursor-pointer hover:text-gray-800 select-none"
      onClick={() => setSortBy(key)}
    >
      {label} {sortBy === key && "↓"}
    </th>
  );

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-lg font-black text-gray-800">Performance por profesional</h1>
      <p className="text-xs text-gray-400">Semana 13–17 Abril 2026 · Click en columna para ordenar</p>

      <div className="bg-white rounded-xl shadow-sm overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b-2 border-gray-200">
              <th className="px-3 py-2 text-left text-xs font-bold text-gray-500 uppercase">Profesional</th>
              <th className="px-3 py-2 text-center text-xs font-bold text-gray-500 uppercase">Vertical</th>
              {col("Turnos", "turnos")}
              {col("Asistencia", "tasa_asistencia")}
              {col("% Ocup.", "tasa_ocupacion")}
              {col("PV", "primera_vez")}
              {col("VIP", "vip")}
              <th className="px-3 py-2 text-center text-xs font-bold text-gray-500 uppercase">Canc.</th>
              <th className="px-3 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {sorted.map(({ profesional, turnos, asistidos, cancelados, no_shows, primera_vez, vip, tasa_asistencia, tasa_ocupacion }) => (
              <tr key={profesional.id} className="border-b border-gray-100 hover:bg-gray-50">
                <td className="px-3 py-2 font-semibold text-gray-800">{profesional.nombre}</td>
                <td className="px-3 py-2 text-center text-xs text-gray-500">{profesional.especialidad}</td>
                <td className="px-3 py-2 text-center font-bold">{turnos}</td>
                <td className="px-3 py-2 text-center">
                  <span className={`text-xs font-bold px-2 py-0.5 rounded ${tasa_asistencia >= 90 ? "bg-green-100 text-green-700" : "bg-red-100 text-red-600"}`}>
                    {tasa_asistencia}%
                  </span>
                </td>
                <td className="px-3 py-2 text-center">
                  <div className="flex items-center gap-1 justify-center">
                    <div className="h-1.5 rounded-full bg-gray-200 w-16 overflow-hidden">
                      <div className="h-full rounded-full bg-blue-600" style={{ width: `${tasa_ocupacion}%` }} />
                    </div>
                    <span className="text-xs text-gray-500">{tasa_ocupacion}%</span>
                  </div>
                </td>
                <td className="px-3 py-2 text-center font-semibold text-blue-700">{primera_vez}</td>
                <td className="px-3 py-2 text-center font-semibold text-yellow-600">{vip > 0 ? `${vip} 🧬` : "—"}</td>
                <td className="px-3 py-2 text-center text-xs text-red-500">{cancelados + no_shows > 0 ? cancelados + no_shows : "—"}</td>
                <td className="px-3 py-2 text-center">
                  <Link
                    href={`/era/profesionales/${profesional.id}`}
                    className="text-xs text-blue-600 hover:underline"
                  >
                    Ver →
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Resumen */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: "Total turnos", valor: PERFORMANCE_PROFESIONALES.reduce((s, p) => s + p.turnos, 0) },
          { label: "Asistencia prom.", valor: `${(PERFORMANCE_PROFESIONALES.reduce((s,p)=>s+p.tasa_asistencia,0)/PERFORMANCE_PROFESIONALES.length).toFixed(1)}%` },
          { label: "PV total", valor: PERFORMANCE_PROFESIONALES.reduce((s,p)=>s+p.primera_vez,0) },
          { label: "Cancelados total", valor: PERFORMANCE_PROFESIONALES.reduce((s,p)=>s+p.cancelados+p.no_shows,0) },
        ].map(({ label, valor }) => (
          <div key={label} className="bg-white rounded-xl p-4 shadow-sm text-center">
            <div className="text-2xl font-black text-navy-700" style={{color:"#0f3460"}}>{valor}</div>
            <div className="text-xs text-gray-500 mt-1 uppercase tracking-wide">{label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
