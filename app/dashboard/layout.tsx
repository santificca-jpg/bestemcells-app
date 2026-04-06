import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Sidebar from '@/components/Sidebar'

const ADMIN_EMAILS = ['santificca@hotmail.com']

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/auth/login')

  let { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  // Auto-create profile on first login
  if (!profile) {
    const role = ADMIN_EMAILS.includes(user.email ?? '') ? 'admin' : 'doctor'
    const { data: newProfile } = await supabase
      .from('profiles')
      .insert({
        id: user.id,
        email: user.email!,
        full_name: user.user_metadata?.full_name ?? '',
        role,
      })
      .select()
      .single()

    if (!newProfile) {
      await supabase.auth.signOut()
      redirect('/auth/login')
    }

    profile = newProfile
  }

  // If admin, redirect to admin dashboard
  if (profile.role === 'admin') redirect('/admin')

  return (
    <div className="flex min-h-screen">
      <Sidebar role={profile.role} fullName={profile.full_name} />
      <main className="flex-1 ml-64 p-8 min-h-screen">
        {children}
      </main>
    </div>
  )
}
