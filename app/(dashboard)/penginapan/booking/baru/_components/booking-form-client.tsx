'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { formatRupiah, formatDate } from '@/lib/utils'

type RoomPricing = {
  id: string; dayType: string; price: number
  startDate: string | null; endDate: string | null
  label: string | null; isActive: boolean
}
type Room = {
  id: string; name: string; floor: number | null; status: string
  roomType: { name: string } | null; facilities: string[]
  tonightPrice: number; pricing: RoomPricing[]
}
type NightBreakdown = { date: string; dayType: string; label: string; price: number }

const PAYMENT_METHODS = ['CASH', 'TRANSFER', 'QRIS', 'CARD']
const SOURCE_OPTIONS   = ['walk-in', 'telepon', 'online', 'OTA']

export function BookingFormClient({ rooms, preselectedRoomId }: { rooms: Room[]; preselectedRoomId: string | null }) {
  const router = useRouter()

  const today    = new Date().toISOString().slice(0, 10)
  const tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 10)

  const [roomId,        setRoomId]        = useState(preselectedRoomId ?? '')
  const [checkIn,       setCheckIn]       = useState(today)
  const [checkOut,      setCheckOut]      = useState(tomorrow)
  const [guestName,     setGuestName]     = useState('')
  const [guestPhone,    setGuestPhone]    = useState('')
  const [guestEmail,    setGuestEmail]    = useState('')
  const [guestIdNum,    setGuestIdNum]    = useState('')
  const [source,        setSource]        = useState('walk-in')
  const [extraBed,      setExtraBed]      = useState(0)
  const [extraBedPrice, setExtraBedPrice] = useState(0)
  const [note,          setNote]          = useState('')
  const [dpAmount,      setDpAmount]      = useState('')
  const [dpMethod,      setDpMethod]      = useState('CASH')
  const [withDP,        setWithDP]        = useState(false)

  const [breakdown,    setBreakdown]    = useState<NightBreakdown[]>([])
  const [totalNights,  setTotalNights]  = useState(0)
  const [totalPrice,   setTotalPrice]   = useState(0)
  const [loadingPrice, setLoadingPrice] = useState(false)
  const [saving,       setSaving]       = useState(false)
  const [error,        setError]        = useState('')

  const selectedRoom = rooms.find((r) => r.id === roomId)
  const availableRooms = rooms.filter((r) => r.status === 'AVAILABLE')

  const fetchPricing = useCallback(async () => {
    if (!roomId || !checkIn || !checkOut || checkIn >= checkOut) {
      setBreakdown([]); setTotalPrice(0); setTotalNights(0); return
    }
    setLoadingPrice(true)
    try {
      const res = await fetch(
        `/api/penginapan/pricing?roomId=${roomId}&checkIn=${checkIn}&checkOut=${checkOut}`
      )
      if (!res.ok) { setBreakdown([]); return }
      const data = await res.json()
      setBreakdown(data.breakdown)
      setTotalNights(data.totalNights)
      setTotalPrice(data.total + extraBed * extraBedPrice * data.totalNights)
    } finally {
      setLoadingPrice(false)
    }
  }, [roomId, checkIn, checkOut, extraBed, extraBedPrice])

  useEffect(() => { fetchPricing() }, [fetchPricing])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (!roomId)          return setError('Pilih kamar terlebih dahulu')
    if (!guestName.trim()) return setError('Nama tamu wajib diisi')
    if (totalPrice === 0) return setError('Tidak dapat menghitung harga. Cek pengaturan harga kamar.')

    const dp = withDP ? parseFloat(dpAmount || '0') : 0
    if (withDP && dp <= 0) return setError('Masukkan jumlah DP')

    setSaving(true)
    try {
      const res = await fetch('/api/penginapan/booking', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roomId, checkIn, checkOut, guestName, guestPhone, guestEmail,
          guestIdNum, source, extraBed, extraBedPrice, note,
          dpAmount: dp, dpMethod: withDP ? dpMethod : undefined,
        }),
      })
      if (!res.ok) {
        const err = await res.json()
        setError(err.error ?? 'Gagal membuat booking')
        return
      }
      const booking = await res.json()
      router.push(`/penginapan/booking/${booking.id}`)
      router.refresh()
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="max-w-5xl space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Booking Baru</h1>
        <p className="text-sm text-gray-500">Penginapan · Reservasi kamar</p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg">{error}</div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Kiri: Detail Booking */}
          <div className="lg:col-span-2 space-y-5">

            {/* Pilih Kamar */}
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
              <h2 className="font-semibold text-gray-900 mb-4">Pilih Kamar</h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {rooms.map((r) => {
                  const isSelected = roomId === r.id
                  const isUnavail  = r.status !== 'AVAILABLE'
                  return (
                    <button
                      key={r.id}
                      type="button"
                      disabled={isUnavail}
                      onClick={() => setRoomId(r.id)}
                      className={`text-left rounded-xl border-2 p-3 transition-all ${
                        isSelected
                          ? 'border-purple-500 bg-purple-50'
                          : isUnavail
                          ? 'border-gray-200 bg-gray-50 opacity-50 cursor-not-allowed'
                          : 'border-gray-200 hover:border-purple-300'
                      }`}
                    >
                      <p className="font-bold text-gray-900 text-sm">Kamar {r.name}</p>
                      {r.roomType && <p className="text-xs text-gray-500">{r.roomType.name}</p>}
                      <p className="text-sm font-semibold text-purple-600 mt-1">
                        {r.tonightPrice > 0 ? formatRupiah(r.tonightPrice) : '—'}<span className="text-xs font-normal text-gray-400">/mlm</span>
                      </p>
                      {isUnavail && <p className="text-xs text-red-500 mt-0.5">Tidak tersedia</p>}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Tanggal */}
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
              <h2 className="font-semibold text-gray-900 mb-4">Tanggal Menginap</h2>
              <div className="grid grid-cols-2 gap-4">
                <Field label="Check-in *">
                  <input type="date" value={checkIn} min={today}
                    onChange={(e) => { setCheckIn(e.target.value); if (e.target.value >= checkOut) setCheckOut('') }}
                    required className={inp} />
                </Field>
                <Field label="Check-out *">
                  <input type="date" value={checkOut} min={checkIn || today}
                    onChange={(e) => setCheckOut(e.target.value)}
                    required className={inp} />
                </Field>
              </div>

              {/* Extra Bed */}
              <div className="grid grid-cols-2 gap-4 mt-4">
                <Field label="Extra Bed">
                  <input type="number" min={0} value={extraBed}
                    onChange={(e) => setExtraBed(parseInt(e.target.value) || 0)}
                    className={inp} />
                </Field>
                <Field label="Harga Extra Bed/malam (Rp)">
                  <input type="number" min={0} value={extraBedPrice}
                    onChange={(e) => setExtraBedPrice(parseFloat(e.target.value) || 0)}
                    className={inp} />
                </Field>
              </div>
            </div>

            {/* Data Tamu */}
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
              <h2 className="font-semibold text-gray-900 mb-4">Data Tamu</h2>
              <div className="space-y-3">
                <Field label="Nama Lengkap *">
                  <input value={guestName} onChange={(e) => setGuestName(e.target.value)}
                    required placeholder="contoh: Budi Santoso" className={inp} />
                </Field>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="No. HP">
                    <input value={guestPhone} onChange={(e) => setGuestPhone(e.target.value)}
                      placeholder="08xxx" className={inp} />
                  </Field>
                  <Field label="No. KTP / Paspor">
                    <input value={guestIdNum} onChange={(e) => setGuestIdNum(e.target.value)}
                      placeholder="3201xxxx" className={inp} />
                  </Field>
                </div>
                <Field label="Email">
                  <input type="email" value={guestEmail} onChange={(e) => setGuestEmail(e.target.value)}
                    placeholder="tamu@email.com" className={inp} />
                </Field>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Sumber Booking">
                    <select value={source} onChange={(e) => setSource(e.target.value)} className={inp}>
                      {SOURCE_OPTIONS.map((s) => <option key={s}>{s}</option>)}
                    </select>
                  </Field>
                </div>
                <Field label="Catatan">
                  <textarea value={note} onChange={(e) => setNote(e.target.value)}
                    rows={2} placeholder="Request khusus tamu..." className={`${inp} resize-none`} />
                </Field>
              </div>
            </div>
          </div>

          {/* Kanan: Ringkasan Harga + DP */}
          <div className="space-y-4">
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 sticky top-4">
              <h2 className="font-semibold text-gray-900 mb-4">Ringkasan Harga</h2>

              {!roomId || !checkIn || !checkOut || checkIn >= checkOut ? (
                <p className="text-sm text-gray-400 text-center py-4">Pilih kamar dan tanggal untuk melihat harga</p>
              ) : loadingPrice ? (
                <p className="text-sm text-gray-400 text-center py-4">Menghitung harga...</p>
              ) : breakdown.length === 0 ? (
                <p className="text-sm text-red-500 text-center py-4">Harga tidak tersedia untuk kamar ini</p>
              ) : (
                <div className="space-y-2">
                  {/* Breakdown per malam — group by tipe */}
                  {(() => {
                    // Kelompokkan malam yang sama dayType+label
                    const grouped: { label: string; count: number; pricePerNight: number; subtotal: number }[] = []
                    for (const night of breakdown) {
                      const existing = grouped.find((g) => g.label === night.label && g.pricePerNight === night.price)
                      if (existing) { existing.count++; existing.subtotal += night.price }
                      else grouped.push({ label: night.label, count: 1, pricePerNight: night.price, subtotal: night.price })
                    }
                    return grouped.map((g, i) => (
                      <div key={i} className="flex justify-between text-sm text-gray-600">
                        <span>{g.label} ×{g.count} malam</span>
                        <span>{formatRupiah(g.subtotal)}</span>
                      </div>
                    ))
                  })()}

                  {extraBed > 0 && (
                    <div className="flex justify-between text-sm text-gray-600">
                      <span>Extra Bed ×{totalNights} malam</span>
                      <span>{formatRupiah(extraBed * extraBedPrice * totalNights)}</span>
                    </div>
                  )}

                  <div className="border-t border-gray-100 pt-2 flex justify-between font-bold text-gray-900">
                    <span>Total ({totalNights} malam)</span>
                    <span className="text-purple-600">{formatRupiah(totalPrice)}</span>
                  </div>
                </div>
              )}

              {/* DP */}
              <div className="mt-5 pt-4 border-t border-gray-100 space-y-3">
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input type="checkbox" checked={withDP}
                    onChange={(e) => setWithDP(e.target.checked)} className="accent-purple-600" />
                  <span className="font-medium text-gray-700">Terima DP sekarang</span>
                </label>

                {withDP && (
                  <div className="space-y-3 pl-6">
                    <Field label="Jumlah DP (Rp)">
                      <input type="number" min={1} max={totalPrice}
                        value={dpAmount} onChange={(e) => setDpAmount(e.target.value)}
                        placeholder="0" className={inp} />
                    </Field>
                    <Field label="Metode DP">
                      <div className="grid grid-cols-4 gap-1.5">
                        {PAYMENT_METHODS.map((m) => (
                          <button key={m} type="button" onClick={() => setDpMethod(m)}
                            className={`py-1.5 text-xs font-medium rounded-lg transition-colors ${
                              dpMethod === m ? 'bg-purple-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                            }`}>
                            {m}
                          </button>
                        ))}
                      </div>
                    </Field>
                    {totalPrice > 0 && dpAmount && (
                      <p className="text-xs text-gray-500">
                        Sisa pelunasan: <span className="font-semibold text-gray-700">
                          {formatRupiah(totalPrice - parseFloat(dpAmount || '0'))}
                        </span>
                      </p>
                    )}
                  </div>
                )}
              </div>

              <button
                type="submit"
                disabled={saving || !roomId || !guestName || !checkIn || !checkOut || totalPrice === 0}
                className="w-full mt-5 py-3 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white font-bold rounded-xl text-sm transition-colors"
              >
                {saving ? 'Menyimpan...' : 'Konfirmasi Booking'}
              </button>
              <button type="button" onClick={() => router.back()}
                className="w-full mt-2 py-2 text-sm text-gray-500 hover:text-gray-700 transition-colors">
                Batal
              </button>
            </div>
          </div>
        </div>
      </form>
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


