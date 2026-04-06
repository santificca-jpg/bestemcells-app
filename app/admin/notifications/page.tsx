import { createClient } from '@/lib/supabase/server'
import PageHeader from '@/components/PageHeader'
import NotificationsManager from './NotificationsManager'

export default async function AdminNotificationsPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: notifications } = await supabase
    .from('notifications')
    .select('*')
    .order('created_at', { ascending: false })

  return (
    <div>
      <PageHeader
        title="Notificaciones"
        description="Enviá avisos y comunicados a todos los médicos."
      />
      <NotificationsManager
        initialNotifications={notifications ?? []}
        adminId={user?.id ?? ''}
      />
    </div>
  )
}
