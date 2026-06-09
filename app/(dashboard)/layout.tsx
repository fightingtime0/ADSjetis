import { getSession } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { Providers } from '@/components/providers'
import { Sidebar } from '@/components/sidebar'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession()
  if (!session) redirect('/login')

  return (
    <Providers>
      <div className="flex h-screen bg-gray-50">
        <Sidebar user={session.user} />
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          <main className="flex-1 overflow-y-auto p-6">
            {children}
          </main>
        </div>
      </div>
    </Providers>
  )
}


