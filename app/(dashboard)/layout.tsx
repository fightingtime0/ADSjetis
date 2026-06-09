import { getSession } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { Providers } from '@/components/providers'
import { DashboardShell } from '@/components/dashboard-shell'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession()
  if (!session) redirect('/login')

  return (
    <Providers>
      <DashboardShell user={session.user}>
        {children}
      </DashboardShell>
    </Providers>
  )
}
