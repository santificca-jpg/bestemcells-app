import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import QuizClient from './QuizClient'
import PageHeader from '@/components/PageHeader'
import { CheckCircle2, Trophy } from 'lucide-react'

export default async function QuizPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const [profileRes, questionsRes] = await Promise.all([
    supabase.from('profiles').select('quiz_completed, quiz_score, full_name').eq('id', user.id).single(),
    supabase.from('quiz_questions').select('*').order('order_index'),
  ])

  const profile = profileRes.data
  const questions = questionsRes.data ?? []

  if (profile?.quiz_completed) {
    return (
      <div>
        <PageHeader title="Quiz de Ingreso" />
        <div className="card p-10 text-center max-w-md mx-auto">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Trophy className="text-green-500" size={28} />
          </div>
          <h2 className="text-xl font-bold text-slate-800 mb-2">¡Quiz completado!</h2>
          <p className="text-slate-500 mb-1">
            Ya completaste el quiz de ingreso con un puntaje de:
          </p>
          <p className="text-4xl font-bold text-brand-700 my-3">{profile.quiz_score}%</p>
          <div className="flex items-center justify-center gap-1.5 text-green-600 text-sm font-medium">
            <CheckCircle2 size={16} />
            Acceso completo habilitado
          </div>
        </div>
      </div>
    )
  }

  if (questions.length === 0) {
    return (
      <div>
        <PageHeader title="Quiz de Ingreso" />
        <div className="card p-10 text-center">
          <p className="text-slate-500">El administrador aún no cargó preguntas para el quiz.</p>
        </div>
      </div>
    )
  }

  return (
    <div>
      <PageHeader
        title="Quiz de Ingreso"
        description="Respondé todas las preguntas para completar tu ingreso a la plataforma."
      />
      <QuizClient questions={questions} userId={user.id} />
    </div>
  )
}
