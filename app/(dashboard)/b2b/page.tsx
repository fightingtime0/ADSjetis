import { getSession } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { formatRupiah, formatDate } from '@/lib/utils'
import Link from 'next/link'

const STATUS_BADGE: Record<string, string> = {
  DRAFT:     'bg-gray-100 text-gray-600',
  SENT:      'bg-blue-100 text-blue-700',
  PARTIAL:   'bg-yellow-100 text-yellow-700',
  PAID:      'bg-green-100 text-green-700',
  CANCELLED: 'bg-red-100 text-red-600',
}
const STATUS_LABEL: Record<string, string> = {
  DRAFT: 'Draft', SENT: 'Terkirim', PARTIAL: 'Sebagian', PAID: 'Lunas', CANCELLED: 'Dibatalkan',
}

export default async function B2BPage({
  searchParams: searchParamsRaw,
}: {
  searchParams: Promise<{ status?: string; page?: string }>
}) {
  const searchParams = await searchParamsRaw
  const session = await getSession()
  if (!session) redirect('/login')
  if (!['OWNER', 'MANAGER'].includes(session.user.role)) redirect('/dashboard')

  const filterStatus = searchParams.status as any ?? undefined
  const page   = parseInt(searchParams.page ?? '1')
  const limit  = 25

  const where = filterStatus ? { status: filterStatus } : {}

  const [invoices, total, summary] = await Promise.all([
    prisma.b2BInvoice.findMany({
      where,
      include: {
        sellerUnit: { select: { name: true } },
        buyerUnit:  { select: { name: true } },
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.b2BInvoice.count({ where }),
    prisma.b2BInvoice.groupBy({
      by: ['status'],
      _count: { id: true },
      _sum:   { total: true },
    }),
  ])

  const totalPages = Math.ceil(total / limit)
  const statuses   = ['DRAFT', 'SENT', 'PARTIAL', 'PAID', 'CANCELLED']

  const paidTotal = summary.find((s) => s.status === 'PAID')?._sum.total ?? 0
  const sentTotal = summary.find((s) => s.status === 'SENT')?._sum.total ?? 0

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-xl md:text-2xl font-bold text-gray-900 truncate">B2B Invoice</h1>
          <p className="text-xs md:text-sm text-gray-500 mt-0.5">Toko → Restoran · inter-unit</p>
        </div>
        <Link href="/b2b/baru"
          className="flex-shrink-0 inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold px-3 md:px-4 py-2 md:py-2.5 rounded-lg transition-colors whitespace-nowrap">
          + Buat Invoice
        </Link>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Total Invoice', value: String(total), sub: 'semua status', color: 'text-gray-800' },
          { label: 'Sudah Lunas', value: String(summary.find((s) => s.status === 'PAID')?._count.id ?? 0), sub: formatRupiah(Number(paidTotal)), color: 'text-green-600' },
          { label: 'Menunggu Bayar', value: String(summary.find((s) => s.status === 'SENT')?._count.id ?? 0), sub: formatRupiah(Number(sentTotal)), color: 'text-blue-600' },
          { label: 'Draft', value: String(summary.find((s) => s.status === 'DRAFT')?._count.id ?? 0), sub: 'belum dikirim', color: 'text-gray-500' },
        ].map((s) => (
          <div key={s.label} className="bg-white rounded-xl border border-gray-100 shadow-sm px-3 md:px-5 py-3 md:py-4">
            <p className="text-xs text-gray-500 font-medium leading-tight">{s.label}</p>
            <p className={`text-xl md:text-2xl font-bold mt-1 ${s.color}`}>{s.value}</p>
            <p className="text-xs text-gray-400 mt-0.5 truncate">{s.sub}</p>
          </div>
        ))}
      </div>

      {/* Filter */}
      <div className="flex gap-2 flex-wrap">
        {[undefined, ...statuses].map((s) => (
          <Link key={s ?? 'all'} href={s ? `?status=${s}` : '?'}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
              filterStatus === s
                ? 'bg-gray-900 text-white border-gray-900'
                : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400'
            }`}>
            {s ? STATUS_LABEL[s] : 'Semua'}
          </Link>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-left text-xs text-gray-500 uppercase tracking-wide">
                <th className="px-5 py-3 font-semibold">No. Invoice</th>
                <th className="px-5 py-3 font-semibold">Dari</th>
                <th className="px-5 py-3 font-semibold">Ke</th>
                <th className="px-5 py-3 font-semibold">Jatuh Tempo</th>
                <th className="px-5 py-3 font-semibold">Status</th>
                <th className="px-5 py-3 font-semibold text-right">Total</th>
                <th className="px-5 py-3 font-semibold text-right">Terbayar</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {invoices.length === 0 && (
                <tr><td colSpan={7} className="px-5 py-12 text-center text-sm text-gray-400">Tidak ada invoice</td></tr>
              )}
              {invoices.map((inv) => (
                <tr key={inv.id} className="hover:bg-gray-50">
                  <td className="px-5 py-3.5">
                    <Link href={`/b2b/${inv.id}`}
                      className="font-medium text-indigo-600 hover:underline text-xs">
                      {inv.invoiceNumber}
                    </Link>
                    <p className="text-xs text-gray-400 mt-0.5">{formatDate(inv.createdAt)}</p>
                  </td>
                  <td className="px-5 py-3.5 text-gray-700">{inv.sellerUnit.name}</td>
                  <td className="px-5 py-3.5 text-gray-700">{inv.buyerUnit.name}</td>
                  <td className="px-5 py-3.5 text-gray-500">{inv.dueDate ? formatDate(inv.dueDate) : '—'}</td>
                  <td className="px-5 py-3.5">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_BADGE[inv.status]}`}>
                      {STATUS_LABEL[inv.status]}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-right font-semibold">{formatRupiah(Number(inv.total))}</td>
                  <td className="px-5 py-3.5 text-right">
                    {Number(inv.paidAmount) >= Number(inv.total) ? (
                      <span className="text-green-600 font-medium">Lunas</span>
                    ) : Number(inv.paidAmount) > 0 ? (
                      <span className="text-yellow-600 font-medium">{formatRupiah(Number(inv.paidAmount))}</span>
                    ) : (
                      <span className="text-gray-400">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {totalPages > 1 && (
          <div className="px-5 py-3 border-t border-gray-100 flex items-center justify-between text-sm text-gray-600">
            <span>Halaman {page} dari {totalPages}</span>
            <div className="flex gap-2">
              {page > 1 && <Link href={`?${filterStatus ? `status=${filterStatus}&` : ''}page=${page - 1}`} className="px-3 py-1 rounded border border-gray-200 hover:bg-gray-50">← Sebelumnya</Link>}
              {page < totalPages && <Link href={`?${filterStatus ? `status=${filterStatus}&` : ''}page=${page + 1}`} className="px-3 py-1 rounded border border-gray-200 hover:bg-gray-50">Berikutnya →</Link>}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}




