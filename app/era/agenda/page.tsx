import { getAgendaData } from "@/lib/era/dashboard-data";
import AgendaWeekView from "@/components/era/AgendaWeekView";

export const revalidate = 300;

export default async function AgendaPage() {
  const data = await getAgendaData();

  if (!data) {
    return (
      <div className="p-6 text-center text-red-500 font-semibold">
        No se pudieron cargar los datos de agenda. Verificá la conexión con Supabase.
      </div>
    );
  }

  return <AgendaWeekView data={data} />;
}
