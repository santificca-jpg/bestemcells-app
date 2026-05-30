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

const NAVY = "#2C3A5B";
const CYAN = "#3E4095";

const tooltipStyle = {
  borderRadius: 10,
  border: "1px solid rgba(44,58,91,0.10)",
  boxShadow: "0 4px 16px rgba(44,58,91,0.10)",
  fontSize: 12,
  fontFamily: "var(--font-body), Roboto, sans-serif",
  color: NAVY,
};

function CardTitle({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-[11px] font-medium text-navy/50 uppercase tracking-[0.12em] mb-4">
      {children}
    </div>
  );
}

export default function DashboardCharts({ turnos_por_dia, distribucion }: Props) {
  return (
    <div className="grid grid-cols-3 gap-4">
      <div className="col-span-2 bg-white rounded-xl p-5 shadow-card border border-navy/5">
        <CardTitle>Turnos por día</CardTitle>
        <ResponsiveContainer width="100%" height={190}>
          <BarChart data={turnos_por_dia} barCategoryGap="35%">
            <defs>
              <linearGradient id="eraBar" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={CYAN} />
                <stop offset="100%" stopColor={NAVY} />
              </linearGradient>
            </defs>
            <XAxis
              dataKey="dia"
              tick={{ fontSize: 11, fill: "#8A93A8" }}
              axisLine={{ stroke: "#E4E1D6" }}
              tickLine={false}
            />
            <YAxis
              tick={{ fontSize: 11, fill: "#8A93A8" }}
              axisLine={false}
              tickLine={false}
              width={28}
            />
            <Tooltip
              cursor={{ fill: "rgba(62,64,149,0.05)" }}
              contentStyle={tooltipStyle}
              formatter={(v) => [`${v} turnos`, ""]}
            />
            <Bar dataKey="cantidad" fill="url(#eraBar)" radius={[5, 5, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="bg-white rounded-xl p-5 shadow-card border border-navy/5">
        <CardTitle>Verticales</CardTitle>
        <ResponsiveContainer width="100%" height={190}>
          <PieChart>
            <Pie
              data={distribucion}
              dataKey="cantidad"
              nameKey="vertical"
              cx="50%"
              cy="50%"
              innerRadius={48}
              outerRadius={72}
              paddingAngle={2}
              stroke="none"
            >
              {distribucion.map(({ vertical }) => {
                const meta = VERTICAL_META[vertical] ?? VERTICAL_META["longevidad"];
                return <Cell key={vertical} fill={meta.color} />;
              })}
            </Pie>
            <Tooltip
              contentStyle={tooltipStyle}
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
