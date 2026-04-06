'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { CheckCircle2, XCircle, ChevronRight, Send } from 'lucide-react'
import type { QuizQuestion } from '@/lib/types'

interface Props {
  questions: QuizQuestion[]
  userId: string
}

const PASS_THRESHOLD = 60 // % to pass

export default function QuizClient({ questions, userId }: Props) {
  const router = useRouter()
  const supabase = createClient()

  const [answers, setAnswers] = useState<(number | null)[]>(Array(questions.length).fill(null))
  const [currentIndex, setCurrentIndex] = useState(0)
  const [submitted, setSubmitted] = useState(false)
  const [score, setScore] = useState(0)
  const [loading, setLoading] = useState(false)

  const currentQ = questions[currentIndex]
  const selectedAnswer = answers[currentIndex]
  const allAnswered = answers.every((a) => a !== null)

  function selectAnswer(optionIndex: number) {
    if (submitted) return
    const next = [...answers]
    next[currentIndex] = optionIndex
    setAnswers(next)
  }

  async function handleSubmit() {
    if (!allAnswered) return
    setLoading(true)

    const correctCount = questions.filter(
      (q, i) => answers[i] === q.correct_answer
    ).length
    const pct = Math.round((correctCount / questions.length) * 100)
    const passed = pct >= PASS_THRESHOLD

    setScore(pct)
    setSubmitted(true)

    // Save attempt
    await supabase.from('quiz_attempts').insert({
      user_id: userId,
      score: pct,
      answers,
      passed,
    })

    // Update profile
    await supabase
      .from('profiles')
      .update({ quiz_completed: true, quiz_score: pct })
      .eq('id', userId)

    setLoading(false)
  }

  if (submitted) {
    const passed = score >= PASS_THRESHOLD
    const correctCount = questions.filter((q, i) => answers[i] === q.correct_answer).length

    return (
      <div className="max-w-2xl mx-auto">
        <div className="card p-8 text-center mb-6">
          <div className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4 ${
            passed ? 'bg-green-100' : 'bg-red-50'
          }`}>
            {passed
              ? <CheckCircle2 className="text-green-500" size={36} />
              : <XCircle className="text-red-400" size={36} />}
          </div>
          <h2 className="text-2xl font-bold text-slate-800 mb-1">
            {passed ? '¡Felicitaciones!' : 'Resultado final'}
          </h2>
          <p className="text-slate-500 mb-4">
            {passed
              ? 'Aprobaste el quiz de ingreso. ¡Bienvenido/a a BestEmCells!'
              : `Obtuviste menos del ${PASS_THRESHOLD}% requerido. Podés seguir explorando la plataforma.`}
          </p>
          <div className="text-5xl font-black text-brand-700 mb-2">{score}%</div>
          <p className="text-sm text-slate-400">
            {correctCount} de {questions.length} respuestas correctas
          </p>
        </div>

        {/* Review */}
        <h3 className="font-semibold text-slate-700 mb-3 text-sm">Revisión de respuestas</h3>
        <div className="space-y-3">
          {questions.map((q, i) => {
            const isCorrect = answers[i] === q.correct_answer
            return (
              <div key={q.id} className={`card p-4 border-l-4 ${isCorrect ? 'border-l-green-500' : 'border-l-red-400'}`}>
                <p className="text-sm font-medium text-slate-700 mb-2">
                  {i + 1}. {q.question}
                </p>
                <div className="space-y-1.5">
                  {q.options.map((opt, oi) => (
                    <div key={oi} className={`text-xs px-3 py-1.5 rounded-lg ${
                      oi === q.correct_answer
                        ? 'bg-green-100 text-green-800 font-medium'
                        : oi === answers[i] && !isCorrect
                          ? 'bg-red-50 text-red-700 line-through'
                          : 'text-slate-500'
                    }`}>
                      {opt}
                      {oi === q.correct_answer && ' ✓'}
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>

        <button
          onClick={() => { router.push('/dashboard'); router.refresh() }}
          className="btn-primary mt-6 w-full flex items-center justify-center gap-2"
        >
          Ir al dashboard
          <ChevronRight size={16} />
        </button>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto">
      {/* Progress */}
      <div className="flex items-center justify-between mb-4">
        <span className="text-sm text-slate-500">
          Pregunta {currentIndex + 1} de {questions.length}
        </span>
        <span className="text-sm text-slate-500">
          {answers.filter((a) => a !== null).length} respondidas
        </span>
      </div>
      <div className="w-full bg-slate-200 rounded-full h-2 mb-6">
        <div
          className="bg-brand-600 h-2 rounded-full transition-all duration-300"
          style={{ width: `${((currentIndex + 1) / questions.length) * 100}%` }}
        />
      </div>

      {/* Question */}
      <div className="card p-6 mb-4">
        <h2 className="text-base font-semibold text-slate-800 mb-5">
          {currentIndex + 1}. {currentQ.question}
        </h2>
        <div className="space-y-3">
          {currentQ.options.map((option, oi) => (
            <button
              key={oi}
              onClick={() => selectAnswer(oi)}
              className={`w-full text-left px-4 py-3 rounded-lg border text-sm font-medium transition-all ${
                selectedAnswer === oi
                  ? 'bg-brand-700 text-white border-brand-700 shadow-sm'
                  : 'bg-white text-slate-700 border-slate-200 hover:border-brand-300 hover:bg-brand-50/40'
              }`}
            >
              <span className={`inline-flex items-center justify-center w-5 h-5 rounded-full text-xs font-bold mr-2.5 ${
                selectedAnswer === oi ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'
              }`}>
                {String.fromCharCode(65 + oi)}
              </span>
              {option}
            </button>
          ))}
        </div>
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between gap-3">
        <button
          onClick={() => setCurrentIndex((i) => Math.max(0, i - 1))}
          disabled={currentIndex === 0}
          className="btn-secondary flex-1 disabled:opacity-40"
        >
          Anterior
        </button>

        {currentIndex < questions.length - 1 ? (
          <button
            onClick={() => setCurrentIndex((i) => i + 1)}
            disabled={selectedAnswer === null}
            className="btn-primary flex-1 flex items-center justify-center gap-2"
          >
            Siguiente
            <ChevronRight size={16} />
          </button>
        ) : (
          <button
            onClick={handleSubmit}
            disabled={!allAnswered || loading}
            className="btn-primary flex-1 flex items-center justify-center gap-2"
          >
            <Send size={16} />
            {loading ? 'Enviando...' : 'Enviar respuestas'}
          </button>
        )}
      </div>

      {/* Question navigator */}
      <div className="card p-4 mt-4">
        <p className="text-xs text-slate-500 mb-3 font-medium">Navegador de preguntas</p>
        <div className="flex flex-wrap gap-2">
          {questions.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrentIndex(i)}
              className={`w-8 h-8 rounded-lg text-xs font-semibold transition-all ${
                i === currentIndex
                  ? 'bg-brand-700 text-white'
                  : answers[i] !== null
                    ? 'bg-brand-100 text-brand-700'
                    : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
              }`}
            >
              {i + 1}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
