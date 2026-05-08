import { getEmbudosData } from "@/lib/era/dashboard-data";
import type { EmbudoHorario } from "@/lib/era/dashboard-data";

export const revalidate = 300;

const DIAS_COLS = ["lunes", "martes", "miercoles", "jueves", "viernes"] as const;
const DIAS_LABEL = ["Lun", "Mar", "Mié", "Jue", "Vie"];
const PICO_UMBRAL = 12;

function HeatCell({ value, maxTotal }: { value: number; maxTotal: number }) {
  const intensity = maxTotal > 0 ? value / maxTotal : 0;
  const bg = value === 0
    ? "#f9fafb"
    : `rgba(15, 52, 96, ${0.15 + intensity * 0.85})`;
  const textColor = intensity > 0.5 ? "white" : "#374151";
  return (
    <td className="p-0">
      <div
        className="h-9 flex items-center justify-center text-xs font-bold rounded-sm m-0.5 transition-all"
        style={{ background: bg, color: textColor, minWidth: "2.5rem" }}
      >
        {value > 0 ? value : ""}
      </div>
    </td>
  );
}

export default async function EmbudosPage() {
  const data = await getEmbudosData();

  if (!data) {
    return (
      <div className="p-6 text-center text-red-500 font-semibold">
        No se pudieron cargar los datos. Verificá la conexión con Supabase.
      </div>
    );
  }

  const { embudos, semana_label } = data;
  const maxTotal = Math.max(...embudos.map((h) => h.total), 1);
  const picos = embudos.filter((h) => h.total >= PICO_UMBRAL);

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-lg font-black text-gray-800">Embudos horarios</h1>
        <p className="text-xs text-gray-400 mt-0.5">Semana {semana_label} · Intensidad = cantidad de turnos simultáneos</p>
      </div>

      {picos.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-xs font-bold text-gray-500 uppercase tracking-wide">Franjas con mayor demanda (&gt;= {PICO_UMBRAL} turnos)</h2>
          {picos.map((h: EmbudoHorario) => (
            <div key={h.hora} className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
              <span className="text-red-600 font-black text-lg w-14">{h.hora}</span>
              <div className="flex-1">
                <div className="text-sm font-semibold text-red-700">{h.total} turnos simultáneos</div>
                <div className="text-xs text-red-400 mt-0.5">
                  {DIAS_LABEL.map((d, i) => {
                    const v = h[DIAS_COLS[i]];
                    return v > 0 ? `${d}: ${v}` : null;
                  }).filter(Boolean).join(" · ")}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm p-4 overflow-x-auto">
        <h2 className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3">Mapa de calor — turnos por hora y día</h2>
        <table className="w-full border-separate border-spacing-0">
          <thead>
            <tr>
              <th className="text-left px-2 py-1 text-xs text-gray-400 font-bold uppercase w-16">Hora</th>
              {DIAS_LABEL.map((d) => (
                <th key={d} className="text-center text-xs text-gray-500 font-bold uppercase pb-1">{d}</th>
              ))}
              <th className="text-center text-xs text-gray-500 font-bold uppercase pb-1">Total</th>
            </tr>
          </thead>
          <tbody>
            {embudos.map((h: EmbudoHorario) => (
              <tr key={h.hora}>
                <td className="text-xs font-bold text-gray-400 px-2 py-0">{h.hora}</td>
                {DIAS_COLS.map((d) => (
                  <HeatCell key={d} value={h[d]} maxTotal={maxTotal} />
                ))}
                <td className="p-0">
                  <div
                    className="h-9 flex items-center justify-center text-xs font-black rounded-sm m-0.5"
                    style={{
                      background: h.total >= PICO_UMBRAL ? "#fde8e8" : "#f3f4f6",
                      color: h.total >= PICO_UMBRAL ? "#c0392b" : "#6b7280",
                    }}
                  >
                    {h.total > 0 ? h.total : ""}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex items-center gap-3 text-xs text-gray-400">
        <span>Menos turnos</span>
        {[0.1, 0.3, 0.5, 0.7, 0.9].map((i) => (
          <div key={i} className="w-8 h-4 rounded" style={{ background: `rgba(15, 52, 96, ${0.15 + i * 0.85})` }} />
        ))}
        <span>Más turnos</span>
      </div>
    </div>
  );
}
