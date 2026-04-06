'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { FlaskConical, UserPlus } from 'lucide-react'

export default function RegisterPage() {
  const router = useRouter()
  const supabase = createClient()

  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (password !== confirm) {
      setError('Las contraseñas no coinciden.')
      return
    }
    if (password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres.')
      return
    }

    setLoading(true)

    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName },
      },
    })

    if (signUpError) {
      setError(signUpError.message)
      setLoading(false)
      return
    }

    if (data.user) {
      // Create profile row
      await supabase.from('profiles').insert({
        id: data.user.id,
        email,
        full_name: fullName,
        role: 'doctor',
        quiz_completed: false,
        quiz_score: null,
      })

      router.push('/dashboard/quiz')
      router.refresh()
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-900 via-brand-800 to-brand-700 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-white/10 rounded-2xl mb-4 backdrop-blur-sm">
            <FlaskConical className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white tracking-tight">BestEmCells</h1>
          <p className="text-brand-200 mt-1 text-sm">Plataforma Educativa Médica</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-2xl p-8">
          <h2 className="text-xl font-semibold text-slate-800 mb-2">Crear cuenta</h2>
          <p className="text-sm text-slate-500 mb-6">
            Al registrarte deberás completar un quiz de ingreso.
          </p>

          <form onSubmit={handleRegister} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Nombre completo
              </label>
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="input-field"
                placeholder="Dr. Juan Pérez"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Email
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input-field"
                placeholder="tu@email.com"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Contraseña
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input-field"
                placeholder="Mínimo 6 caracteres"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Confirmar contraseña
              </label>
              <input
                type="password"
                required
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                className="input-field"
                placeholder="••••••••"
              />
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            <button type="submit" disabled={loading} className="btn-primary w-full flex items-center justify-center gap-2 mt-2">
              <UserPlus className="w-4 h-4" />
              {loading ? 'Creando cuenta...' : 'Registrarme'}
            </button>
          </form>

          <p className="text-center text-sm text-slate-500 mt-6">
            ¿Ya tenés cuenta?{' '}
            <Link href="/auth/login" className="text-brand-700 font-medium hover:underline">
              Iniciá sesión
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
