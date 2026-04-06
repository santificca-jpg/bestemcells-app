'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Users, CheckCircle2, Clock, Search } from 'lucide-react'
import type { Profile } from '@/lib/types'

interface Props {
  initialUsers: Profile[]
}

function formatDate(dateStr: string) {
  return new Intl.DateTimeFormat('es-AR', {
    day: '2-digit', month: 'short', year: 'numeric',
  }).format(new Date(dateStr))
}

export default function UsersTable({ initialUsers }: Props) {
  const supabase = createClient()
  const [users, setUsers] = useState<Profile[]>(initialUsers)
  const [search, setSearch] = useState('')
  const [updating, setUpdating] = useState<string | null>(null)

  const filtered = users.filter(
    (u) =>
      u.full_name?.toLowerCase().includes(search.toLowerCase()) ||
      u.email?.toLowerCase().includes(search.toLowerCase())
  )

  async function toggleRole(user: Profile) {
    const newRole = user.role === 'admin' ? 'doctor' : 'admin'
    if (!confirm(`¿Cambiar el rol de ${user.full_name} a ${newRole}?`)) return

    setUpdating(user.id)
    await supabase.from('profiles').update({ role: newRole }).eq('id', user.id)
    setUsers((prev) =>
      prev.map((u) => (u.id === user.id ? { ...u, role: newRole } : u))
    )
    setUpdating(null)
  }

  const totalDoctors = users.filter((u) => u.role === 'doctor').length
  const quizCompleted = users.filter((u) => u.quiz_completed).length

  return (
    <div>
      {/* Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-6">
        <div className="card p-4 flex items-center gap-3">
          <Users size={20} className="text-brand-600" />
          <div>
            <p className="text-lg font-bold text-slate-800">{totalDoctors}</p>
            <p className="text-xs text-slate-400">Médicos</p>
          </div>
        </div>
        <div className="card p-4 flex items-center gap-3">
          <CheckCircle2 size={20} className="text-green-500" />
          <div>
            <p className="text-lg font-bold text-slate-800">{quizCompleted}</p>
            <p className="text-xs text-slate-400">Quiz completado</p>
          </div>
        </div>
        <div className="card p-4 flex items-center gap-3">
          <Clock size={20} className="text-amber-500" />
          <div>
            <p className="text-lg font-bold text-slate-800">{totalDoctors - quizCompleted}</p>
            <p className="text-xs text-slate-400">Quiz pendiente</p>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="input-field pl-9"
          placeholder="Buscar por nombre o email..."
        />
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        {filtered.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-sm">
            No se encontraron usuarios.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="text-left px-5 py-3 font-medium text-slate-600">Usuario</th>
                  <th className="text-left px-5 py-3 font-medium text-slate-600 hidden sm:table-cell">Registrado</th>
                  <th className="text-left px-5 py-3 font-medium text-slate-600">Quiz</th>
                  <th className="text-left px-5 py-3 font-medium text-slate-600">Rol</th>
                  <th className="text-right px-5 py-3 font-medium text-slate-600">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((user) => (
                  <tr key={user.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-brand-100 flex items-center justify-center flex-shrink-0">
                          <span className="text-brand-700 text-xs font-semibold">
                            {user.full_name?.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div>
                          <p className="font-medium text-slate-700">{user.full_name}</p>
                          <p className="text-xs text-slate-400">{user.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-slate-500 hidden sm:table-cell">
                      {formatDate(user.created_at)}
                    </td>
                    <td className="px-5 py-3.5">
                      {user.quiz_completed ? (
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs px-2 py-1 rounded-full bg-green-100 text-green-700 font-medium">
                            ✓ {user.quiz_score}%
                          </span>
                        </div>
                      ) : (
                        <span className="text-xs px-2 py-1 rounded-full bg-amber-100 text-amber-700 font-medium">
                          Pendiente
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-3.5">
                      <span className={user.role === 'admin' ? 'badge-admin' : 'badge-doctor'}>
                        {user.role === 'admin' ? 'Admin' : 'Médico'}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <button
                        onClick={() => toggleRole(user)}
                        disabled={updating === user.id}
                        className="text-xs px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:border-brand-300 hover:text-brand-700 transition-colors disabled:opacity-40"
                      >
                        {updating === user.id
                          ? '...'
                          : user.role === 'admin'
                            ? 'Quitar admin'
                            : 'Hacer admin'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
