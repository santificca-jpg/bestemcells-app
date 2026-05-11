"use client";

import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
} from "recharts";
import { VERTICAL_META } from "@/lib/era/verticals";
import type { Vertical } from "@/lib/era/types";

type Props = {
  turnos_por_dia: { dia: string; fecha: string; cantidad: number }[];
  distribucion: { vertical: Vertical; cantidad: number; porcentaje: number; sub?: { label: string; profesional: string; cantidad: number }[] }[];
};

export default function DashboardCharts({ turnos_por_dia, distribucion }: Props) {
  return (
    <div className="grid grid-cols-3 gap-4">
      <div className="col-span-2 bg-white rounded-xl p-4 shadow-sm">
        <div className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3">
          📅 Turnos por día
        </div>
        <ResponsiveContainer width="100%" height={180}>
          <BarChart data={turnos_por_dia}>
            <XAxis dataKey="dia" tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 12 }} />
            <Tooltip formatter={(v) => [`${v} turnos`]} />
            <Bar dataKey="cantidad" fill="#0f3460" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="bg-white rounded-xl p-4 shadow-sm">
        <div className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3">
          🏷 Verticales
        </div>
        <ResponsiveContainer width="100%" height={180}>
          <PieChart>
            <Pie
              data={distribucion}
              dataKey="cantidad"
              nameKey="vertical"
              cx="50%"
              cy="50%"
              innerRadius={45}
              outerRadius={70}
            >
              {distribucion.map(({ vertical }) => {
                const meta = VERTICAL_META[vertical] ?? VERTICAL_META["longevidad"];
                return <Cell key={vertical} fill={meta.color} />;
              })}
            </Pie>
            <Tooltip
              formatter={(v, name) => [
                `${v} turnos`,
                (VERTICAL_META[name as Vertical] ?? VERTICAL_META["longevidad"]).label,
              ]}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
