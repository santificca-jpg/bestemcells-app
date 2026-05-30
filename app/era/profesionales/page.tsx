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
  const totalAsistidos = profs.reduce((s, p) => s + p.asistidos, 0);
  const totalTurnos = profs.reduce((s, p) => s + p.turnos, 0);
  const asistenciaProm = totalTurnos > 0 ? Math.round((totalAsistidos / totalTurnos) * 1000) / 10 : 0;
  const profsConOcup = profs.filter((p) => p.ocupacion_pct !== null);
  const ocupacionProm = profsConOcup.length > 0
    ? Math.round(profsConOcup.reduce((s, p) => s + (p.ocupacion_pct ?? 0), 0) / profsConOcup.length)
    : null;

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-lg font-black text-gray-800">Performance por profesional</h1>
      <p className="text-xs text-gray-400">Semana {data.semana_label} · Click en columna para ordenar</p>

      <ProfesionalesTable profesionales={profs} />

      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Total asistidos", valor: totalAsistidos },
          { label: "Asistencia prom.", valor: `${asistenciaProm}%` },
          { label: "Ocupación prom.", valor: ocupacionProm === null ? "—" : `${ocupacionProm}%` },
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
