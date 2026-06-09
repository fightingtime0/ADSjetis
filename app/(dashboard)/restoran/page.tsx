import { getSession } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { formatRupiah, formatDateTime } from '@/lib/utils'
import { startOfDay, endOfDay, startOfMonth, endOfMonth } from 'date-fns'
import Link from 'next/link'
import { BukaMejaButton } from './_components/buka-meja-button'

async function getRestoranData() {
  const unit = await prisma.businessUnit.findFirst({ where: { type: 'RESTAURANT', isActive: true } })
  if (!unit) return null

  const now = new Date()

  const [todayAgg, monthAgg, openOrders, lowStock, topMenuRaw] = await Promise.all([
    prisma.tableOrder.aggregate({
      where: { unitId: unit.id, status: 'PAID', createdAt: { gte: startOfDay(now), lte: endOfDay(now) } },
      _sum: { total: true }, _count: true,
    }),
    prisma.tableOrder.aggregate({
      where: { unitId: unit.id, status: 'PAID', createdAt: { gte: startOfMonth(now), lte: endOfMonth(now) } },
      _sum: { total: true }, _count: true,
    }),
    prisma.tableOrder.findMany({
      where: { unitId: unit.id, status: { in: ['OPEN', 'BILLED'] } },
      include: {
        items: {
          where: { status: { not: 'CANCELLED' } },
          include: { menuItem: { select: { name: true } } },
        },
      },
      orderBy: { openedAt: 'asc' },
    }),
    prisma.$queryRaw<{ id: string; name: string; stock: string; minStock: string; unit: string }[]>`
      SELECT id, name, stock::text, "minStock"::text, unit
      FROM products WHERE "unitId" = ${unit.id} AND "isActive" = true AND stock <= "minStock"
      ORDER BY stock ASC LIMIT 4
    `,
    prisma.tableOrderItem.groupBy({
      by: ['menuItemId'],
      where: {
        order: { unitId: unit.id, status: 'PAID', createdAt: { gte: startOfDay(now), lte: endOfDay(now) } },
        status: { not: 'CANCELLED' },
      },
      _sum: { qty: true },
      orderBy: { _sum: { qty: 'desc' } },
      take: 5,
    }),
  ])

  const menuIds = topMenuRaw.map((m) => m.menuItemId)
  const menuItems = await prisma.menuItem.findMany({
    where: { id: { in: menuIds } },
    select: { id: true, name: true, price: true },
  })
  const topMenus = topMenuRaw.map((m) => ({
    qty: m._sum.qty ?? 0,
    menuItem: menuItems.find((mi) => mi.id === m.menuItemId)!,
  }))

  return { unit, todayAgg, monthAgg, openOrders, lowStock, topMenus }
}

const ORDER_STATUS_STYLE: Record<string, string> = {
  OPEN:   'border-amber-300 bg-amber-50',
  BILLED: 'border-blue-400 bg-blue-50',
}
const ORDER_STATUS_BADGE: Record<string, string> = {
  OPEN:   'bg-amber-100 text-amber-700',
  BILLED: 'bg-blue-100 text-blue-700',
}
const ORDER_STATUS_LABEL: Record<string, string> = {
  OPEN: 'Open', BILLED: 'Tagihan',
}

export default async function RestoranPage() {
  const session = await getSession()
  if (!session) redirect('/login')

  const data = await getRestoranData()
  if (!data) return <p className="text-red-500">Unit Restoran tidak ditemukan.</p>

  const { unit, todayAgg, monthAgg, openOrders, lowStock, topMenus } = data

  // Semua nomor meja yang sedang aktif
  const activeTables = new Set(openOrders.map((o) => o.tableNumber))

  // Daftar meja (1–20, bisa dikonfigurasi)
  const TABLE_NUMBERS = Array.from({ length: 12 }, (_, i) => String(i + 1))

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{unit.name}</h1>
          <p className="text-sm text-gray-500 mt-0.5">{unit.location}</p>
        </div>
        <div className="flex gap-3">
          <Link
            href="/restoran/menu"
            className="px-4 py-2.5 text-sm font-medium border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Kelola Menu
          </Link>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Omzet Hari Ini', value: formatRupiah(Number(todayAgg._sum.total ?? 0)), sub: `${todayAgg._count} order`, color: 'bg-orange-500' },
          { label: 'Omzet Bulan Ini', value: formatRupiah(Number(monthAgg._sum.total ?? 0)), sub: `${monthAgg._count} order`, color: 'bg-red-500' },
          { label: 'Meja Aktif', value: openOrders.length.toString(), sub: `dari ${TABLE_NUMBERS.length} meja`, color: openOrders.length > 0 ? 'bg-amber-500' : 'bg-gray-400' },
          { label: 'Bahan Menipis', value: lowStock.length.toString(), sub: 'perlu restok', color: lowStock.length > 0 ? 'bg-red-500' : 'bg-gray-400' },
        ].map((s) => (
          <div key={s.label} className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 flex items-start gap-4">
            <div className={`w-10 h-10 ${s.color} rounded-lg flex-shrink-0`} />
            <div>
              <p className="text-xs text-gray-500 font-medium">{s.label}</p>
              <p className="text-xl font-bold text-gray-900 mt-0.5">{s.value}</p>
              <p className="text-xs text-gray-400 mt-0.5">{s.sub}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Grid Meja */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-gray-100 shadow-sm">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="font-semibold text-gray-900">Status Meja</h2>
            <div className="flex items-center gap-3 text-xs text-gray-500">
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-gray-200 inline-block" /> Kosong</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-amber-400 inline-block" /> Open</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-blue-400 inline-block" /> Tagihan</span>
            </div>
          </div>
          <div className="p-5 grid grid-cols-3 sm:grid-cols-4 gap-3">
            {TABLE_NUMBERS.map((tableNum) => {
              const order = openOrders.find((o) => o.tableNumber === tableNum)
              const isActive = !!order

              return isActive && order ? (
                <Link
                  key={tableNum}
                  href={`/restoran/meja/${order.id}`}
                  className={`rounded-xl border-2 p-3.5 transition-all hover:shadow-md ${ORDER_STATUS_STYLE[order.status]}`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <p className="font-bold text-gray-900 text-base">Meja {tableNum}</p>
                    <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${ORDER_STATUS_BADGE[order.status]}`}>
                      {ORDER_STATUS_LABEL[order.status]}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500">{order.items.length} item</p>
                  <p className="text-sm font-semibold text-gray-800 mt-1">
                    {formatRupiah(Number(order.total))}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {formatDateTime(order.openedAt)}
                  </p>
                </Link>
              ) : (
                <BukaMejaButton key={tableNum} tableNumber={tableNum} />
              )
            })}
          </div>
        </div>

        {/* Kanan: Top Menu + Bahan Menipis */}
        <div className="space-y-4">
          {/* Menu Terlaris Hari Ini */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
            <div className="px-5 py-4 border-b border-gray-100">
              <h2 className="font-semibold text-gray-900">Terlaris Hari Ini</h2>
            </div>
            <div className="divide-y divide-gray-50">
              {topMenus.length === 0 && (
                <p className="px-5 py-6 text-sm text-gray-400 text-center">Belum ada order hari ini</p>
              )}
              {topMenus.map((m, i) => (
                <div key={m.menuItem.id} className="px-5 py-3 flex items-center gap-3">
                  <span className="w-6 h-6 rounded-full bg-orange-100 text-orange-600 text-xs font-bold flex items-center justify-center flex-shrink-0">
                    {i + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{m.menuItem.name}</p>
                    <p className="text-xs text-gray-400">{formatRupiah(Number(m.menuItem.price))}</p>
                  </div>
                  <span className="text-sm font-bold text-gray-700">×{m.qty}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Bahan Baku Menipis */}
          {lowStock.length > 0 && (
            <div className="bg-white rounded-xl border border-red-100 shadow-sm">
              <div className="px-5 py-4 border-b border-red-100">
                <h2 className="font-semibold text-red-700">⚠ Bahan Menipis</h2>
              </div>
              <div className="divide-y divide-gray-50">
                {lowStock.map((p) => (
                  <div key={p.id} className="px-5 py-3">
                    <p className="text-sm font-medium text-gray-900">{p.name}</p>
                    <p className="text-xs text-red-600 font-semibold mt-0.5">
                      Sisa {p.stock} {p.unit} / min {p.minStock} {p.unit}
                    </p>
                  </div>
                ))}
              </div>
              <div className="px-5 py-3 border-t border-gray-100">
                <Link href="/restoran/bahan-baku" className="text-xs text-blue-600 font-medium hover:underline">
                  Kelola Bahan Baku →
                </Link>
              </div>
            </div>
          )}

          {/* Quick Links */}
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: 'Menu', href: '/restoran/menu', icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2' },
              { label: 'Bahan Baku', href: '/restoran/bahan-baku', icon: 'M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4' },
              { label: 'Riwayat', href: '/restoran/riwayat', icon: 'M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z' },
            ].map((nav) => (
              <Link
                key={nav.href}
                href={nav.href}
                className="bg-white border border-gray-100 shadow-sm rounded-xl p-4 flex flex-col items-center gap-2 hover:border-orange-300 hover:shadow-md transition-all group"
              >
                <div className="w-9 h-9 bg-orange-50 rounded-lg flex items-center justify-center group-hover:bg-orange-100 transition-colors">
                  <svg className="w-5 h-5 text-orange-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                    <path strokeLinecap="round" strokeLinejoin="round" d={nav.icon} />
                  </svg>
                </div>
                <span className="text-xs font-medium text-gray-700">{nav.label}</span>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}


