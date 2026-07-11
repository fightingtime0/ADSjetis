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

type PurchaseLite = {
  id: string
  purchaseNumber: string
  productName: string
  liters: number
  buyPrice: number
  total: number
  note: string | null
  purchasedAt: string
}

export function BelanjaClient({ products, purchases }: { products: FuelProductLite[]; purchases: PurchaseLite[] }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  // Form belanja
  const [productId, setProductId] = useState(products[0]?.id ?? '')
  const [liters, setLiters] = useState('')
  const [buyPrice, setBuyPrice] = useState(products[0] ? String(products[0].buyPrice) : '')
  const [note, setNote] = useState('')

  // Form produk baru
  const [showNewProduct, setShowNewProduct] = useState(false)
  const [npName, setNpName] = useState('')
  const [npBuy, setNpBuy] = useState('')
  const [npSell, setNpSell] = useState('')

  const total = (parseFloat(liters) || 0) * (parseFloat(buyPrice) || 0)

  function onProductChange(id: string) {
    setProductId(id)
    const p = products.find((x) => x.id === id)
    if (p) setBuyPrice(String(p.buyPrice))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      const res = await fetch('/api/pertashop/belanja', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fuelProductId: productId,
          liters: parseFloat(liters),
          buyPrice: parseFloat(buyPrice),
          note: note || null,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        alert(data.error ?? 'Gagal mencatat belanja')
        return
      }
      setLiters('')
      setNote('')
      router.refresh()
    } finally {
      setLoading(false)
    }
  }

  async function handleNewProduct(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      const res = await fetch('/api/pertashop/produk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: npName, buyPrice: parseFloat(npBuy), sellPrice: parseFloat(npSell) }),
      })
      const data = await res.json()
      if (!res.ok) {
        alert(data.error ?? 'Gagal menambah produk')
        return
      }
      setNpName('')
      setNpBuy('')
      setNpSell('')
      setShowNewProduct(false)
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
          <h1 className="text-xl md:text-2xl font-bold text-gray-900">Belanja BBM</h1>
          <p className="text-xs md:text-sm text-gray-500">Catat pembelian BBM — liter & harga beli</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Form */}
        <div className="space-y-4">
          <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 md:p-5 space-y-3">
            <h2 className="font-semibold text-gray-900 text-sm md:text-base">Catat Belanja</h2>

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
                  placeholder="mis. 200"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Harga Beli / L</label>
                <input
                  type="number" step="1" min="1" required value={buyPrice}
                  onChange={(e) => setBuyPrice(e.target.value)}
                  placeholder="mis. 12400"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Catatan (opsional)</label>
              <input
                type="text" value={note} onChange={(e) => setNote(e.target.value)}
                placeholder="mis. beli di SPBU induk"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div className="flex items-center justify-between pt-1">
              <span className="text-xs text-gray-500">Total</span>
              <span className="font-bold text-gray-900">{formatRupiah(total)}</span>
            </div>

            <button
              type="submit"
              disabled={loading || !productId}
              className="w-full bg-emerald-600 text-white rounded-lg py-2.5 text-sm font-semibold hover:bg-emerald-700 transition-colors disabled:opacity-50"
            >
              {loading ? 'Menyimpan...' : 'Simpan Belanja'}
            </button>
          </form>

          {/* Produk baru */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 md:p-5">
            <button
              onClick={() => setShowNewProduct((v) => !v)}
              className="w-full text-left text-sm font-semibold text-gray-900 flex items-center justify-between"
            >
              Tambah Produk BBM
              <span className="text-gray-400">{showNewProduct ? '−' : '+'}</span>
            </button>
            {showNewProduct && (
              <form onSubmit={handleNewProduct} className="mt-3 space-y-3">
                <input
                  type="text" required value={npName} onChange={(e) => setNpName(e.target.value)}
                  placeholder="Nama (mis. Pertamax)"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
                <div className="grid grid-cols-2 gap-3">
                  <input
                    type="number" step="1" min="1" required value={npBuy} onChange={(e) => setNpBuy(e.target.value)}
                    placeholder="Harga beli/L"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                  <input
                    type="number" step="1" min="1" required value={npSell} onChange={(e) => setNpSell(e.target.value)}
                    placeholder="Harga jual/L"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <button
                  type="submit" disabled={loading}
                  className="w-full border border-emerald-600 text-emerald-700 rounded-lg py-2 text-sm font-semibold hover:bg-emerald-50 transition-colors disabled:opacity-50"
                >
                  Tambah Produk
                </button>
              </form>
            )}
          </div>
        </div>

        {/* Riwayat */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-gray-100 shadow-sm">
          <div className="px-4 md:px-5 py-3 md:py-4 border-b border-gray-100">
            <h2 className="font-semibold text-gray-900 text-sm md:text-base">Riwayat Belanja</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-gray-500 border-b border-gray-100">
                  <th className="px-4 md:px-5 py-2.5 font-medium">Waktu</th>
                  <th className="px-3 py-2.5 font-medium">Produk</th>
                  <th className="px-3 py-2.5 font-medium text-right">Liter</th>
                  <th className="px-3 py-2.5 font-medium text-right">Harga/L</th>
                  <th className="px-4 md:px-5 py-2.5 font-medium text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {purchases.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-5 py-6 text-center text-gray-400">Belum ada belanja</td>
                  </tr>
                )}
                {purchases.map((b) => (
                  <tr key={b.id}>
                    <td className="px-4 md:px-5 py-3 text-gray-600 whitespace-nowrap">
                      {formatDateTime(b.purchasedAt)}
                      {b.note && <p className="text-xs text-gray-400">{b.note}</p>}
                    </td>
                    <td className="px-3 py-3 font-medium text-gray-900">{b.productName}</td>
                    <td className="px-3 py-3 text-right text-gray-800">
                      {b.liters.toLocaleString('id-ID', { maximumFractionDigits: 3 })}
                    </td>
                    <td className="px-3 py-3 text-right text-gray-600">{formatRupiah(b.buyPrice)}</td>
                    <td className="px-4 md:px-5 py-3 text-right font-semibold text-gray-900">{formatRupiah(b.total)}</td>
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
