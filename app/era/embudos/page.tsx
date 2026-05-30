import { getEmbudosData } from "@/lib/era/dashboard-data";
import type { DiaEmbudos, HoraCount } from "@/lib/era/dashboard-data";

export const revalidate = 300;

function BarraHora({ hora, cantidad, max, esPico }: {
  hora: string;
  cantidad: number;
  max: number;
  esPico: boolean;
}) {
  const pct = max > 0 ? Math.round((cantidad / max) * 100) : 0;
  return (
    <div className={`flex items-center gap-2 py-0.5 rounded px-1 ${esPico ? "bg-blue-50" : ""}`}>
      <span className={`text-xs w-12 shrink-0 font-mono ${esPico ? "text-blue-700 font-bold" : "text-gray-400"}`}>
        {hora}
      </span>
      <div className="flex-1 h-4 bg-gray-100 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all"
          style={{
            width: `${pct}%`,
            background: esPico
              ? "linear-gradient(90deg, #1967d2, #0f3460)"
              : "rgba(15, 52, 96, 0.25)",
          }}
        />
      </div>
      <span className={`text-xs w-5 text-right shrink-0 font-bold ${esPico ? "text-blue-700" : cantidad === 0 ? "text-gray-200" : "text-gray-500"}`}>
        {cantidad > 0 ? cantidad : ""}
      </span>
    </div>
  );
}

function TarjetaDia({ dia }: { dia: DiaEmbudos }) {
  const max = Math.max(...dia.horas.map((h) => h.cantidad), 1);
  const { desde, hasta, total } = dia.franja_pico;
  const picoDesdeH = parseInt(desde.substring(0, 2));
  const picoHastaH = parseInt(hasta.substring(0, 2));
  const sinDatos = dia.total_dia === 0;

  return (
    <div className="bg-white rounded-xl shadow-sm overflow-hidden flex flex-col">
      {/* Header */}
      <div
        className="px-4 py-3 text-white"
        style={{ background: "linear-gradient(135deg, #1a1a2e 0%, #0f3460 100%)" }}
      >
        <div className="text-base font-black">{dia.dia} {dia.fecha}</div>
        <div className="text-white/60 text-xs mt-0.5">
          {sinDatos ? "Sin turnos" : `${dia.total_dia} pacientes únicos`}
        </div>
      </div>

      {/* Franja pico */}
      {!sinDatos && (
        <div className="px-4 py-3 bg-blue-50 border-b border-blue-100">
          <div className="text-xs font-bold text-blue-500 uppercase tracking-wide mb-0.5">
            Franja pico
          </div>
          <div className="text-lg font-black text-blue-800">
            {desde} – {hasta}
          </div>
          <div className="text-xs text-blue-600 font-semibold">
            {total} paciente{total !== 1 ? "s" : ""} en esas 3 horas
          </div>
        </div>
      )}

      {/* Barras por hora */}
      <div className="px-3 py-2 flex flex-col gap-0.5 flex-1">
        {dia.horas.map((h: HoraCount) => {
          const hNum = parseInt(h.hora.substring(0, 2));
          const esPico = hNum >= picoDesdeH && hNum < picoHastaH;
          return (
            <BarraHora
              key={h.hora}
              hora={h.hora}
              cantidad={h.cantidad}
              max={max}
              esPico={!sinDatos && esPico}
            />
          );
        })}
      </div>
    </div>
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

  const { dias, semana_label } = data;

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-lg font-black text-gray-800">Embudos horarios</h1>
        <p className="text-xs text-gray-400 mt-0.5">
          Semana {semana_label} · Pacientes únicos por hora · Franja pico = ventana de 3 horas con mayor concentración
        </p>
      </div>

      <div className="grid grid-cols-5 gap-4">
        {dias.map((dia) => (
          <TarjetaDia key={dia.dia} dia={dia} />
        ))}
      </div>
    </div>
  );
}
