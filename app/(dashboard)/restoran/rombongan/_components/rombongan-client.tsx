'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { formatRupiah, formatDateTime } from '@/lib/utils'

type GroupOrderLite = {
  id: string
  orderCode: string
  customerName: string
  customerPhone: string | null
  eventDate: string
  pax: number
  menuType: string
  customMenu: string | null
  pricePerPax: number
  totalPrice: number
  dpAmount: number
  paidAmount: number
  status: string
  note: string | null
}

const STATUS_BADGE: Record<string, string> = {
  PENDING:   'bg-amber-100 text-amber-700',
  CONFIRMED: 'bg-blue-100 text-blue-700',
  COMPLETED: 'bg-emerald-100 text-emerald-700',
  CANCELLED: 'bg-gray-100 text-gray-500',
}
const STATUS_LABEL: Record<string, string> = {
  PENDING: 'Pending', CONFIRMED: 'Terkonfirmasi', COMPLETED: 'Selesai', CANCELLED: 'Batal',
}

export function RombonganClient({ orders }: { orders: GroupOrderLite[] }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [showForm, setShowForm] = useState(false)

  // Form
  const [customerName, setCustomerName] = useState('')
  const [customerPhone, setCustomerPhone] = useState('')
  const [eventDate, setEventDate] = useState('')
  const [pax, setPax] = useState('')
  const [menuType, setMenuType] = useState('')
  const [customMenu, setCustomMenu] = useState('')
  const [pricePerPax, setPricePerPax] = useState('')
  const [dpAmount, setDpAmount] = useState('')
  const [note, setNote] = useState('')

  const total = (parseInt(pax) || 0) * (parseFloat(pricePerPax) || 0)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      const res = await fetch('/api/restoran/rombongan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerName,
          customerPhone: customerPhone || null,
          eventDate,
          pax: parseInt(pax),
          menuType,
          customMenu: customMenu || null,
          pricePerPax: parseFloat(pricePerPax),
          dpAmount: parseFloat(dpAmount) || 0,
          note: note || null,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        alert(data.error ?? 'Gagal menyimpan pesanan')
        return
      }
      setCustomerName(''); setCustomerPhone(''); setEventDate(''); setPax('')
      setMenuType(''); setCustomMenu(''); setPricePerPax(''); setDpAmount(''); setNote('')
      setShowForm(false)
      router.refresh()
    } finally {
      setLoading(false)
    }
  }

  async function updateStatus(id: string, status: string) {
    const label = STATUS_LABEL[status] ?? status
    if (!confirm(`Ubah status pesanan menjadi "${label}"?`)) return
    setLoading(true)
    try {
      const res = await fetch(`/api/restoran/rombongan/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })
      if (!res.ok) {
        const data = await res.json()
        alert(data.error ?? 'Gagal mengubah status')
        return
      }
      router.refresh()
    } finally {
      setLoading(false)
    }
  }

  async function addPayment(id: string, sisa: number) {
    const input = prompt(`Sisa tagihan ${formatRupiah(sisa)}.\nJumlah pembayaran (Rp):`)
    if (!input) return
    const amount = parseFloat(input)
    if (isNaN(amount) || amount <= 0) {
      alert('Jumlah tidak valid')
      return
    }
    setLoading(true)
    try {
      const res = await fetch(`/api/restoran/rombongan/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ addPayment: amount }),
      })
      if (!res.ok) {
        const data = await res.json()
        alert(data.error ?? 'Gagal mencatat pembayaran')
        return
      }
      router.refresh()
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <Link href="/restoran" className="text-gray-400 hover:text-gray-600 transition-colors" aria-label="Kembali">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          <div className="min-w-0">
            <h1 className="text-xl md:text-2xl font-bold text-gray-900 truncate">Pesan Rombongan</h1>
            <p className="text-xs md:text-sm text-gray-500">Pesanan grup — jumlah pax, jenis menu & custom menu</p>
          </div>
        </div>
        <button
          onClick={() => setShowForm((v) => !v)}
          className="flex-shrink-0 px-3 py-2 text-xs md:text-sm font-semibold bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors whitespace-nowrap"
        >
          {showForm ? 'Tutup Form' : '+ Pesanan Baru'}
        </button>
      </div>

      {/* Form pesanan baru */}
      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 md:p-5 space-y-3">
          <h2 className="font-semibold text-gray-900 text-sm md:text-base">Pesanan Rombongan Baru</h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Nama Pemesan *</label>
              <input
                type="text" required value={customerName} onChange={(e) => setCustomerName(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">No. HP</label>
              <input
                type="tel" value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Tanggal & Jam Acara *</label>
              <input
                type="datetime-local" required value={eventDate} onChange={(e) => setEventDate(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Jumlah Pax *</label>
              <input
                type="number" min="1" required value={pax} onChange={(e) => setPax(e.target.value)}
                placeholder="mis. 50"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Jenis Menu *</label>
              <input
                type="text" required value={menuType} onChange={(e) => setMenuType(e.target.value)}
                placeholder="mis. Paket A / Prasmanan / Nasi Kotak"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Harga per Pax *</label>
              <input
                type="number" min="0" step="1" required value={pricePerPax} onChange={(e) => setPricePerPax(e.target.value)}
                placeholder="mis. 35000"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Custom Menu / Permintaan Khusus</label>
            <textarea
              value={customMenu} onChange={(e) => setCustomMenu(e.target.value)} rows={2}
              placeholder="mis. tanpa pedas 10 porsi, tambah es teh manis, menu vegetarian 5 pax"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">DP (Rp)</label>
              <input
                type="number" min="0" step="1" value={dpAmount} onChange={(e) => setDpAmount(e.target.value)}
                placeholder="0"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Catatan</label>
              <input
                type="text" value={note} onChange={(e) => setNote(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>
          </div>

          <div className="flex items-center justify-between border-t border-gray-100 pt-3">
            <div>
              <p className="text-xs text-gray-500">Total ({pax || 0} pax × {formatRupiah(parseFloat(pricePerPax) || 0)})</p>
              <p className="text-lg font-bold text-gray-900">{formatRupiah(total)}</p>
            </div>
            <button
              type="submit" disabled={loading}
              className="px-5 py-2.5 bg-orange-600 text-white rounded-lg text-sm font-semibold hover:bg-orange-700 transition-colors disabled:opacity-50"
            >
              {loading ? 'Menyimpan...' : 'Simpan Pesanan'}
            </button>
          </div>
        </form>
      )}

      {/* Daftar pesanan */}
      <div className="space-y-3">
        {orders.length === 0 && (
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-8 text-center text-gray-400 text-sm">
            Belum ada pesanan rombongan
          </div>
        )}
        {orders.map((o) => {
          const sisa = o.totalPrice - o.paidAmount
          return (
            <div key={o.id} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 md:p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-bold text-gray-900">{o.customerName}</p>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_BADGE[o.status]}`}>
                      {STATUS_LABEL[o.status]}
                    </span>
                    <span className="text-xs text-gray-400">{o.orderCode}</span>
                  </div>
                  <p className="text-sm text-gray-600 mt-1">
                    {formatDateTime(o.eventDate)} · <span className="font-semibold">{o.pax} pax</span> · {o.menuType}
                  </p>
                  {o.customMenu && (
                    <p className="text-xs text-gray-500 mt-1 bg-orange-50 border border-orange-100 rounded-lg px-2 py-1 inline-block">
                      Custom: {o.customMenu}
                    </p>
                  )}
                  {o.customerPhone && <p className="text-xs text-gray-400 mt-1">☎ {o.customerPhone}</p>}
                  {o.note && <p className="text-xs text-gray-400 mt-0.5">{o.note}</p>}
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-xs text-gray-500">{formatRupiah(o.pricePerPax)} / pax</p>
                  <p className="text-lg font-bold text-gray-900">{formatRupiah(o.totalPrice)}</p>
                  <p className={`text-xs font-semibold ${sisa <= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                    {sisa <= 0 ? 'Lunas' : `Sisa ${formatRupiah(sisa)}`}
                  </p>
                  {o.paidAmount > 0 && sisa > 0 && (
                    <p className="text-xs text-gray-400">Dibayar {formatRupiah(o.paidAmount)}</p>
                  )}
                </div>
              </div>

              {/* Aksi */}
              {o.status !== 'CANCELLED' && o.status !== 'COMPLETED' && (
                <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-gray-50">
                  {o.status === 'PENDING' && (
                    <button
                      onClick={() => updateStatus(o.id, 'CONFIRMED')}
                      disabled={loading}
                      className="px-3 py-1.5 text-xs font-semibold border border-blue-200 text-blue-700 rounded-lg hover:bg-blue-50 transition-colors disabled:opacity-50"
                    >
                      Konfirmasi
                    </button>
                  )}
                  {sisa > 0 && (
                    <button
                      onClick={() => addPayment(o.id, sisa)}
                      disabled={loading}
                      className="px-3 py-1.5 text-xs font-semibold border border-emerald-200 text-emerald-700 rounded-lg hover:bg-emerald-50 transition-colors disabled:opacity-50"
                    >
                      + Pembayaran
                    </button>
                  )}
                  <button
                    onClick={() => updateStatus(o.id, 'COMPLETED')}
                    disabled={loading}
                    className="px-3 py-1.5 text-xs font-semibold border border-gray-200 text-gray-600 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
                  >
                    Tandai Selesai
                  </button>
                  <button
                    onClick={() => updateStatus(o.id, 'CANCELLED')}
                    disabled={loading}
                    className="px-3 py-1.5 text-xs font-semibold border border-red-200 text-red-600 rounded-lg hover:bg-red-50 transition-colors disabled:opacity-50"
                  >
                    Batalkan
                  </button>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
