'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { formatRupiah, formatDate } from '@/lib/utils'

type RoomPricing = {
  id: string; price: number; dayType: string
  startDate: string | null; endDate: string | null
}

type Room = {
  id: string; name: string; status: string; capacity: number | null
  roomType: { name: string } | null
  facilities: { facility: { name: string } }[]
  pricing: RoomPricing[]
}

type NightBreakdown = {
  date: string; price: number; label: string
}

type Props = {
  rooms: Room[]
  defaultRoomId: string
}

const PAYMENT_METHODS = ['CASH', 'QRIS', 'TRANSFER', 'CARD']

export function HomestayBookingFormClient({ rooms, defaultRoomId }: Props) {
  const router = useRouter()

  const [selectedRoomId, setSelectedRoomId] = useState(defaultRoomId)
  const [checkIn,  setCheckIn]  = useState('')
  const [checkOut, setCheckOut] = useState('')
  const [breakdown, setBreakdown] = useState<NightBreakdown[]>([])
  const [totalPrice, setTotalPrice] = useState(0)
  const [priceLoading, setPriceLoading] = useState(false)

  const [guestName,  setGuestName]  = useState('')
  const [guestPhone, setGuestPhone] = useState('')
  const [guestEmail, setGuestEmail] = useState('')
  const [guestIdNum, setGuestIdNum] = useState('')
  const [source,     setSource]     = useState('walk-in')
  const [note,       setNote]       = useState('')
  const [extraBed,   setExtraBed]   = useState(0)
  const [extraBedPrice, setExtraBedPrice] = useState(0)

  const [useDP,     setUseDP]     = useState(false)
  const [dpAmount,  setDpAmount]  = useState('')
  const [dpMethod,  setDpMethod]  = useState('CASH')

  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState('')

  const fetchPricing = useCallback(async () => {
    if (!selectedRoomId || !checkIn || !checkOut) return
    setPriceLoading(true)
    try {
      const res = await fetch(
        `/api/homestay/pricing?roomId=${selectedRoomId}&checkIn=${checkIn}&checkOut=${checkOut}`
      )
      if (res.ok) {
        const data = await res.json()
        setBreakdown(data.breakdown ?? [])
        setTotalPrice(data.total ?? 0)
      } else {
        setBreakdown([])
        setTotalPrice(0)
      }
    } finally {
      setPriceLoading(false)
    }
  }, [selectedRoomId, checkIn, checkOut])

  useEffect(() => { fetchPricing() }, [fetchPricing])

  const extraTotal  = extraBed * extraBedPrice * breakdown.length
  const grandTotal  = totalPrice + extraTotal
  const selectedRoom = rooms.find((r) => r.id === selectedRoomId)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedRoomId) return setError('Pilih villa terlebih dahulu')
    if (!checkIn || !checkOut) return setError('Tanggal check-in dan check-out wajib diisi')
    if (!guestName.trim()) return setError('Nama tamu wajib diisi')

    setLoading(true)
    setError('')

    const res = await fetch('/api/homestay/booking', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        roomId: selectedRoomId,
        checkIn, checkOut,
        guestName: guestName.trim(),
        guestPhone: guestPhone || undefined,
        guestEmail: guestEmail || undefined,
        guestIdNum: guestIdNum || undefined,
        source, note: note || undefined,
        extraBed: extraBed || undefined,
        extraBedPrice: extraBedPrice || undefined,
        dpAmount: useDP ? Number(dpAmount) || 0 : 0,
        dpMethod: useDP ? dpMethod : undefined,
      }),
    })

    const data = await res.json()
    setLoading(false)

    if (!res.ok) return setError(data.error ?? 'Gagal membuat booking')
    router.push(`/homestay/booking/${data.booking.id}`)
  }

  return (
    <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-5 gap-6">
      {/* ── Kiri: Pilih Villa + Tanggal ─────────────── */}
      <div className="lg:col-span-3 space-y-5">
        {/* Pilih Villa */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <h2 className="text-sm font-semibold text-gray-700 mb-4">Pilih Villa</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {rooms.map((room) => {
              const isUnavailable = room.status !== 'AVAILABLE'
              const isSelected    = room.id === selectedRoomId
              const facilityNames = room.facilities.map((f) => f.facility.name)
              return (
                <button
                  key={room.id}
                  type="button"
                  disabled={isUnavailable}
                  onClick={() => setSelectedRoomId(room.id)}
                  className={`text-left rounded-xl border-2 p-4 transition-all ${
                    isSelected
                      ? 'border-teal-500 bg-teal-50'
                      : isUnavailable
                      ? 'border-gray-100 bg-gray-50 opacity-50 cursor-not-allowed'
                      : 'border-gray-200 hover:border-teal-300 hover:bg-teal-50/30'
                  }`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <p className={`font-semibold ${isSelected ? 'text-teal-700' : 'text-gray-800'}`}>{room.name}</p>
                      <p className="text-xs text-gray-500">{room.roomType?.name}</p>
                    </div>
                    {room.capacity != null && (
                      <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-lg font-medium">
                        {room.capacity} org
                      </span>
                    )}
                  </div>
                  {facilityNames.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {facilityNames.slice(0, 5).map((f) => (
                        <span key={f} className="text-xs bg-white border border-gray-200 text-gray-500 px-1.5 py-0.5 rounded">{f}</span>
                      ))}
                      {facilityNames.length > 5 && (
                        <span className="text-xs text-gray-400">+{facilityNames.length - 5}</span>
                      )}
                    </div>
                  )}
                  {isUnavailable && (
                    <p className="text-xs text-red-500 mt-2 font-medium">Tidak tersedia</p>
                  )}
                </button>
              )
            })}
          </div>
        </div>

        {/* Tanggal */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <h2 className="text-sm font-semibold text-gray-700 mb-4">Tanggal Menginap</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Check-in</label>
              <input type="date" value={checkIn} onChange={(e) => setCheckIn(e.target.value)}
                min={new Date().toISOString().split('T')[0]}
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400" />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Check-out</label>
              <input type="date" value={checkOut} onChange={(e) => setCheckOut(e.target.value)}
                min={checkIn || new Date().toISOString().split('T')[0]}
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400" />
            </div>
          </div>

          {/* Breakdown harga */}
          {priceLoading ? (
            <p className="text-xs text-gray-400 mt-4 text-center">Menghitung harga...</p>
          ) : breakdown.length > 0 ? (
            <div className="mt-4 border border-gray-100 rounded-xl overflow-hidden">
              <div className="px-4 py-2 bg-gray-50 border-b border-gray-100">
                <p className="text-xs font-semibold text-gray-600">Rincian Harga per Malam</p>
              </div>
              {breakdown.map((night, i) => (
                <div key={i} className="flex items-center justify-between px-4 py-2.5 text-sm border-b border-gray-50 last:border-0">
                  <div>
                    <span className="text-gray-700">{formatDate(new Date(night.date))}</span>
                    <span className={`ml-2 text-xs px-1.5 py-0.5 rounded font-medium ${
                      night.label === 'Weekend'    ? 'bg-orange-100 text-orange-600' :
                      night.label === 'Peak Season' ? 'bg-red-100 text-red-600' :
                                                      'bg-gray-100 text-gray-500'
                    }`}>{night.label}</span>
                  </div>
                  <span className="font-semibold text-gray-800">{formatRupiah(night.price)}</span>
                </div>
              ))}
              <div className="flex items-center justify-between px-4 py-3 bg-teal-50 font-semibold text-sm">
                <span className="text-teal-700">Subtotal Kamar ({breakdown.length} malam)</span>
                <span className="text-teal-700">{formatRupiah(totalPrice)}</span>
              </div>
            </div>
          ) : (checkIn && checkOut && selectedRoomId) ? (
            <p className="text-xs text-red-500 mt-3">Tidak dapat menghitung harga. Cek kembali tanggal atau pricing villa.</p>
          ) : null}
        </div>

        {/* Extra Bed */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <h2 className="text-sm font-semibold text-gray-700 mb-4">Extra Bed (opsional)</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Jumlah Extra Bed</label>
              <input type="number" min={0} value={extraBed} onChange={(e) => setExtraBed(Number(e.target.value))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400" />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Harga per Bed/Malam (Rp)</label>
              <input type="number" min={0} value={extraBedPrice} onChange={(e) => setExtraBedPrice(Number(e.target.value))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400" />
            </div>
          </div>
          {extraBed > 0 && extraBedPrice > 0 && breakdown.length > 0 && (
            <p className="mt-2 text-xs text-gray-500">
              Extra bed: {extraBed} × {formatRupiah(extraBedPrice)} × {breakdown.length} malam = <strong>{formatRupiah(extraTotal)}</strong>
            </p>
          )}
        </div>
      </div>

      {/* ── Kanan: Data Tamu + Pembayaran ─────────── */}
      <div className="lg:col-span-2 space-y-5">
        {/* Data Tamu */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <h2 className="text-sm font-semibold text-gray-700 mb-4">Data Tamu</h2>
          <div className="space-y-3">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Nama Tamu *</label>
              <input type="text" value={guestName} onChange={(e) => setGuestName(e.target.value)} required
                placeholder="Nama lengkap"
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400" />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">No. HP</label>
              <input type="text" value={guestPhone} onChange={(e) => setGuestPhone(e.target.value)}
                placeholder="08xxxxxxxx"
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400" />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Email</label>
              <input type="email" value={guestEmail} onChange={(e) => setGuestEmail(e.target.value)}
                placeholder="email@example.com"
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400" />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">No. KTP / Paspor</label>
              <input type="text" value={guestIdNum} onChange={(e) => setGuestIdNum(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400" />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Sumber Booking</label>
              <select value={source} onChange={(e) => setSource(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400">
                {['walk-in','telepon','WhatsApp','Booking.com','Airbnb','Agoda','website','lainnya'].map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Catatan</label>
              <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2}
                placeholder="Permintaan khusus, dll."
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400 resize-none" />
            </div>
          </div>
        </div>

        {/* Down Payment */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <h2 className="text-sm font-semibold text-gray-700 mb-4">Uang Muka / DP (opsional)</h2>
          <label className="flex items-center gap-2 mb-3 cursor-pointer">
            <input type="checkbox" checked={useDP} onChange={(e) => setUseDP(e.target.checked)}
              className="w-4 h-4 text-teal-600 rounded border-gray-300" />
            <span className="text-sm text-gray-700">Terima DP sekarang</span>
          </label>
          {useDP && (
            <div className="space-y-3">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Jumlah DP (Rp)</label>
                <input type="number" min={0} value={dpAmount} onChange={(e) => setDpAmount(e.target.value)}
                  placeholder="0"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400" />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Metode Pembayaran</label>
                <div className="grid grid-cols-2 gap-2">
                  {PAYMENT_METHODS.map((m) => (
                    <button key={m} type="button"
                      onClick={() => setDpMethod(m)}
                      className={`py-2 rounded-lg text-xs font-semibold border transition-colors ${
                        dpMethod === m ? 'bg-teal-600 text-white border-teal-600' : 'bg-white text-gray-600 border-gray-200 hover:border-teal-300'
                      }`}>
                      {m}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Summary */}
        {grandTotal > 0 && (
          <div className="bg-teal-50 rounded-xl border border-teal-200 p-4 space-y-2">
            <p className="text-xs font-semibold text-teal-700 uppercase tracking-wide">Ringkasan</p>
            {breakdown.length > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Kamar ({breakdown.length} malam)</span>
                <span className="font-medium">{formatRupiah(totalPrice)}</span>
              </div>
            )}
            {extraTotal > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Extra Bed</span>
                <span className="font-medium">{formatRupiah(extraTotal)}</span>
              </div>
            )}
            <div className="flex justify-between text-base font-bold text-teal-800 pt-1 border-t border-teal-200">
              <span>Total</span>
              <span>{formatRupiah(grandTotal)}</span>
            </div>
            {useDP && Number(dpAmount) > 0 && (
              <div className="flex justify-between text-sm text-gray-600">
                <span>DP ({dpMethod})</span>
                <span className="font-medium text-emerald-700">−{formatRupiah(Number(dpAmount))}</span>
              </div>
            )}
            {useDP && Number(dpAmount) > 0 && (
              <div className="flex justify-between text-sm font-semibold text-red-600">
                <span>Sisa Tagihan</span>
                <span>{formatRupiah(Math.max(0, grandTotal - Number(dpAmount)))}</span>
              </div>
            )}
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        <div className="flex gap-3">
          <button type="button" onClick={() => router.back()}
            className="flex-1 py-3 border border-gray-200 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors">
            Batal
          </button>
          <button type="submit" disabled={loading || !selectedRoomId}
            className="flex-1 py-3 bg-teal-600 hover:bg-teal-700 disabled:bg-teal-300 text-white rounded-xl text-sm font-semibold transition-colors">
            {loading ? 'Menyimpan...' : 'Buat Booking'}
          </button>
        </div>
      </div>
    </form>
  )
}


