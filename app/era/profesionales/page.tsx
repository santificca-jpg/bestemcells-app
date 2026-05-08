import { getProfesionalesData } from "@/lib/era/dashboard-data";
import ProfesionalesTable from "@/components/era/ProfesionalesTable";

export const revalidate = 300;

export default async function ProfesionalesPage() {
  const data = await getProfesionalesData();

  if (!data) {
    return (
      <div className="p-6 text-center text-red-500 font-semibold">
        No se pudieron cargar los datos. Verificá la conexión con Supabase.
      </div>
    );
  }

  const profs = data.profesionales;
  const totales = {
    turnos: profs.reduce((s, p) => s + p.turnos, 0),
    asistencia: profs.length > 0
      ? (profs.reduce((s, p) => s + p.tasa_asistencia, 0) / profs.length).toFixed(1)
      : "0",
    pv: profs.reduce((s, p) => s + p.primera_vez, 0),
    cancelados: profs.reduce((s, p) => s + p.cancelados + p.no_shows, 0),
  };

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-lg font-black text-gray-800">Performance por profesional</h1>
      <p className="text-xs text-gray-400">Semana {data.semana_label} · Click en columna para ordenar</p>

      <ProfesionalesTable profesionales={profs} />

      <div className="grid grid-cols-4 gap-3">
        {[
          { label: "Total turnos", valor: totales.turnos },
          { label: "Asistencia prom.", valor: `${totales.asistencia}%` },
          { label: "PV total", valor: totales.pv },
          { label: "Cancelados total", valor: totales.cancelados },
        ].map(({ label, valor }) => (
          <div key={label} className="bg-white rounded-xl p-4 shadow-sm text-center">
            <div className="text-2xl font-black" style={{ color: "#0f3460" }}>{valor}</div>
            <div className="text-xs text-gray-500 mt-1 uppercase tracking-wide">{label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
