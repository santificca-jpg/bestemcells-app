'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Plus, Pencil, Trash2, X, Save, PlaySquare } from 'lucide-react'
import type { Class } from '@/lib/types'

interface Props {
  initialClasses: Class[]
}

const emptyForm = {
  title: '',
  description: '',
  video_url: '',
  video_type: 'youtube' as 'youtube' | 'vimeo',
  category: '',
  duration_minutes: '',
}

export default function ClassesManager({ initialClasses }: Props) {
  const supabase = createClient()
  const [classes, setClasses] = useState<Class[]>(initialClasses)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<Class | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  function openCreate() {
    setEditing(null)
    setForm(emptyForm)
    setError('')
    setShowForm(true)
  }

  function openEdit(cls: Class) {
    setEditing(cls)
    setForm({
      title: cls.title,
      description: cls.description,
      video_url: cls.video_url,
      video_type: cls.video_type,
      category: cls.category,
      duration_minutes: cls.duration_minutes?.toString() ?? '',
    })
    setError('')
    setShowForm(true)
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    const payload = {
      title: form.title.trim(),
      description: form.description.trim(),
      video_url: form.video_url.trim(),
      video_type: form.video_type,
      category: form.category.trim(),
      duration_minutes: form.duration_minutes ? parseInt(form.duration_minutes) : null,
    }

    if (editing) {
      const { data, error: err } = await supabase
        .from('classes')
        .update(payload)
        .eq('id', editing.id)
        .select()
        .single()

      if (err) { setError(err.message); setLoading(false); return }
      setClasses((prev) => prev.map((c) => (c.id === editing.id ? data : c)))
    } else {
      const { data, error: err } = await supabase
        .from('classes')
        .insert(payload)
        .select()
        .single()

      if (err) { setError(err.message); setLoading(false); return }
      setClasses((prev) => [data, ...prev])
    }

    setShowForm(false)
    setLoading(false)
  }

  async function handleDelete(id: string) {
    if (!confirm('¿Eliminar esta clase?')) return
    await supabase.from('classes').delete().eq('id', id)
    setClasses((prev) => prev.filter((c) => c.id !== id))
  }

  return (
    <div>
      {/* Toolbar */}
      <div className="flex justify-end mb-4">
        <button onClick={openCreate} className="btn-primary flex items-center gap-2">
          <Plus size={16} />
          Agregar clase
        </button>
      </div>

      {/* Modal / Form */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-slate-100">
              <h2 className="font-semibold text-slate-800">
                {editing ? 'Editar clase' : 'Nueva clase'}
              </h2>
              <button onClick={() => setShowForm(false)} className="text-slate-400 hover:text-slate-600">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Título *</label>
                <input
                  required
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  className="input-field"
                  placeholder="Ej. Introducción a células madre"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Descripción</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className="input-field resize-none"
                  rows={3}
                  placeholder="Breve descripción del contenido..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Tipo de video *</label>
                <select
                  value={form.video_type}
                  onChange={(e) => setForm({ ...form, video_type: e.target.value as 'youtube' | 'vimeo' })}
                  className="input-field"
                >
                  <option value="youtube">YouTube</option>
                  <option value="vimeo">Vimeo</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">URL del video *</label>
                <input
                  required
                  value={form.video_url}
                  onChange={(e) => setForm({ ...form, video_url: e.target.value })}
                  className="input-field"
                  placeholder={form.video_type === 'youtube' ? 'https://youtube.com/watch?v=...' : 'https://vimeo.com/...'}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Categoría</label>
                  <input
                    value={form.category}
                    onChange={(e) => setForm({ ...form, category: e.target.value })}
                    className="input-field"
                    placeholder="Ej. Hematología"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Duración (min)</label>
                  <input
                    type="number"
                    min="1"
                    value={form.duration_minutes}
                    onChange={(e) => setForm({ ...form, duration_minutes: e.target.value })}
                    className="input-field"
                    placeholder="45"
                  />
                </div>
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                  {error}
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowForm(false)} className="btn-secondary flex-1">
                  Cancelar
                </button>
                <button type="submit" disabled={loading} className="btn-primary flex-1 flex items-center justify-center gap-2">
                  <Save size={16} />
                  {loading ? 'Guardando...' : 'Guardar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Table */}
      {classes.length === 0 ? (
        <div className="card p-12 text-center">
          <PlaySquare className="mx-auto text-slate-300 mb-3" size={40} />
          <p className="text-slate-500 font-medium">No hay clases aún.</p>
          <p className="text-slate-400 text-sm mt-1">Hacé clic en "Agregar clase" para publicar el primer video.</p>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="text-left px-5 py-3 font-medium text-slate-600">Título</th>
                <th className="text-left px-5 py-3 font-medium text-slate-600 hidden md:table-cell">Categoría</th>
                <th className="text-left px-5 py-3 font-medium text-slate-600 hidden md:table-cell">Tipo</th>
                <th className="text-right px-5 py-3 font-medium text-slate-600">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {classes.map((cls) => (
                <tr key={cls.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-5 py-3.5">
                    <p className="font-medium text-slate-700">{cls.title}</p>
                    {cls.duration_minutes && (
                      <p className="text-xs text-slate-400">{cls.duration_minutes} min</p>
                    )}
                  </td>
                  <td className="px-5 py-3.5 text-slate-500 hidden md:table-cell">{cls.category || '—'}</td>
                  <td className="px-5 py-3.5 hidden md:table-cell">
                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                      cls.video_type === 'youtube' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'
                    }`}>
                      {cls.video_type}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => openEdit(cls)}
                        className="p-1.5 text-slate-400 hover:text-brand-600 hover:bg-brand-50 rounded-lg transition-colors"
                      >
                        <Pencil size={15} />
                      </button>
                      <button
                        onClick={() => handleDelete(cls.id)}
                        className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
