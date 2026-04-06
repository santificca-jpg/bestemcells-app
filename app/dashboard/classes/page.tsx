import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import VideoCard from '@/components/VideoCard'
import PageHeader from '@/components/PageHeader'
import { SearchX } from 'lucide-react'
import type { Class } from '@/lib/types'

export default async function ClassesPage({
  searchParams,
}: {
  searchParams: { category?: string }
}) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  // Fetch all classes
  let query = supabase.from('classes').select('*').order('created_at', { ascending: false })
  if (searchParams.category) {
    query = query.eq('category', searchParams.category)
  }
  const { data: classes } = await query
  const allClasses: Class[] = classes ?? []

  // Unique categories
  const { data: catData } = await supabase
    .from('classes')
    .select('category')
    .not('category', 'is', null)
  const categories = [...new Set((catData ?? []).map((c) => c.category).filter(Boolean))]

  return (
    <div>
      <PageHeader
        title="Biblioteca de Clases"
        description="Clases grabadas disponibles para tu formación continua."
      />

      {/* Category filter */}
      {categories.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-6">
          <a
            href="/dashboard/classes"
            className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
              !searchParams.category
                ? 'bg-brand-700 text-white border-brand-700'
                : 'bg-white text-slate-600 border-slate-200 hover:border-brand-300'
            }`}
          >
            Todas
          </a>
          {categories.map((cat) => (
            <a
              key={cat}
              href={`/dashboard/classes?category=${encodeURIComponent(cat)}`}
              className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                searchParams.category === cat
                  ? 'bg-brand-700 text-white border-brand-700'
                  : 'bg-white text-slate-600 border-slate-200 hover:border-brand-300'
              }`}
            >
              {cat}
            </a>
          ))}
        </div>
      )}

      {/* Grid */}
      {allClasses.length === 0 ? (
        <div className="card p-12 text-center">
          <SearchX className="mx-auto text-slate-300 mb-3" size={40} />
          <p className="text-slate-500 font-medium">No hay clases disponibles aún.</p>
          <p className="text-slate-400 text-sm mt-1">El administrador publicará clases próximamente.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {allClasses.map((cls) => (
            <VideoCard key={cls.id} cls={cls} />
          ))}
        </div>
      )}
    </div>
  )
}
