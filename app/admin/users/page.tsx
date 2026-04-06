import { createClient } from '@/lib/supabase/server'
import PageHeader from '@/components/PageHeader'
import UsersTable from './UsersTable'

export default async function AdminUsersPage() {
  const supabase = createClient()

  const { data: users } = await supabase
    .from('profiles')
    .select('*')
    .order('created_at', { ascending: false })

  return (
    <div>
      <PageHeader
        title="Usuarios"
        description="Gestioná los médicos registrados en la plataforma."
      />
      <UsersTable initialUsers={users ?? []} />
    </div>
  )
}
