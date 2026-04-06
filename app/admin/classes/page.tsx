import { createClient } from '@/lib/supabase/server'
import PageHeader from '@/components/PageHeader'
import ClassesManager from './ClassesManager'

export default async function AdminClassesPage() {
  const supabase = createClient()

  const { data: classes } = await supabase
    .from('classes')
    .select('*')
    .order('created_at', { ascending: false })

  return (
    <div>
      <PageHeader
        title="Gestión de Clases"
        description="Publicá, editá y eliminá clases grabadas."
      />
      <ClassesManager initialClasses={classes ?? []} />
    </div>
  )
}
