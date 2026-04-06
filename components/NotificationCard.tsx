import { Bell, Clock } from 'lucide-react'
import type { Notification } from '@/lib/types'

interface Props {
  notification: Notification
  isUnread?: boolean
}

function formatDate(dateStr: string) {
  return new Intl.DateTimeFormat('es-AR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(dateStr))
}

export default function NotificationCard({ notification, isUnread }: Props) {
  return (
    <div className={`card p-5 ${isUnread ? 'border-brand-300 bg-brand-50/30' : ''}`}>
      <div className="flex items-start gap-4">
        <div className={`flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center ${
          isUnread ? 'bg-brand-100' : 'bg-slate-100'
        }`}>
          <Bell size={16} className={isUnread ? 'text-brand-600' : 'text-slate-400'} />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-semibold text-slate-800 text-sm">{notification.title}</h3>
            {isUnread && (
              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-brand-600 text-white">
                Nuevo
              </span>
            )}
          </div>

          <p className="text-sm text-slate-600 leading-relaxed mb-3">{notification.message}</p>

          <div className="flex items-center gap-1.5 text-xs text-slate-400">
            <Clock size={12} />
            <span>{formatDate(notification.created_at)}</span>
          </div>
        </div>
      </div>
    </div>
  )
}
