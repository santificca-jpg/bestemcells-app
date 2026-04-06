import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import NotificationCard from '@/components/NotificationCard'
import PageHeader from '@/components/PageHeader'
import { BellOff } from 'lucide-react'
import type { Notification } from '@/lib/types'

export default async function NotificationsPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  // Fetch notifications
  const { data: notifications } = await supabase
    .from('notifications')
    .select('*')
    .order('created_at', { ascending: false })

  // Fetch read ids
  const { data: reads } = await supabase
    .from('notification_reads')
    .select('notification_id')
    .eq('user_id', user.id)

  const readIds = new Set((reads ?? []).map((r) => r.notification_id))

  const allNotifications: Notification[] = notifications ?? []

  // Mark unread as read
  const unreadIds = allNotifications
    .filter((n) => !readIds.has(n.id))
    .map((n) => n.id)

  if (unreadIds.length > 0) {
    await supabase.from('notification_reads').upsert(
      unreadIds.map((notification_id) => ({
        notification_id,
        user_id: user.id,
        read_at: new Date().toISOString(),
      })),
      { onConflict: 'notification_id,user_id' }
    )
  }

  return (
    <div>
      <PageHeader
        title="Notificaciones"
        description="Avisos y comunicados del equipo de BestEmCells."
      />

      {allNotifications.length === 0 ? (
        <div className="card p-12 text-center">
          <BellOff className="mx-auto text-slate-300 mb-3" size={40} />
          <p className="text-slate-500 font-medium">No hay notificaciones.</p>
          <p className="text-slate-400 text-sm mt-1">Cuando el administrador publique un aviso, aparecerá aquí.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {allNotifications.map((n) => (
            <NotificationCard
              key={n.id}
              notification={n}
              isUnread={!readIds.has(n.id)}
            />
          ))}
        </div>
      )}
    </div>
  )
}
