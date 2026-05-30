"use client";

import { useState } from "react";
import Link from "next/link";
import type { ProfesionalPerf } from "@/lib/era/dashboard-data";
import { VERTICAL_META } from "@/lib/era/verticals";

type SortKey = "asistidos" | "tasa_asistencia" | "ocupacion_pct";

export default function ProfesionalesTable({ profesionales }: { profesionales: ProfesionalPerf[] }) {
  const [sortBy, setSortBy] = useState<SortKey>("asistidos");

  const sorted = [...profesionales].sort((a, b) => {
    const va = (a[sortBy] ?? -1) as number;
    const vb = (b[sortBy] ?? -1) as number;
    return vb - va;
  });

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
            <th className="px-3 py-2 text-left text-xs font-bold text-gray-500 uppercase">Vertical</th>
            {col("Asistidos", "asistidos")}
            {col("Asistencia", "tasa_asistencia")}
            {col("Ocupación", "ocupacion_pct")}
            <th className="px-3 py-2"></th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((p) => (
            <tr key={p.nombre} className="border-b border-gray-100 hover:bg-gray-50">
              <td className="px-3 py-2 font-semibold text-gray-800">{p.nombre}</td>
              <td className="px-3 py-2 text-xs text-gray-600">
                {p.verticales.length === 1
                  ? VERTICAL_META[p.verticales[0].vertical].label
                  : p.verticales.map((v, i) => (
                      <span key={v.vertical}>
                        {i > 0 && <span className="text-gray-300"> · </span>}
                        <span style={{ color: VERTICAL_META[v.vertical].color }} className="font-semibold">
                          {VERTICAL_META[v.vertical].label}
                        </span>{" "}
                        <span className="text-gray-500">{v.pct}%</span>
                      </span>
                    ))}
              </td>
              <td className="px-3 py-2 text-center font-bold">{p.asistidos}</td>
              <td className="px-3 py-2 text-center">
                <span className={`text-xs font-bold px-2 py-0.5 rounded ${p.tasa_asistencia >= 90 ? "bg-green-100 text-green-700" : "bg-red-100 text-red-600"}`}>
                  {p.tasa_asistencia}%
                </span>
              </td>
              <td className="px-3 py-2 text-center">
                {p.ocupacion_pct === null ? (
                  <span className="text-xs text-gray-400">—</span>
                ) : (
                  <span className={`text-xs font-bold px-2 py-0.5 rounded ${
                    p.ocupacion_pct >= 75 ? "bg-green-100 text-green-700"
                    : p.ocupacion_pct >= 50 ? "bg-yellow-100 text-yellow-700"
                    : "bg-red-100 text-red-600"
                  }`}>
                    {p.ocupacion_pct}%
                  </span>
                )}
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
