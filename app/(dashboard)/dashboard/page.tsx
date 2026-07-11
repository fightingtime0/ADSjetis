import { getSession } from '@/lib/auth'
import { redirect } from 'next/navigation'

export default async function DashboardPage() {
  const session = await getSession()
  if (!session) redirect('/login')

  // Non-OWNER langsung redirect ke modul mereka
  if (session.user.role !== 'OWNER') {
    const unitRedirect: Record<string, string> = {
      RETAIL:     '/toko',
      HOMESTAY:   '/homestay',
      RESTAURANT: '/restoran',
      LODGING:    '/penginapan',
      PERTASHOP:  '/pertashop',
    }
    const dest = session.user.primaryUnitType
      ? unitRedirect[session.user.primaryUnitType]
      : null
    if (dest) redirect(dest)
  }

  return (
    <div>
      <h1 className="text-xl md:text-2xl font-bold text-gray-900 mb-1">Selamat datang, {session.user.name}</h1>
      <p className="text-sm text-gray-500 mb-6">Ringkasan semua unit bisnis</p>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        {[
          { label: 'Toko Retail',  color: 'bg-blue-500',    href: '/toko' },
          { label: 'Homestay',     color: 'bg-green-500',   href: '/homestay' },
          { label: 'Restoran',     color: 'bg-orange-500',  href: '/restoran' },
          { label: 'Penginapan',   color: 'bg-purple-500',  href: '/penginapan' },
          { label: 'Pertashop',    color: 'bg-emerald-500', href: '/pertashop' },
        ].map((unit) => (
          <a
            key={unit.href}
            href={unit.href}
            className="block bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow"
          >
            <div className={`w-10 h-10 rounded-lg ${unit.color} mb-4`} />
            <p className="font-semibold text-gray-900">{unit.label}</p>
            <p className="text-xs text-gray-400 mt-1">Lihat detail →</p>
          </a>
        ))}
      </div>
    </div>
  )
}


