'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { formatRupiah, formatDateTime } from '@/lib/utils'

type FuelProductLite = {
  id: string
  name: string
  buyPrice: number
  sellPrice: number
  stock: number
}

type SaleLite = {
  id: string
  saleNumber: string
  productName: string
  liters: number
  sellPrice: number
  total: number
  margin: number
  note: string | null
  soldAt: string
}

export function PenjualanClient({
  products,
  sales,
  today,
}: {
  products: FuelProductLite[]
  sales: SaleLite[]
  today: { total: number; liters: number; margin: number }
}) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  const [productId, setProductId] = useState(products[0]?.id ?? '')
  const [liters, setLiters] = useState('')
  const [sellPrice, setSellPrice] = useState(products[0] ? String(products[0].sellPrice) : '')
  const [note, setNote] = useState('')

  const selected = products.find((p) => p.id === productId)
  const total = (parseFloat(liters) || 0) * (parseFloat(sellPrice) || 0)
  const margin = selected ? (parseFloat(liters) || 0) * ((parseFloat(sellPrice) || 0) - selected.buyPrice) : 0

  function onProductChange(id: string) {
    setProductId(id)
    const p = products.find((x) => x.id === id)
    if (p) setSellPrice(String(p.sellPrice))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (selected && parseFloat(liters) > selected.stock) {
      if (!confirm(`Liter melebihi stok sistem (${selected.stock} L). Tetap simpan?`)) return
    }
    setLoading(true)
    try {
      const res = await fetch('/api/pertashop/penjualan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fuelProductId: productId,
          liters: parseFloat(liters),
          sellPrice: parseFloat(sellPrice),
          note: note || null,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        alert(data.error ?? 'Gagal mencatat penjualan')
        return
      }
      setLiters('')
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
          <h1 className="text-xl md:text-2xl font-bold text-gray-900">Penjualan BBM</h1>
          <p className="text-xs md:text-sm text-gray-500">Catat sales — liter & harga jual</p>
        </div>
      </div>

      {/* Ringkasan hari ini */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Sales Hari Ini', value: formatRupiah(today.total) },
          { label: 'Liter Hari Ini', value: `${today.liters.toLocaleString('id-ID', { maximumFractionDigits: 2 })} L` },
          { label: 'Margin Hari Ini', value: formatRupiah(today.margin) },
        ].map((s) => (
          <div key={s.label} className="bg-white rounded-xl border border-gray-100 shadow-sm p-3 md:p-4">
            <p className="text-xs text-gray-500 font-medium">{s.label}</p>
            <p className="text-sm md:text-lg font-bold text-gray-900 mt-0.5 truncate">{s.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Form */}
        <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 md:p-5 space-y-3 self-start">
          <h2 className="font-semibold text-gray-900 text-sm md:text-base">Catat Penjualan</h2>

          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Produk BBM</label>
            <select
              value={productId}
              onChange={(e) => onProductChange(e.target.value)}
              required
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              {products.length === 0 && <option value="">— belum ada produk —</option>}
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} (stok {p.stock.toLocaleString('id-ID', { maximumFractionDigits: 2 })} L)
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Liter</label>
              <input
                type="number" step="0.001" min="0.001" required value={liters}
                onChange={(e) => setLiters(e.target.value)}
                placeholder="mis. 35.5"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Harga Jual / L</label>
              <input
                type="number" step="1" min="1" required value={sellPrice}
                onChange={(e) => setSellPrice(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Catatan (opsional)</label>
            <input
              type="text" value={note} onChange={(e) => setNote(e.target.value)}
              placeholder="mis. shift pagi"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div className="space-y-1 pt-1">
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-500">Total jual</span>
              <span className="font-bold text-gray-900">{formatRupiah(total)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-500">Margin</span>
              <span className={`font-semibold text-sm ${margin >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                {formatRupiah(margin)}
              </span>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || !productId}
            className="w-full bg-emerald-600 text-white rounded-lg py-2.5 text-sm font-semibold hover:bg-emerald-700 transition-colors disabled:opacity-50"
          >
            {loading ? 'Menyimpan...' : 'Simpan Penjualan'}
          </button>
        </form>

        {/* Riwayat */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-gray-100 shadow-sm">
          <div className="px-4 md:px-5 py-3 md:py-4 border-b border-gray-100">
            <h2 className="font-semibold text-gray-900 text-sm md:text-base">Riwayat Penjualan</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-gray-500 border-b border-gray-100">
                  <th className="px-4 md:px-5 py-2.5 font-medium">Waktu</th>
                  <th className="px-3 py-2.5 font-medium">Produk</th>
                  <th className="px-3 py-2.5 font-medium text-right">Liter</th>
                  <th className="px-3 py-2.5 font-medium text-right">Harga/L</th>
                  <th className="px-3 py-2.5 font-medium text-right">Total</th>
                  <th className="px-4 md:px-5 py-2.5 font-medium text-right">Margin</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {sales.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-5 py-6 text-center text-gray-400">Belum ada penjualan</td>
                  </tr>
                )}
                {sales.map((s) => (
                  <tr key={s.id}>
                    <td className="px-4 md:px-5 py-3 text-gray-600 whitespace-nowrap">
                      {formatDateTime(s.soldAt)}
                      {s.note && <p className="text-xs text-gray-400">{s.note}</p>}
                    </td>
                    <td className="px-3 py-3 font-medium text-gray-900">{s.productName}</td>
                    <td className="px-3 py-3 text-right text-gray-800">
                      {s.liters.toLocaleString('id-ID', { maximumFractionDigits: 3 })}
                    </td>
                    <td className="px-3 py-3 text-right text-gray-600">{formatRupiah(s.sellPrice)}</td>
                    <td className="px-3 py-3 text-right font-semibold text-gray-900">{formatRupiah(s.total)}</td>
                    <td className={`px-4 md:px-5 py-3 text-right font-semibold ${s.margin >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                      {formatRupiah(s.margin)}
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
