'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { formatDate, formatRupiah } from '@/lib/utils'

type FuelProductLite = {
  id: string
  name: string
  stock: number
  buyPrice: number
}

type ReadingLite = {
  id: string
  type: string // OPENING | CLOSING
  date: string
  productName: string
  expectedLiters: number
  actualLiters: number
  lossLiters: number
  note: string | null
}

function todayStr() {
  const d = new Date()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${m}-${day}`
}

export function StokClient({ products, readings }: { products: FuelProductLite[]; readings: ReadingLite[] }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  const [productId, setProductId] = useState(products[0]?.id ?? '')
  const [type, setType] = useState<'OPENING' | 'CLOSING'>('OPENING')
  const [date, setDate] = useState(todayStr())
  const [actual, setActual] = useState('')
  const [note, setNote] = useState('')

  const selected = products.find((p) => p.id === productId)
  const expected = selected?.stock ?? 0
  const loss = actual === '' ? null : expected - parseFloat(actual)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      const res = await fetch('/api/pertashop/stok', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fuelProductId: productId,
          type,
          date,
          actualLiters: parseFloat(actual),
          note: note || null,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        alert(data.error ?? 'Gagal mencatat pengukuran')
        return
      }
      setActual('')
      setNote('')
      router.refresh()
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <Link href="/pertashop" className="text-gray-400 hover:text-gray-600 transition-colors" aria-label="Kembali">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </Link>
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-gray-900">Stok & Loss</h1>
          <p className="text-xs md:text-sm text-gray-500">
            Ukur tangki saat buka (penguapan malam) & tutup (penguapan siang)
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Form */}
        <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 md:p-5 space-y-3 self-start">
          <h2 className="font-semibold text-gray-900 text-sm md:text-base">Catat Pengukuran</h2>

          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Produk BBM</label>
            <select
              value={productId}
              onChange={(e) => setProductId(e.target.value)}
              required
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              {products.length === 0 && <option value="">— belum ada produk —</option>}
              {products.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Jenis Pengukuran</label>
            <div className="grid grid-cols-2 gap-2">
              {([
                ['OPENING', 'Buka Pagi'],
                ['CLOSING', 'Tutup'],
              ] as const).map(([val, label]) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => setType(val)}
                  className={`rounded-lg border py-2 text-sm font-medium transition-colors ${
                    type === val
                      ? 'border-emerald-600 bg-emerald-50 text-emerald-700'
                      : 'border-gray-200 text-gray-500 hover:bg-gray-50'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Tanggal</label>
              <input
                type="date" required value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Hasil Ukur (L)</label>
              <input
                type="number" step="0.001" min="0" required value={actual}
                onChange={(e) => setActual(e.target.value)}
                placeholder="mis. 198.5"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Catatan (opsional)</label>
            <input
              type="text" value={note} onChange={(e) => setNote(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div className="rounded-lg bg-gray-50 p-3 space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500 text-xs">Stok sistem (seharusnya)</span>
              <span className="font-semibold text-gray-900">
                {expected.toLocaleString('id-ID', { maximumFractionDigits: 3 })} L
              </span>
            </div>
            {loss !== null && !isNaN(loss) && (
              <>
                <div className="flex justify-between">
                  <span className="text-gray-500 text-xs">Loss (penguapan/susut)</span>
                  <span className={`font-bold ${loss > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                    {loss.toLocaleString('id-ID', { maximumFractionDigits: 3 })} L
                  </span>
                </div>
                {selected && loss > 0 && (
                  <div className="flex justify-between">
                    <span className="text-gray-500 text-xs">≈ nilai loss (harga beli)</span>
                    <span className="font-semibold text-red-600">{formatRupiah(loss * selected.buyPrice)}</span>
                  </div>
                )}
              </>
            )}
          </div>

          <button
            type="submit"
            disabled={loading || !productId}
            className="w-full bg-emerald-600 text-white rounded-lg py-2.5 text-sm font-semibold hover:bg-emerald-700 transition-colors disabled:opacity-50"
          >
            {loading ? 'Menyimpan...' : 'Simpan Pengukuran'}
          </button>
          <p className="text-xs text-gray-400 leading-snug">
            Setelah disimpan, stok sistem dikoreksi ke hasil ukur agar pengukuran berikutnya akurat.
          </p>
        </form>

        {/* Riwayat */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-gray-100 shadow-sm">
          <div className="px-4 md:px-5 py-3 md:py-4 border-b border-gray-100">
            <h2 className="font-semibold text-gray-900 text-sm md:text-base">Riwayat Pengukuran & Loss</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-gray-500 border-b border-gray-100">
                  <th className="px-4 md:px-5 py-2.5 font-medium">Tanggal</th>
                  <th className="px-3 py-2.5 font-medium">Jenis</th>
                  <th className="px-3 py-2.5 font-medium">Produk</th>
                  <th className="px-3 py-2.5 font-medium text-right">Seharusnya</th>
                  <th className="px-3 py-2.5 font-medium text-right">Hasil Ukur</th>
                  <th className="px-4 md:px-5 py-2.5 font-medium text-right">Loss</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {readings.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-5 py-6 text-center text-gray-400">Belum ada pengukuran</td>
                  </tr>
                )}
                {readings.map((r) => (
                  <tr key={r.id}>
                    <td className="px-4 md:px-5 py-3 text-gray-600 whitespace-nowrap">
                      {formatDate(r.date)}
                      {r.note && <p className="text-xs text-gray-400">{r.note}</p>}
                    </td>
                    <td className="px-3 py-3">
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                          r.type === 'OPENING' ? 'bg-sky-100 text-sky-700' : 'bg-indigo-100 text-indigo-700'
                        }`}
                      >
                        {r.type === 'OPENING' ? 'Buka' : 'Tutup'}
                      </span>
                    </td>
                    <td className="px-3 py-3 font-medium text-gray-900">{r.productName}</td>
                    <td className="px-3 py-3 text-right text-gray-600">
                      {r.expectedLiters.toLocaleString('id-ID', { maximumFractionDigits: 3 })} L
                    </td>
                    <td className="px-3 py-3 text-right text-gray-800">
                      {r.actualLiters.toLocaleString('id-ID', { maximumFractionDigits: 3 })} L
                    </td>
                    <td
                      className={`px-4 md:px-5 py-3 text-right font-semibold ${
                        r.lossLiters > 0 ? 'text-red-600' : r.lossLiters < 0 ? 'text-blue-600' : 'text-emerald-600'
                      }`}
                    >
                      {r.lossLiters.toLocaleString('id-ID', { maximumFractionDigits: 3 })} L
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
