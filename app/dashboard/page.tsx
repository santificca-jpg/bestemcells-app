import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import {
  PlaySquare,
  Bell,
  ClipboardList,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react'

export default async function DashboardPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const [profileRes, classesRes, notifRes, unreadRes] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', user.id).single(),
    supabase.from('classes').select('id', { count: 'exact', head: true }),
    supabase.from('notifications').select('id', { count: 'exact', head: true }),
    supabase
      .from('notifications')
      .select('id')
      .not('id', 'in',
        supabase
          .from('notification_reads')
          .select('notification_id')
          .eq('user_id', user.id)
      ),
  ])

  const profile = profileRes.data
  const totalClasses = classesRes.count ?? 0
  const totalNotifs = notifRes.count ?? 0
  const unreadCount = unreadRes.data?.length ?? 0

  return (
    <div>
      {/* Welcome banner */}
      <div className="bg-gradient-to-r from-brand-800 to-brand-600 rounded-2xl p-6 text-white mb-8">
        <h1 className="text-2xl font-bold mb-1">
          Bienvenido/a, {profile?.full_name?.split(' ')[0]} 👋
        </h1>
        <p className="text-brand-100 text-sm">
          Plataforma educativa BestEmCells — Medicina de excelencia.
        </p>
      </div>

      {/* Quiz alert */}
      {!profile?.quiz_completed && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3 mb-8">
          <AlertCircle className="text-amber-500 flex-shrink-0 mt-0.5" size={18} />
          <div>
            <p className="text-sm font-medium text-amber-800">Quiz de ingreso pendiente</p>
            <p className="text-sm text-amber-700 mt-0.5">
              Debés completar el quiz de ingreso para desbloquear todas las funciones.{' '}
              <Link href="/dashboard/quiz" className="font-semibold underline">
                Realizar quiz →
              </Link>
            </p>
          </div>
        </div>
      )}

      {profile?.quiz_completed && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-start gap-3 mb-8">
          <CheckCircle2 className="text-green-500 flex-shrink-0 mt-0.5" size={18} />
          <div>
            <p className="text-sm font-medium text-green-800">Quiz completado</p>
            <p className="text-sm text-green-700 mt-0.5">
              Obtuviste {profile.quiz_score}% — Acceso completo habilitado.
            </p>
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <StatCard
          icon={<PlaySquare className="text-brand-600" size={22} />}
          label="Clases disponibles"
          value={totalClasses}
          href="/dashboard/classes"
          bg="bg-brand-50"
        />
        <StatCard
          icon={<Bell className="text-violet-600" size={22} />}
          label="Notificaciones"
          value={totalNotifs}
          badge={unreadCount > 0 ? unreadCount : undefined}
          href="/dashboard/notifications"
          bg="bg-violet-50"
        />
        <StatCard
          icon={<ClipboardList className="text-emerald-600" size={22} />}
          label="Quiz de ingreso"
          value={profile?.quiz_completed ? 'Completado' : 'Pendiente'}
          href="/dashboard/quiz"
          bg="bg-emerald-50"
        />
      </div>

      {/* Quick links */}
      <div className="card p-5">
        <h2 className="font-semibold text-slate-700 mb-4 text-sm">Acceso rápido</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Link
            href="/dashboard/classes"
            className="flex items-center gap-3 p-3 rounded-lg border border-slate-200 hover:border-brand-300 hover:bg-brand-50/40 transition-colors"
          >
            <PlaySquare size={18} className="text-brand-600" />
            <span className="text-sm font-medium text-slate-700">Ver clases grabadas</span>
          </Link>
          <Link
            href="/dashboard/notifications"
            className="flex items-center gap-3 p-3 rounded-lg border border-slate-200 hover:border-violet-300 hover:bg-violet-50/40 transition-colors"
          >
            <Bell size={18} className="text-violet-600" />
            <span className="text-sm font-medium text-slate-700">
              Ver notificaciones
              {unreadCount > 0 && (
                <span className="ml-2 inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium bg-brand-600 text-white">
                  {unreadCount}
                </span>
              )}
            </span>
          </Link>
        </div>
      </div>
    </div>
  )
}

function StatCard({
  icon, label, value, href, bg, badge,
}: {
  icon: React.ReactNode
  label: string
  value: number | string
  href: string
  bg: string
  badge?: number
}) {
  return (
    <Link href={href} className="card p-5 hover:shadow-md transition-shadow flex items-center gap-4">
      <div className={`w-11 h-11 rounded-xl ${bg} flex items-center justify-center flex-shrink-0`}>
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-slate-500 mb-0.5">{label}</p>
        <p className="text-xl font-bold text-slate-800 flex items-center gap-2">
          {value}
          {badge !== undefined && (
            <span className="text-xs font-semibold bg-brand-600 text-white rounded-full px-1.5 py-0.5">
              {badge} nuevas
            </span>
          )}
        </p>
      </div>
    </Link>
  )
}
