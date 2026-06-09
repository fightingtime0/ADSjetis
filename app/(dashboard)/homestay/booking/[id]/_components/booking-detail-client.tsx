'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { formatRupiah, formatDate, formatDateTime } from '@/lib/utils'

type Payment = { id: string; amount: number; method: string; type: string; note: string | null; paidAt: string }
type Booking = {
  id: string; bookingCode: string; guestName: string; guestPhone: string | null
  guestEmail: string | null; guestIdNum: string | null; source: string | null
  note: string | null; status: string
  checkIn: string; checkOut: string; totalNights: number
  totalPrice: number; dpAmount: number; paidAmount: number
  pricePerNight: number; extraBed: number; extraBedPrice: number
  payments: Payment[]
  room: {
    id: string; name: string; capacity: number | null
    roomType: { name: string } | null
    facilities: { facility: { name: string } }[]
  } | null
}

const STATUS_COLOR: Record<string, string> = {
  PENDING:     'bg-yellow-100 text-yellow-700 border-yellow-200',
  CONFIRMED:   'bg-blue-100 text-blue-700 border-blue-200',
  CHECKED_IN:  'bg-green-100 text-green-700 border-green-200',
  CHECKED_OUT: 'bg-gray-100 text-gray-600 border-gray-200',
  CANCELLED:   'bg-red-100 text-red-600 border-red-200',
}
const STATUS_LABEL: Record<string, string> = {
  PENDING: 'Pending', CONFIRMED: 'Dikonfirmasi', CHECKED_IN: 'Check-in',
  CHECKED_OUT: 'Check-out', CANCELLED: 'Dibatalkan',
}
const PAYMENT_METHODS = ['CASH', 'QRIS', 'TRANSFER', 'CARD']

export function HomestayBookingDetailClient({
  booking: initial,
  role,
}: {
  booking: Booking
  role: string
}) {
  const router = useRouter()
  const [booking, setBooking] = useState(initial)
  const [actionLoading, setActionLoading] = useState(false)

  // Payment modal
  const [showPayModal, setShowPayModal] = useState(false)
  const [payAmount,  setPayAmount]  = useState('')
  const [payMethod,  setPayMethod]  = useState('CASH')
  const [payType,    setPayType]    = useState<'DP' | 'FULL' | 'REFUND'>('FULL')
  const [payNote,    setPayNote]    = useState('')
  const [payLoading, setPayLoading] = useState(false)
  const [payError,   setPayError]   = useState('')

  const remaining  = booking.totalPrice - booking.paidAmount
  const isEditable = !['CHECKED_OUT', 'CANCELLED'].includes(booking.status)

  async function handleStatusChange(newStatus: string) {
    setActionLoading(true)
    const res = await fetch(`/api/homestay/booking/${booking.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus }),
    })
    const data = await res.json()
    setActionLoading(false)
    if (res.ok) setBooking((prev) => ({ ...prev, status: data.status }))
    else alert(data.error)
  }

  async function handleAddPayment() {
    setPayLoading(true)
    setPayError('')
    const res = await fetch(`/api/homestay/booking/${booking.id}/pembayaran`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount: Number(payAmount), method: payMethod, type: payType, note: payNote }),
    })
    const data = await res.json()
    setPayLoading(false)
    if (!res.ok) return setPayError(data.error ?? 'Gagal menambah pembayaran')

    setBooking((prev) => ({
      ...prev,
      paidAmount: payType === 'REFUND'
        ? Math.max(0, prev.paidAmount - Number(payAmount))
        : prev.paidAmount + Number(payAmount),
      payments: [...prev.payments, { ...data, paidAt: data.paidAt ?? new Date().toISOString() }],
    }))
    setShowPayModal(false)
    setPayAmount(''); setPayNote('')
  }

  const nextActions: Record<string, { label: string; next: string; color: string }[]> = {
    PENDING:    [{ label: 'Konfirmasi', next: 'CONFIRMED', color: 'bg-blue-600 hover:bg-blue-700 text-white' },
                 { label: 'Batalkan',   next: 'CANCELLED', color: 'bg-red-50 hover:bg-red-100 text-red-600 border border-red-200' }],
    CONFIRMED:  [{ label: 'Check-in',  next: 'CHECKED_IN', color: 'bg-green-600 hover:bg-green-700 text-white' },
                 { label: 'Batalkan',  next: 'CANCELLED',  color: 'bg-red-50 hover:bg-red-100 text-red-600 border border-red-200' }],
    CHECKED_IN: [{ label: 'Check-out', next: 'CHECKED_OUT', color: 'bg-teal-600 hover:bg-teal-700 text-white' }],
  }

  const facilityNames = booking.room?.facilities.map((f) => f.facility.name) ?? []

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* ── Kiri ───────────────── */}
      <div className="lg:col-span-2 space-y-5">
        {/* Header booking */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-start justify-between flex-wrap gap-3">
            <div>
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-xl font-bold text-gray-900">{booking.bookingCode}</h1>
                <span className={`text-xs px-2.5 py-1 rounded-full font-semibold border ${STATUS_COLOR[booking.status]}`}>
                  {STATUS_LABEL[booking.status]}
                </span>
              </div>
              <p className="text-sm text-gray-500 mt-1">
                {booking.room?.name ?? '-'} · {booking.room?.roomType?.name}
                {booking.room?.capacity ? ` · ${booking.room.capacity} org` : ''}
              </p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-gray-900">{formatRupiah(booking.totalPrice)}</p>
              {remaining > 0 && (
                <p className="text-sm text-red-500 font-medium">Sisa: {formatRupiah(remaining)}</p>
              )}
              {remaining === 0 && <p className="text-sm text-green-600 font-medium">Lunas</p>}
            </div>
          </div>

          {/* Fasilitas villa */}
          {facilityNames.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-4 pt-4 border-t border-gray-50">
              {facilityNames.map((f) => (
                <span key={f} className="text-xs bg-teal-50 text-teal-700 px-2 py-0.5 rounded-md font-medium border border-teal-100">{f}</span>
              ))}
            </div>
          )}
        </div>

        {/* Info Booking */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <h2 className="text-sm font-semibold text-gray-700 mb-4">Detail Booking</h2>
          <div className="grid grid-cols-2 gap-4 text-sm">
            {[
              ['Check-in', formatDate(new Date(booking.checkIn))],
              ['Check-out', formatDate(new Date(booking.checkOut))],
              ['Jumlah Malam', `${booking.totalNights} malam`],
              ['Harga per Malam', formatRupiah(booking.pricePerNight)],
              ...(booking.extraBed > 0 ? [['Extra Bed', `${booking.extraBed} × ${formatRupiah(booking.extraBedPrice)}`]] : []),
              ['Sumber Booking', booking.source ?? '-'],
            ].map(([label, value]) => (
              <div key={label}>
                <p className="text-xs text-gray-400">{label}</p>
                <p className="font-medium text-gray-800 mt-0.5">{value}</p>
              </div>
            ))}
          </div>
          {booking.note && (
            <div className="mt-4 pt-4 border-t border-gray-50">
              <p className="text-xs text-gray-400">Catatan</p>
              <p className="text-sm text-gray-700 mt-0.5">{booking.note}</p>
            </div>
          )}
        </div>

        {/* Data Tamu */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <h2 className="text-sm font-semibold text-gray-700 mb-4">Data Tamu</h2>
          <div className="grid grid-cols-2 gap-4 text-sm">
            {[
              ['Nama', booking.guestName],
              ['No. HP', booking.guestPhone ?? '-'],
              ['Email', booking.guestEmail ?? '-'],
              ['No. KTP/Paspor', booking.guestIdNum ?? '-'],
            ].map(([label, value]) => (
              <div key={label}>
                <p className="text-xs text-gray-400">{label}</p>
                <p className="font-medium text-gray-800 mt-0.5">{value}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Riwayat Pembayaran */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-gray-700">Riwayat Pembayaran</h2>
            {isEditable && (
              <button onClick={() => setShowPayModal(true)}
                className="text-xs bg-teal-600 hover:bg-teal-700 text-white px-3 py-1.5 rounded-lg font-medium transition-colors">
                + Tambah Pembayaran
              </button>
            )}
          </div>

          {/* Progress bar */}
          <div className="mb-4">
            <div className="flex justify-between text-xs text-gray-500 mb-1">
              <span>Terbayar: {formatRupiah(booking.paidAmount)}</span>
              <span>Total: {formatRupiah(booking.totalPrice)}</span>
            </div>
            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-teal-500 rounded-full transition-all"
                style={{ width: `${Math.min(100, (booking.paidAmount / booking.totalPrice) * 100)}%` }}
              />
            </div>
          </div>

          {booking.payments.length === 0 ? (
            <p className="text-xs text-gray-400 text-center py-4">Belum ada pembayaran</p>
          ) : (
            <div className="space-y-2">
              {booking.payments.map((p) => (
                <div key={p.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg text-sm">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        p.type === 'REFUND' ? 'bg-red-100 text-red-600' :
                        p.type === 'DP'     ? 'bg-yellow-100 text-yellow-700' :
                                              'bg-green-100 text-green-700'
                      }`}>{p.type}</span>
                      <span className="text-gray-600">{p.method}</span>
                    </div>
                    {p.note && <p className="text-xs text-gray-400 mt-0.5">{p.note}</p>}
                    <p className="text-xs text-gray-400">{formatDateTime(new Date(p.paidAt))}</p>
                  </div>
                  <span className={`font-semibold ${p.type === 'REFUND' ? 'text-red-600' : 'text-gray-900'}`}>
                    {p.type === 'REFUND' ? '-' : '+'}{formatRupiah(p.amount)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Kanan: Aksi ─────────── */}
      <div className="space-y-5">
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <h2 className="text-sm font-semibold text-gray-700 mb-4">Aksi</h2>
          <div className="space-y-2.5">
            {(nextActions[booking.status] ?? []).map((action) => (
              <button key={action.next} onClick={() => handleStatusChange(action.next)}
                disabled={actionLoading}
                className={`w-full py-2.5 rounded-xl text-sm font-semibold transition-colors disabled:opacity-50 ${action.color}`}>
                {actionLoading ? 'Memproses...' : action.label}
              </button>
            ))}
            {['CHECKED_OUT', 'CANCELLED'].includes(booking.status) && (
              <p className="text-xs text-gray-400 text-center">Booking sudah selesai</p>
            )}
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <h2 className="text-sm font-semibold text-gray-700 mb-3">Ringkasan Biaya</h2>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">Harga Kamar ({booking.totalNights}m)</span>
              <span>{formatRupiah(booking.pricePerNight * booking.totalNights)}</span>
            </div>
            {booking.extraBed > 0 && (
              <div className="flex justify-between">
                <span className="text-gray-500">Extra Bed</span>
                <span>{formatRupiah(booking.extraBed * booking.extraBedPrice * booking.totalNights)}</span>
              </div>
            )}
            <div className="flex justify-between font-bold text-gray-900 border-t border-gray-100 pt-2">
              <span>Total</span>
              <span>{formatRupiah(booking.totalPrice)}</span>
            </div>
            <div className="flex justify-between text-teal-600 font-medium">
              <span>Terbayar</span>
              <span>{formatRupiah(booking.paidAmount)}</span>
            </div>
            {remaining > 0 && (
              <div className="flex justify-between text-red-600 font-semibold">
                <span>Sisa Tagihan</span>
                <span>{formatRupiah(remaining)}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Payment Modal ─────────────────────────── */}
      {showPayModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-5">Tambah Pembayaran</h3>

            <div className="space-y-4">
              <div>
                <label className="block text-xs text-gray-500 mb-2">Tipe Pembayaran</label>
                <div className="flex gap-2">
                  {(['DP', 'FULL', 'REFUND'] as const).map((t) => (
                    <button key={t} type="button" onClick={() => setPayType(t)}
                      className={`flex-1 py-2 text-xs font-semibold rounded-lg border transition-colors ${
                        payType === t ? 'bg-teal-600 text-white border-teal-600' : 'text-gray-600 border-gray-200 hover:border-teal-300'
                      }`}>
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs text-gray-500 mb-1">Jumlah (Rp)</label>
                <input type="number" value={payAmount} onChange={(e) => setPayAmount(e.target.value)}
                  placeholder="0"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400" />
                {remaining > 0 && payType !== 'REFUND' && (
                  <button type="button" onClick={() => setPayAmount(String(remaining))}
                    className="mt-1 text-xs text-teal-600 hover:underline">
                    Isi sisa tagihan ({formatRupiah(remaining)})
                  </button>
                )}
              </div>

              <div>
                <label className="block text-xs text-gray-500 mb-2">Metode</label>
                <div className="grid grid-cols-2 gap-2">
                  {PAYMENT_METHODS.map((m) => (
                    <button key={m} type="button" onClick={() => setPayMethod(m)}
                      className={`py-2 rounded-lg text-xs font-semibold border transition-colors ${
                        payMethod === m ? 'bg-teal-600 text-white border-teal-600' : 'text-gray-600 border-gray-200 hover:border-teal-300'
                      }`}>
                      {m}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs text-gray-500 mb-1">Catatan (opsional)</label>
                <input type="text" value={payNote} onChange={(e) => setPayNote(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400" />
              </div>

              {payError && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{payError}</p>}
            </div>

            <div className="flex gap-3 mt-6">
              <button type="button" onClick={() => { setShowPayModal(false); setPayError('') }}
                className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-50">
                Batal
              </button>
              <button type="button" onClick={handleAddPayment} disabled={payLoading || !payAmount}
                className="flex-1 py-2.5 bg-teal-600 hover:bg-teal-700 disabled:bg-teal-300 text-white rounded-xl text-sm font-semibold transition-colors">
                {payLoading ? 'Menyimpan...' : 'Simpan'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}


