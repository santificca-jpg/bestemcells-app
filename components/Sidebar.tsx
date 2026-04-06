'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import {
  FlaskConical,
  LayoutDashboard,
  PlaySquare,
  Bell,
  ClipboardList,
  Users,
  LogOut,
  ChevronRight,
} from 'lucide-react'
import type { UserRole } from '@/lib/types'

interface SidebarProps {
  role: UserRole
  fullName: string
}

const doctorNav = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/dashboard/classes', label: 'Clases', icon: PlaySquare },
  { href: '/dashboard/notifications', label: 'Notificaciones', icon: Bell },
  { href: '/dashboard/quiz', label: 'Quiz de ingreso', icon: ClipboardList },
]

const adminNav = [
  { href: '/admin', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/admin/classes', label: 'Clases', icon: PlaySquare },
  { href: '/admin/notifications', label: 'Notificaciones', icon: Bell },
  { href: '/admin/users', label: 'Usuarios', icon: Users },
]

export default function Sidebar({ role, fullName }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()

  const navItems = role === 'admin' ? adminNav : doctorNav

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/auth/login')
    router.refresh()
  }

  return (
    <aside className="flex flex-col w-64 min-h-screen bg-white border-r border-slate-200 fixed top-0 left-0 z-20">
      {/* Brand */}
      <div className="flex items-center gap-3 px-6 py-5 border-b border-slate-100">
        <div className="flex items-center justify-center w-9 h-9 bg-brand-700 rounded-lg">
          <FlaskConical className="w-5 h-5 text-white" />
        </div>
        <div>
          <span className="font-bold text-brand-900 text-sm leading-none">BestEmCells</span>
          <p className="text-xs text-slate-400 mt-0.5 leading-none">
            {role === 'admin' ? 'Administrador' : 'Médico'}
          </p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {navItems.map(({ href, label, icon: Icon }) => {
          const active =
            href === '/dashboard' || href === '/admin'
              ? pathname === href
              : pathname.startsWith(href)

          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors group ${
                active
                  ? 'bg-brand-50 text-brand-700'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              <Icon className={`w-4.5 h-4.5 flex-shrink-0 ${active ? 'text-brand-600' : 'text-slate-400 group-hover:text-slate-600'}`} size={18} />
              <span className="flex-1">{label}</span>
              {active && <ChevronRight className="w-3.5 h-3.5 text-brand-400" />}
            </Link>
          )
        })}
      </nav>

      {/* User & Logout */}
      <div className="px-3 py-4 border-t border-slate-100">
        <div className="flex items-center gap-3 px-3 py-2 rounded-lg mb-1">
          <div className="w-8 h-8 rounded-full bg-brand-100 flex items-center justify-center flex-shrink-0">
            <span className="text-brand-700 text-xs font-semibold">
              {fullName.charAt(0).toUpperCase()}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-slate-700 truncate">{fullName}</p>
            <p className="text-xs text-slate-400 truncate">{role === 'admin' ? 'Admin' : 'Médico'}</p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-medium text-slate-600 hover:bg-red-50 hover:text-red-600 transition-colors"
        >
          <LogOut size={18} className="flex-shrink-0" />
          Cerrar sesión
        </button>
      </div>
    </aside>
  )
}
