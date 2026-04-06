import { createClient } from '@/lib/supabase/server'
import { Users, PlaySquare, Bell, ClipboardList } from 'lucide-react'
import Link from 'next/link'

export default async function AdminDashboard() {
  const supabase = createClient()

  const [usersRes, classesRes, notifRes, quizRes] = await Promise.all([
    supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('role', 'doctor'),
    supabase.from('classes').select('id', { count: 'exact', head: true }),
    supabase.from('notifications').select('id', { count: 'exact', head: true }),
    supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('quiz_completed', true),
  ])

  const stats = [
    { label: 'Médicos registrados', value: usersRes.count ?? 0, icon: Users, color: 'text-violet-600', bg: 'bg-violet-50', href: '/admin/users' },
    { label: 'Clases publicadas', value: classesRes.count ?? 0, icon: PlaySquare, color: 'text-brand-600', bg: 'bg-brand-50', href: '/admin/classes' },
    { label: 'Notificaciones enviadas', value: notifRes.count ?? 0, icon: Bell, color: 'text-amber-600', bg: 'bg-amber-50', href: '/admin/notifications' },
    { label: 'Quiz completados', value: quizRes.count ?? 0, icon: ClipboardList, color: 'text-emerald-600', bg: 'bg-emerald-50', href: '/admin/users' },
  ]

  // Recent users
  const { data: recentUsers } = await supabase
    .from('profiles')
    .select('full_name, email, quiz_completed, created_at')
    .eq('role', 'doctor')
    .order('created_at', { ascending: false })
    .limit(5)

  return (
    <div>
      {/* Header */}
      <div className="bg-gradient-to-r from-brand-900 to-brand-700 rounded-2xl p-6 text-white mb-8">
        <h1 className="text-2xl font-bold mb-1">Panel de Administración</h1>
        <p className="text-brand-200 text-sm">BestEmCells — Gestioná clases, notificaciones y usuarios.</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {stats.map(({ label, value, icon: Icon, color, bg, href }) => (
          <Link key={label} href={href} className="card p-5 hover:shadow-md transition-shadow">
            <div className={`w-10 h-10 rounded-xl ${bg} flex items-center justify-center mb-3`}>
              <Icon className={color} size={20} />
            </div>
            <p className="text-2xl font-bold text-slate-800">{value}</p>
            <p className="text-xs text-slate-500 mt-0.5">{label}</p>
          </Link>
        ))}
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <Link
          href="/admin/classes"
          className="card p-5 flex items-center gap-4 hover:shadow-md transition-shadow border-l-4 border-l-brand-600"
        >
          <PlaySquare className="text-brand-600" size={22} />
          <div>
            <p className="font-semibold text-slate-700 text-sm">Agregar clase</p>
            <p className="text-xs text-slate-400">Publicar nuevo video</p>
          </div>
        </Link>
        <Link
          href="/admin/notifications"
          className="card p-5 flex items-center gap-4 hover:shadow-md transition-shadow border-l-4 border-l-amber-500"
        >
          <Bell className="text-amber-500" size={22} />
          <div>
            <p className="font-semibold text-slate-700 text-sm">Enviar aviso</p>
            <p className="text-xs text-slate-400">Notificar a todos los médicos</p>
          </div>
        </Link>
        <Link
          href="/admin/users"
          className="card p-5 flex items-center gap-4 hover:shadow-md transition-shadow border-l-4 border-l-violet-500"
        >
          <Users className="text-violet-500" size={22} />
          <div>
            <p className="font-semibold text-slate-700 text-sm">Ver usuarios</p>
            <p className="text-xs text-slate-400">Gestionar médicos</p>
          </div>
        </Link>
      </div>

      {/* Recent users */}
      <div className="card overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100">
          <h2 className="font-semibold text-slate-700 text-sm">Últimos médicos registrados</h2>
        </div>
        {!recentUsers?.length ? (
          <div className="p-8 text-center text-slate-400 text-sm">No hay médicos registrados aún.</div>
        ) : (
          <div className="divide-y divide-slate-100">
            {recentUsers.map((u) => (
              <div key={u.email} className="flex items-center justify-between px-5 py-3">
                <div>
                  <p className="text-sm font-medium text-slate-700">{u.full_name}</p>
                  <p className="text-xs text-slate-400">{u.email}</p>
                </div>
                <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                  u.quiz_completed
                    ? 'bg-green-100 text-green-700'
                    : 'bg-amber-100 text-amber-700'
                }`}>
                  {u.quiz_completed ? 'Quiz ✓' : 'Pendiente'}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
