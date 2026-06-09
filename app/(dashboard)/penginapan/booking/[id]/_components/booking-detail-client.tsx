'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { formatRupiah, formatDate, formatDateTime } from '@/lib/utils'

type Payment = { id: string; amount: number; method: string; type: string; note: string | null; paidAt: string }
type Booking = {
  id: string; bookingCode: string
  guestName: string; guestPhone: string | null; guestEmail: string | null; guestIdNum: string | null
  checkIn: string; checkOut: string; totalNights: number
  pricePerNight: number; totalPrice: number; dpAmount: number; paidAmount: number
  extraBed: number; extraBedPrice: number
  status: string; source: string | null; note: string | null; createdAt: string
  room: { id: string; name: string; floor: number | null; roomType: { name: string } | null; facilities: string[] }
  payments: Payment[]
}
type NightBreakdown = { date: string; dayType: string; label: string; price: number }

const STATUS_FLOW: Record<string, { next: string; label: string; color: string } | null> = {
  PENDING:    { next: 'CONFIRMED',  label: 'Konfirmasi',  color: 'bg-blue-600 hover:bg-blue-700' },
  CONFIRMED:  { next: 'CHECKED_IN', label: 'Check-in',    color: 'bg-green-600 hover:bg-green-700' },
  CHECKED_IN: { next: 'CHECKED_OUT',label: 'Check-out',   color: 'bg-purple-600 hover:bg-purple-700' },
  CHECKED_OUT: null,
  CANCELLED:  null,
}
const STATUS_BADGE: Record<string, string> = {
  PENDING:    'bg-yellow-100 text-yellow-700',
  CONFIRMED:  'bg-blue-100 text-blue-700',
  CHECKED_IN: 'bg-green-100 text-green-700',
  CHECKED_OUT:'bg-gray-100 text-gray-600',
  CANCELLED:  'bg-red-100 text-red-600',
}
const STATUS_LABEL: Record<string, string> = {
  PENDING: 'Pending', CONFIRMED: 'Terkonfirmasi', CHECKED_IN: 'Check-in',
  CHECKED_OUT: 'Check-out', CANCELLED: 'Dibatalkan',
}
const PAYMENT_LABEL: Record<string, string> = {
  CASH: 'Tunai', TRANSFER: 'Transfer', QRIS: 'QRIS', CARD: 'Kartu', OTHER: 'Lainnya',
}
const PAY_TYPE_LABEL: Record<string, string> = { DP: 'DP', FULL: 'Pelunasan', REFUND: 'Refund' }
const PAY_TYPE_COLOR: Record<string, string> = {
  DP: 'bg-blue-100 text-blue-700',
  FULL: 'bg-green-100 text-green-700',
  REFUND: 'bg-red-100 text-red-600',
}

const PAYMENT_METHODS = ['CASH', 'TRANSFER', 'QRIS', 'CARD']

export function BookingDetailClient({ booking: initialBooking, breakdown }: { booking: Booking; breakdown: NightBreakdown[] }) {
  const router = useRouter()
  const [booking, setBooking] = useState(initialBooking)
  const [showPayForm, setShowPayForm] = useState(false)
  const [payAmount, setPayAmount]     = useState('')
  const [payMethod, setPayMethod]     = useState('CASH')
  const [payType, setPayType]         = useState<'DP'|'FULL'|'REFUND'>('FULL')
  const [payNote, setPayNote]         = useState('')
  const [paying, setPaying]           = useState(false)
  const [payError, setPayError]       = useState('')
  const [statusLoading, setStatusLoading] = useState(false)

  const remaining = booking.totalPrice - booking.paidAmount
  const isFullyPaid = remaining <= 0

  // Grouped price breakdown
  const groupedBreakdown = breakdown.reduce((acc, n) => {
    const key = `${n.label}__${n.price}`
    if (!acc[key]) acc[key] = { label: n.label, price: n.price, count: 0, subtotal: 0 }
    acc[key].count++; acc[key].subtotal += n.price
    return acc
  }, {} as Record<string, { label: string; price: number; count: number; subtotal: number }>)

  async function handleStatusChange(newStatus: string) {
    setStatusLoading(true)
    try {
      const res = await fetch(`/api/penginapan/booking/${booking.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })
      if (!res.ok) { const e = await res.json(); alert(e.error); return }
      setBooking((prev) => ({ ...prev, status: newStatus }))
      router.refresh()
    } finally {
      setStatusLoading(false)
    }
  }

  async function handleCancel() {
    if (!confirm(`Batalkan booking ${booking.bookingCode}? Tindakan ini tidak dapat dibatalkan.`)) return
    await handleStatusChange('CANCELLED')
  }

  async function handleAddPayment(e: React.FormEvent) {
    e.preventDefault()
    setPayError('')
    const amount = parseFloat(payAmount)
    if (!amount || amount <= 0) { setPayError('Masukkan jumlah bayar'); return }

    setPaying(true)
    try {
      const res = await fetch(`/api/penginapan/booking/${booking.id}/pembayaran`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount, method: payMethod, type: payType, note: payNote || null }),
      })
      if (!res.ok) { const e = await res.json(); setPayError(e.error ?? 'Gagal'); return }

      const payment = await res.json()
      const newPaid = payType === 'REFUND'
        ? Math.max(0, booking.paidAmount - amount)
        : booking.paidAmount + amount

      setBooking((prev) => ({
        ...prev,
        paidAmount: newPaid,
        payments: [...prev.payments, payment],
      }))
      setShowPayForm(false)
      setPayAmount(''); setPayNote('')
    } finally {
      setPaying(false)
    }
  }

  const nextStatus = STATUS_FLOW[booking.status]

  return (
    <div className="space-y-5 max-w-4xl">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-bold text-gray-900">{booking.bookingCode}</h1>
            <span className={`text-sm px-3 py-1 rounded-full font-semibold ${STATUS_BADGE[booking.status]}`}>
              {STATUS_LABEL[booking.status]}
            </span>
          </div>
          <p className="text-sm text-gray-500 mt-0.5">Dibuat {formatDateTime(booking.createdAt)}</p>
        </div>
        <div className="flex gap-2 flex-wrap justify-end">
          {nextStatus && (
            <button
              onClick={() => handleStatusChange(nextStatus.next)}
              disabled={statusLoading || (nextStatus.next === 'CHECKED_OUT' && !isFullyPaid && !confirm('Belum lunas. Lanjutkan check-out?'))}
              className={`px-4 py-2 text-sm font-semibold text-white rounded-lg transition-colors disabled:opacity-50 ${nextStatus.color}`}
            >
              {statusLoading ? '...' : nextStatus.label}
            </button>
          )}
          {['PENDING', 'CONFIRMED'].includes(booking.status) && (
            <button onClick={handleCancel}
              className="px-4 py-2 text-sm font-medium text-red-600 border border-red-200 rounded-lg hover:bg-red-50 transition-colors">
              Batalkan
            </button>
          )}
          <button onClick={() => router.push('/penginapan')}
            className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
            ← Kembali
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Kiri: Info Booking */}
        <div className="lg:col-span-2 space-y-4">

          {/* Kamar & Tanggal */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
            <h2 className="font-semibold text-gray-900 mb-4">Detail Kamar</h2>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-xs text-gray-500 mb-1">Kamar</p>
                <p className="font-semibold text-gray-900">Kamar {booking.room.name}</p>
                {booking.room.roomType && <p className="text-gray-500">{booking.room.roomType.name}</p>}
              </div>
              {booking.room.floor !== null && (
                <div>
                  <p className="text-xs text-gray-500 mb-1">Lantai</p>
                  <p className="font-medium text-gray-900">{booking.room.floor}</p>
                </div>
              )}
              <div>
                <p className="text-xs text-gray-500 mb-1">Check-in</p>
                <p className="font-semibold text-gray-900">{formatDate(booking.checkIn)}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1">Check-out</p>
                <p className="font-semibold text-gray-900">{formatDate(booking.checkOut)}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1">Durasi</p>
                <p className="font-medium text-gray-900">{booking.totalNights} malam</p>
              </div>
              {booking.source && (
                <div>
                  <p className="text-xs text-gray-500 mb-1">Sumber</p>
                  <p className="font-medium text-gray-900 capitalize">{booking.source}</p>
                </div>
              )}
            </div>
            {booking.room.facilities.length > 0 && (
              <div className="mt-4 pt-3 border-t border-gray-50">
                <p className="text-xs text-gray-500 mb-2">Fasilitas</p>
                <div className="flex flex-wrap gap-1.5">
                  {booking.room.facilities.map((f) => (
                    <span key={f} className="text-xs bg-purple-50 text-purple-700 px-2 py-0.5 rounded-full">{f}</span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Data Tamu */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
            <h2 className="font-semibold text-gray-900 mb-4">Data Tamu</h2>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="col-span-2">
                <p className="text-xs text-gray-500 mb-1">Nama</p>
                <p className="font-semibold text-gray-900 text-base">{booking.guestName}</p>
              </div>
              {booking.guestPhone && (
                <div><p className="text-xs text-gray-500 mb-1">No. HP</p><p className="font-medium">{booking.guestPhone}</p></div>
              )}
              {booking.guestIdNum && (
                <div><p className="text-xs text-gray-500 mb-1">KTP / Paspor</p><p className="font-medium">{booking.guestIdNum}</p></div>
              )}
              {booking.guestEmail && (
                <div className="col-span-2"><p className="text-xs text-gray-500 mb-1">Email</p><p className="font-medium">{booking.guestEmail}</p></div>
              )}
              {booking.extraBed > 0 && (
                <div><p className="text-xs text-gray-500 mb-1">Extra Bed</p><p className="font-medium">{booking.extraBed} bed</p></div>
              )}
              {booking.note && (
                <div className="col-span-2">
                  <p className="text-xs text-gray-500 mb-1">Catatan</p>
                  <p className="text-gray-700 italic">"{booking.note}"</p>
                </div>
              )}
            </div>
          </div>

          {/* Riwayat Pembayaran */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
              <h2 className="font-semibold text-gray-900">Riwayat Pembayaran</h2>
              {['CONFIRMED', 'CHECKED_IN', 'PENDING'].includes(booking.status) && !isFullyPaid && (
                <button onClick={() => setShowPayForm(true)}
                  className="text-xs bg-purple-600 hover:bg-purple-700 text-white px-3 py-1.5 rounded-lg font-medium transition-colors">
                  + Tambah Bayar
                </button>
              )}
            </div>
            <div className="divide-y divide-gray-50">
              {booking.payments.length === 0 && (
                <p className="px-5 py-8 text-sm text-gray-400 text-center">Belum ada pembayaran tercatat</p>
              )}
              {booking.payments.map((p) => (
                <div key={p.id} className="px-5 py-3.5 flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${PAY_TYPE_COLOR[p.type]}`}>
                        {PAY_TYPE_LABEL[p.type]}
                      </span>
                      <span className="text-xs text-gray-500">{PAYMENT_LABEL[p.method] ?? p.method}</span>
                    </div>
                    <p className="text-xs text-gray-400 mt-0.5">{formatDateTime(p.paidAt)}</p>
                    {p.note && <p className="text-xs text-gray-400 italic">"{p.note}"</p>}
                  </div>
                  <p className={`font-bold text-base ${p.type === 'REFUND' ? 'text-red-600' : 'text-gray-900'}`}>
                    {p.type === 'REFUND' ? '-' : ''}{formatRupiah(p.amount)}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Kanan: Tagihan */}
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
            <h2 className="font-semibold text-gray-900 mb-4">Tagihan</h2>

            <div className="space-y-1.5 text-sm">
              {Object.values(groupedBreakdown).map((g, i) => (
                <div key={i} className="flex justify-between text-gray-600">
                  <span>{g.label} ×{g.count}mlm</span>
                  <span>{formatRupiah(g.subtotal)}</span>
                </div>
              ))}
              {booking.extraBed > 0 && (
                <div className="flex justify-between text-gray-600">
                  <span>Extra Bed ×{booking.totalNights}mlm</span>
                  <span>{formatRupiah(booking.extraBed * booking.extraBedPrice * booking.totalNights)}</span>
                </div>
              )}
              <div className="border-t border-gray-100 pt-2 flex justify-between font-bold text-gray-900">
                <span>Total</span>
                <span className="text-purple-600">{formatRupiah(booking.totalPrice)}</span>
              </div>
              <div className="flex justify-between text-green-600 font-medium">
                <span>Sudah Dibayar</span>
                <span>{formatRupiah(booking.paidAmount)}</span>
              </div>
              {remaining > 0 ? (
                <div className="flex justify-between text-red-600 font-bold text-base border-t border-gray-100 pt-2">
                  <span>Sisa</span>
                  <span>{formatRupiah(remaining)}</span>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-green-600 font-semibold pt-2 border-t border-gray-100">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                  Lunas
                </div>
              )}
            </div>
          </div>

          {/* Progress bayar */}
          {booking.totalPrice > 0 && (
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
              <div className="flex justify-between text-xs text-gray-500 mb-2">
                <span>Progress Bayar</span>
                <span>{Math.min(100, Math.round((booking.paidAmount / booking.totalPrice) * 100))}%</span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-2.5">
                <div
                  className="bg-purple-500 h-2.5 rounded-full transition-all"
                  style={{ width: `${Math.min(100, (booking.paidAmount / booking.totalPrice) * 100)}%` }}
                />
              </div>
              <div className="flex justify-between text-xs text-gray-400 mt-1.5">
                <span>{formatRupiah(booking.paidAmount)}</span>
                <span>{formatRupiah(booking.totalPrice)}</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modal Tambah Pembayaran */}
      {showPayForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm">
            <div className="px-6 py-5 border-b border-gray-100">
              <h3 className="font-bold text-gray-900">Tambah Pembayaran</h3>
              <p className="text-sm text-gray-500">{booking.bookingCode} · {booking.guestName}</p>
            </div>

            <form onSubmit={handleAddPayment} className="p-6 space-y-4">
              {payError && (
                <div className="text-sm bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">{payError}</div>
              )}

              <div>
                <p className="text-xs text-gray-500 mb-2">Jenis Pembayaran</p>
                <div className="grid grid-cols-3 gap-2">
                  {(['FULL', 'DP', 'REFUND'] as const).map((t) => (
                    <button key={t} type="button" onClick={() => setPayType(t)}
                      className={`py-2 text-xs font-medium rounded-lg transition-colors ${
                        payType === t ? 'bg-purple-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}>
                      {PAY_TYPE_LABEL[t]}
                    </button>
                  ))}
                </div>
              </div>

              <Field label={`Jumlah ${PAY_TYPE_LABEL[payType]} (Rp)`}>
                <input type="number" min={1} value={payAmount}
                  onChange={(e) => setPayAmount(e.target.value)}
                  placeholder={payType !== 'REFUND' ? remaining.toString() : '0'}
                  className={inp} required />
                {payType !== 'REFUND' && remaining > 0 && (
                  <button type="button" onClick={() => setPayAmount(remaining.toString())}
                    className="text-xs text-purple-600 hover:underline mt-1">
                    Lunas sekarang ({formatRupiah(remaining)})
                  </button>
                )}
              </Field>

              <div>
                <p className="text-xs font-medium text-gray-600 mb-2">Metode</p>
                <div className="grid grid-cols-4 gap-1.5">
                  {PAYMENT_METHODS.map((m) => (
                    <button key={m} type="button" onClick={() => setPayMethod(m)}
                      className={`py-1.5 text-xs font-medium rounded-lg transition-colors ${
                        payMethod === m ? 'bg-purple-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}>
                      {PAYMENT_LABEL[m]}
                    </button>
                  ))}
                </div>
              </div>

              <Field label="Catatan (opsional)">
                <input value={payNote} onChange={(e) => setPayNote(e.target.value)}
                  placeholder="e.g. Transfer via BCA" className={inp} />
              </Field>

              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => { setShowPayForm(false); setPayError('') }}
                  className="flex-1 py-2.5 border border-gray-200 text-sm text-gray-600 rounded-lg hover:bg-gray-50">
                  Batal
                </button>
                <button type="submit" disabled={paying}
                  className="flex-1 py-2.5 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-lg text-sm disabled:opacity-50">
                  {paying ? 'Menyimpan...' : 'Simpan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
      {children}
    </div>
  )
}
const inp = 'w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500'


