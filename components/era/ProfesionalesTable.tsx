"use client";

import { useState } from "react";
import Link from "next/link";
import type { ProfesionalPerf } from "@/lib/era/dashboard-data";

type SortKey = "turnos" | "tasa_asistencia" | "primera_vez" | "vip";

export default function ProfesionalesTable({ profesionales }: { profesionales: ProfesionalPerf[] }) {
  const [sortBy, setSortBy] = useState<SortKey>("turnos");

  const sorted = [...profesionales].sort((a, b) => b[sortBy] - a[sortBy]);

  const col = (label: string, key: SortKey) => (
    <th
      className="px-3 py-2 text-center text-xs font-bold text-gray-500 uppercase cursor-pointer hover:text-gray-800 select-none"
      onClick={() => setSortBy(key)}
    >
      {label} {sortBy === key && "↓"}
    </th>
  );

  return (
    <div className="bg-white rounded-xl shadow-sm overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-gray-50 border-b-2 border-gray-200">
            <th className="px-3 py-2 text-left text-xs font-bold text-gray-500 uppercase">Profesional</th>
            <th className="px-3 py-2 text-center text-xs font-bold text-gray-500 uppercase">Especialidad</th>
            {col("Turnos", "turnos")}
            {col("Asistencia", "tasa_asistencia")}
            {col("PV", "primera_vez")}
            {col("VIP", "vip")}
            <th className="px-3 py-2 text-center text-xs font-bold text-gray-500 uppercase">Canc.</th>
            <th className="px-3 py-2"></th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((p) => (
            <tr key={p.id} className="border-b border-gray-100 hover:bg-gray-50">
              <td className="px-3 py-2 font-semibold text-gray-800">{p.nombre}</td>
              <td className="px-3 py-2 text-center text-xs text-gray-500">{p.especialidad}</td>
              <td className="px-3 py-2 text-center font-bold">{p.turnos}</td>
              <td className="px-3 py-2 text-center">
                <span className={`text-xs font-bold px-2 py-0.5 rounded ${p.tasa_asistencia >= 90 ? "bg-green-100 text-green-700" : "bg-red-100 text-red-600"}`}>
                  {p.tasa_asistencia}%
                </span>
              </td>
              <td className="px-3 py-2 text-center font-semibold text-blue-700">{p.primera_vez}</td>
              <td className="px-3 py-2 text-center font-semibold text-yellow-600">{p.vip > 0 ? `${p.vip} 🧬` : "—"}</td>
              <td className="px-3 py-2 text-center text-xs text-red-500">
                {p.cancelados + p.no_shows > 0 ? p.cancelados + p.no_shows : "—"}
              </td>
              <td className="px-3 py-2 text-center">
                <Link href={`/era/profesionales/${p.id}`} className="text-xs text-blue-600 hover:underline">
                  Ver →
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
