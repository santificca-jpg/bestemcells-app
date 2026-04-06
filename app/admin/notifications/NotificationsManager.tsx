'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Send, Trash2, Bell, BellOff } from 'lucide-react'
import type { Notification } from '@/lib/types'

interface Props {
  initialNotifications: Notification[]
  adminId: string
}

function formatDate(dateStr: string) {
  return new Intl.DateTimeFormat('es-AR', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  }).format(new Date(dateStr))
}

export default function NotificationsManager({ initialNotifications, adminId }: Props) {
  const supabase = createClient()
  const [notifications, setNotifications] = useState<Notification[]>(initialNotifications)
  const [title, setTitle] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  async function handleSend(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setSuccess('')

    if (!title.trim() || !message.trim()) {
      setError('Completá el título y el mensaje.')
      return
    }

    setLoading(true)

    const { data, error: err } = await supabase
      .from('notifications')
      .insert({
        title: title.trim(),
        message: message.trim(),
        created_by: adminId,
      })
      .select()
      .single()

    if (err) {
      setError(err.message)
      setLoading(false)
      return
    }

    setNotifications((prev) => [data, ...prev])
    setTitle('')
    setMessage('')
    setSuccess('Notificación enviada a todos los médicos.')
    setLoading(false)

    setTimeout(() => setSuccess(''), 4000)
  }

  async function handleDelete(id: string) {
    if (!confirm('¿Eliminar esta notificación?')) return
    await supabase.from('notifications').delete().eq('id', id)
    setNotifications((prev) => prev.filter((n) => n.id !== id))
  }

  return (
    <div className="space-y-6">
      {/* Compose */}
      <div className="card p-6">
        <h2 className="font-semibold text-slate-700 mb-4 flex items-center gap-2 text-sm">
          <Send size={16} className="text-brand-600" />
          Nuevo aviso
        </h2>

        <form onSubmit={handleSend} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Título *</label>
            <input
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="input-field"
              placeholder="Ej. Recordatorio: Clase en vivo este jueves"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Mensaje *</label>
            <textarea
              required
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="input-field resize-none"
              rows={4}
              placeholder="Escribí el contenido del aviso para todos los médicos..."
            />
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}
          {success && (
            <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg text-sm flex items-center gap-2">
              <Bell size={14} />
              {success}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="btn-primary flex items-center gap-2"
          >
            <Send size={16} />
            {loading ? 'Enviando...' : 'Enviar a todos los médicos'}
          </button>
        </form>
      </div>

      {/* List */}
      <div>
        <h2 className="font-semibold text-slate-700 mb-3 text-sm">Historial de notificaciones</h2>

        {notifications.length === 0 ? (
          <div className="card p-12 text-center">
            <BellOff className="mx-auto text-slate-300 mb-3" size={40} />
            <p className="text-slate-500 font-medium">No hay notificaciones enviadas.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {notifications.map((n) => (
              <div key={n.id} className="card p-5 flex items-start gap-4">
                <div className="w-9 h-9 bg-brand-50 rounded-full flex items-center justify-center flex-shrink-0">
                  <Bell size={16} className="text-brand-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-slate-800 text-sm">{n.title}</p>
                  <p className="text-sm text-slate-600 mt-0.5 leading-relaxed">{n.message}</p>
                  <p className="text-xs text-slate-400 mt-2">{formatDate(n.created_at)}</p>
                </div>
                <button
                  onClick={() => handleDelete(n.id)}
                  className="flex-shrink-0 p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                >
                  <Trash2 size={15} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
