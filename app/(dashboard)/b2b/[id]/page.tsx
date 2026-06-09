'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { formatRupiah, formatDate, formatDateTime } from '@/lib/utils'
import Link from 'next/link'

const STATUS_BADGE: Record<string, string> = {
  DRAFT:     'bg-gray-100 text-gray-600 border-gray-200',
  SENT:      'bg-blue-100 text-blue-700 border-blue-200',
  PARTIAL:   'bg-yellow-100 text-yellow-700 border-yellow-200',
  PAID:      'bg-green-100 text-green-700 border-green-200',
  CANCELLED: 'bg-red-100 text-red-600 border-red-200',
}
const STATUS_LABEL: Record<string, string> = {
  DRAFT: 'Draft', SENT: 'Terkirim', PARTIAL: 'Sebagian Dibayar', PAID: 'Lunas', CANCELLED: 'Dibatalkan',
}

type Invoice = {
  id: string; invoiceNumber: string; status: string
  sellerUnit: { name: string }; buyerUnit: { name: string }
  subtotal: number; discount: number; taxRate: number; tax: number; total: number; paidAmount: number
  dueDate: string | null; paidAt: string | null; note: string | null; createdAt: string
  items: { id: string; productName: string; productUnit: string; qty: number; price: number; subtotal: number }[]
}

export default function B2BDetailPage() {
  const params = useParams()
  const router = useRouter()
  const [invoice, setInvoice] = useState<Invoice | null>(null)
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)

  const [showPayModal, setShowPayModal] = useState(false)
  const [payAmount, setPayAmount] = useState('')
  const [payError,  setPayError]  = useState('')

  useEffect(() => {
    fetch(`/api/b2b/invoice/${(await paramsPromise).id}`)
      .then((r) => r.json())
      .then((data) => { setInvoice(data); setLoading(false) })
  }, [(await paramsPromise).id])

  async function handleAction(action: string, paidAmount?: number) {
    setActionLoading(true)
    const res = await fetch(`/api/b2b/invoice/${(await paramsPromise).id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, paidAmount }),
    })
    const data = await res.json()
    setActionLoading(false)
    if (res.ok) { setInvoice(data); setShowPayModal(false) }
    else setPayError(data.error ?? 'Gagal')
  }

  if (loading) return <div className="p-8 text-center text-gray-400">Memuat...</div>
  if (!invoice) return <div className="p-8 text-center text-red-500">Invoice tidak ditemukan</div>

  const remaining = invoice.total - invoice.paidAmount

  return (
    <div className="space-y-5 max-w-4xl mx-auto">
      {/* Breadcrumb */}
      <div className="flex items-center gap-3">
        <Link href="/b2b" className="text-sm text-gray-500 hover:text-indigo-600">← Semua Invoice</Link>
        <span className="text-gray-300">/</span>
        <p className="text-sm font-medium text-gray-700">{invoice.invoiceNumber}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Detail utama */}
        <div className="md:col-span-2 space-y-5">
          {/* Header */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
            <div className="flex items-start justify-between flex-wrap gap-3 mb-4">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">{invoice.invoiceNumber}</h1>
                <p className="text-sm text-gray-500 mt-0.5">
                  {invoice.sellerUnit.name} → {invoice.buyerUnit.name}
                </p>
                <p className="text-xs text-gray-400 mt-0.5">Dibuat: {formatDateTime(new Date(invoice.createdAt))}</p>
              </div>
              <span className={`text-sm px-3 py-1.5 rounded-full font-semibold border ${STATUS_BADGE[invoice.status]}`}>
                {STATUS_LABEL[invoice.status]}
              </span>
            </div>
            {invoice.dueDate && (
              <p className="text-sm text-gray-500">Jatuh Tempo: <strong>{formatDate(new Date(invoice.dueDate))}</strong></p>
            )}
            {invoice.note && <p className="text-sm text-gray-500 mt-1">{invoice.note}</p>}
          </div>

          {/* Items table */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-5 py-3 border-b border-gray-100">
              <h2 className="text-sm font-semibold text-gray-700">Item</h2>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-gray-500 uppercase border-b border-gray-100">
                  <th className="px-5 py-2.5 text-left font-semibold">Produk</th>
                  <th className="px-5 py-2.5 text-right font-semibold">Qty</th>
                  <th className="px-5 py-2.5 text-right font-semibold">Harga</th>
                  <th className="px-5 py-2.5 text-right font-semibold">Subtotal</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {invoice.items.map((item) => (
                  <tr key={item.id}>
                    <td className="px-5 py-3">
                      <p className="font-medium text-gray-800">{item.productName}</p>
                      <p className="text-xs text-gray-400">{item.productUnit}</p>
                    </td>
                    <td className="px-5 py-3 text-right">{item.qty}</td>
                    <td className="px-5 py-3 text-right">{formatRupiah(item.price)}</td>
                    <td className="px-5 py-3 text-right font-semibold">{formatRupiah(item.subtotal)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="border-t border-gray-200 bg-gray-50">
                {invoice.discount > 0 && (
                  <tr>
                    <td colSpan={3} className="px-5 py-2 text-right text-sm text-gray-500">Diskon</td>
                    <td className="px-5 py-2 text-right text-red-600 font-medium">−{formatRupiah(invoice.discount)}</td>
                  </tr>
                )}
                {invoice.taxRate > 0 && (
                  <tr>
                    <td colSpan={3} className="px-5 py-2 text-right text-sm text-gray-500">PPN {invoice.taxRate}%</td>
                    <td className="px-5 py-2 text-right font-medium">{formatRupiah(invoice.tax)}</td>
                  </tr>
                )}
                <tr>
                  <td colSpan={3} className="px-5 py-3 text-right font-bold text-gray-700">Total</td>
                  <td className="px-5 py-3 text-right font-bold text-lg text-gray-900">{formatRupiah(invoice.total)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        {/* Aksi */}
        <div className="space-y-5">
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
            <h2 className="text-sm font-semibold text-gray-700 mb-4">Aksi</h2>
            <div className="space-y-2.5">
              {invoice.status === 'DRAFT' && (
                <button onClick={() => handleAction('send')} disabled={actionLoading}
                  className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold transition-colors disabled:opacity-50">
                  Kirim Invoice
                </button>
              )}
              {['SENT', 'PARTIAL'].includes(invoice.status) && (
                <button onClick={() => setShowPayModal(true)}
                  className="w-full py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-xl text-sm font-semibold transition-colors">
                  Catat Pembayaran
                </button>
              )}
              {['DRAFT', 'SENT'].includes(invoice.status) && (
                <button onClick={() => handleAction('cancel')} disabled={actionLoading}
                  className="w-full py-2.5 bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 rounded-xl text-sm font-semibold transition-colors disabled:opacity-50">
                  Batalkan
                </button>
              )}
              {['PAID', 'CANCELLED'].includes(invoice.status) && (
                <p className="text-xs text-gray-400 text-center">Invoice sudah final</p>
              )}
            </div>
          </div>

          <div className="bg-indigo-50 rounded-xl border border-indigo-200 p-4 space-y-2">
            <p className="text-xs font-semibold text-indigo-700 uppercase">Pembayaran</p>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Total</span>
              <span className="font-semibold">{formatRupiah(invoice.total)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Terbayar</span>
              <span className="font-semibold text-green-700">{formatRupiah(invoice.paidAmount)}</span>
            </div>
            {remaining > 0 ? (
              <div className="flex justify-between text-sm font-bold text-red-600 border-t border-indigo-200 pt-2">
                <span>Sisa</span>
                <span>{formatRupiah(remaining)}</span>
              </div>
            ) : invoice.status === 'PAID' ? (
              <p className="text-xs text-center text-green-600 font-semibold border-t border-indigo-200 pt-2">✓ Lunas{invoice.paidAt ? ` · ${formatDate(new Date(invoice.paidAt))}` : ''}</p>
            ) : null}
          </div>

          {invoice.status === 'PAID' && (
            <div className="bg-emerald-50 rounded-xl border border-emerald-200 p-4">
              <p className="text-xs text-emerald-700 font-semibold">Stok Toko Sudah Dikurangi</p>
              <p className="text-xs text-emerald-600 mt-1">StockMovement OUT telah dibuat untuk setiap item saat pembayaran penuh diterima.</p>
            </div>
          )}
        </div>
      </div>

      {/* Payment Modal */}
      {showPayModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Catat Pembayaran</h3>
            <p className="text-sm text-gray-500 mb-4">Sisa tagihan: <strong>{formatRupiah(remaining)}</strong></p>
            <div className="space-y-3">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Jumlah Bayar (Rp)</label>
                <input type="number" min={1} value={payAmount} onChange={(e) => setPayAmount(e.target.value)}
                  placeholder={String(remaining)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" />
                <button type="button" onClick={() => setPayAmount(String(remaining))}
                  className="mt-1 text-xs text-indigo-600 hover:underline">
                  Isi jumlah penuh ({formatRupiah(remaining)})
                </button>
              </div>
              {payError && <p className="text-sm text-red-600">{payError}</p>}
            </div>
            <div className="flex gap-3 mt-5">
              <button type="button" onClick={() => { setShowPayModal(false); setPayError('') }}
                className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-50">
                Batal
              </button>
              <button type="button" disabled={!payAmount || actionLoading}
                onClick={() => handleAction('pay', Number(payAmount))}
                className="flex-1 py-2.5 bg-green-600 hover:bg-green-700 disabled:bg-green-300 text-white rounded-xl text-sm font-semibold">
                {actionLoading ? 'Memproses...' : 'Simpan'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}




