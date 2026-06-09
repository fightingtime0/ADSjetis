'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { formatRupiah } from '@/lib/utils'

type Unit = { id: string; name: string; type: string; taxRate: number }
type Product = { id: string; name: string; unit: string; sellPrice: number; stock: number }
type LineItem = { sellerProductId: string; productName: string; productUnit: string; qty: number; price: number }

export function B2BInvoiceFormClient({
  units,
  defaultSellerUnitId,
  products,
}: {
  units: Unit[]
  defaultSellerUnitId: string
  products: Product[]
}) {
  const router = useRouter()
  const [sellerUnitId, setSellerUnitId] = useState(defaultSellerUnitId)
  const [buyerUnitId,  setBuyerUnitId]  = useState('')
  const [dueDate,      setDueDate]      = useState('')
  const [discount,     setDiscount]     = useState(0)
  const [note,         setNote]         = useState('')
  const [items,        setItems]        = useState<LineItem[]>([])
  const [loading,      setLoading]      = useState(false)
  const [error,        setError]        = useState('')

  const sellerUnit = units.find((u) => u.id === sellerUnitId)
  const taxRate    = sellerUnit?.taxRate ?? 0

  function addProduct(product: Product) {
    setItems((prev) => {
      const exists = prev.find((i) => i.sellerProductId === product.id)
      if (exists) {
        return prev.map((i) =>
          i.sellerProductId === product.id
            ? { ...i, qty: i.qty + 1 }
            : i
        )
      }
      return [...prev, {
        sellerProductId: product.id,
        productName:     product.name,
        productUnit:     product.unit,
        qty:             1,
        price:           product.sellPrice,
      }]
    })
  }

  function updateItem(idx: number, field: 'qty' | 'price', value: number) {
    setItems((prev) => prev.map((item, i) => i === idx ? { ...item, [field]: value } : item))
  }

  function removeItem(idx: number) {
    setItems((prev) => prev.filter((_, i) => i !== idx))
  }

  const subtotal    = items.reduce((s, i) => s + i.qty * i.price, 0)
  const taxNominal  = ((subtotal - discount) * taxRate) / 100
  const total       = subtotal - discount + taxNominal

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!buyerUnitId)   return setError('Pilih unit pembeli')
    if (items.length === 0) return setError('Tambahkan minimal satu produk')
    if (sellerUnitId === buyerUnitId) return setError('Unit penjual dan pembeli tidak boleh sama')

    setLoading(true); setError('')

    const res = await fetch('/api/b2b/invoice', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sellerUnitId, buyerUnitId, items, discount, dueDate: dueDate || undefined, note: note || undefined }),
    })
    const data = await res.json()
    setLoading(false)
    if (!res.ok) return setError(data.error ?? 'Gagal membuat invoice')
    router.push(`/b2b/${data.id}`)
  }

  return (
    <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-5 gap-6">
      {/* ── Kiri: Produk Toko ─── */}
      <div className="lg:col-span-3 space-y-5">
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <h2 className="text-sm font-semibold text-gray-700 mb-4">Pilih Produk dari Toko</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-64 overflow-y-auto">
            {products.map((p) => (
              <button key={p.id} type="button" onClick={() => addProduct(p)}
                className="flex items-center justify-between text-left px-3 py-2.5 rounded-lg border border-gray-200 hover:border-indigo-300 hover:bg-indigo-50/30 transition-colors">
                <div>
                  <p className="text-sm font-medium text-gray-800">{p.name}</p>
                  <p className="text-xs text-gray-400">Stok: {p.stock} {p.unit}</p>
                </div>
                <span className="text-xs font-semibold text-indigo-600">{formatRupiah(p.sellPrice)}</span>
              </button>
            ))}
            {products.length === 0 && (
              <p className="text-sm text-gray-400 col-span-full text-center py-4">Tidak ada produk Toko tersedia</p>
            )}
          </div>
        </div>

        {/* Item list */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <h2 className="text-sm font-semibold text-gray-700 mb-4">Item Invoice</h2>
          {items.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-6">Belum ada item — klik produk di atas</p>
          ) : (
            <div className="space-y-2">
              <div className="grid grid-cols-12 text-xs text-gray-400 font-medium uppercase px-2">
                <span className="col-span-4">Produk</span>
                <span className="col-span-2 text-center">Qty</span>
                <span className="col-span-3 text-right">Harga</span>
                <span className="col-span-2 text-right">Subtotal</span>
                <span className="col-span-1" />
              </div>
              {items.map((item, idx) => {
                const product = products.find((p) => p.id === item.sellerProductId)
                return (
                  <div key={idx} className="grid grid-cols-12 items-center gap-1 bg-gray-50 rounded-lg px-2 py-2">
                    <div className="col-span-4">
                      <p className="text-sm font-medium text-gray-800">{item.productName}</p>
                      <p className="text-xs text-gray-400">{item.productUnit} · stok: {product?.stock ?? 0}</p>
                    </div>
                    <div className="col-span-2">
                      <input type="number" min={1} max={product?.stock ?? 999} value={item.qty}
                        onChange={(e) => updateItem(idx, 'qty', Number(e.target.value))}
                        className="w-full text-center border border-gray-200 rounded px-1 py-1 text-sm" />
                    </div>
                    <div className="col-span-3">
                      <input type="number" min={0} value={item.price}
                        onChange={(e) => updateItem(idx, 'price', Number(e.target.value))}
                        className="w-full text-right border border-gray-200 rounded px-1 py-1 text-sm" />
                    </div>
                    <div className="col-span-2 text-right text-sm font-semibold text-gray-700">
                      {formatRupiah(item.qty * item.price)}
                    </div>
                    <div className="col-span-1 text-right">
                      <button type="button" onClick={() => removeItem(idx)}
                        className="text-red-400 hover:text-red-600 text-lg leading-none">×</button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* ── Kanan: Info + Ringkasan ─── */}
      <div className="lg:col-span-2 space-y-5">
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 space-y-4">
          <h2 className="text-sm font-semibold text-gray-700">Detail Invoice</h2>

          <div>
            <label className="block text-xs text-gray-500 mb-1">Unit Penjual *</label>
            <select value={sellerUnitId} onChange={(e) => setSellerUnitId(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400">
              {units.map((u) => <option key={u.id} value={u.id}>{u.name} ({u.type})</option>)}
            </select>
          </div>

          <div>
            <label className="block text-xs text-gray-500 mb-1">Unit Pembeli *</label>
            <select value={buyerUnitId} onChange={(e) => setBuyerUnitId(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400">
              <option value="">— Pilih unit —</option>
              {units.filter((u) => u.id !== sellerUnitId).map((u) => (
                <option key={u.id} value={u.id}>{u.name} ({u.type})</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs text-gray-500 mb-1">Jatuh Tempo</label>
            <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" />
          </div>

          <div>
            <label className="block text-xs text-gray-500 mb-1">Diskon (Rp)</label>
            <input type="number" min={0} value={discount} onChange={(e) => setDiscount(Number(e.target.value))}
              className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" />
          </div>

          <div>
            <label className="block text-xs text-gray-500 mb-1">Catatan</label>
            <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} placeholder="Opsional"
              className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 resize-none" />
          </div>
        </div>

        {/* Ringkasan */}
        <div className="bg-indigo-50 rounded-xl border border-indigo-200 p-4 space-y-2">
          <p className="text-xs font-semibold text-indigo-700 uppercase tracking-wide">Ringkasan</p>
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Subtotal</span>
            <span>{formatRupiah(subtotal)}</span>
          </div>
          {discount > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Diskon</span>
              <span className="text-red-600">−{formatRupiah(discount)}</span>
            </div>
          )}
          {taxRate > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Pajak ({taxRate}%)</span>
              <span>{formatRupiah(taxNominal)}</span>
            </div>
          )}
          <div className="flex justify-between text-base font-bold text-indigo-800 border-t border-indigo-200 pt-2">
            <span>Total</span>
            <span>{formatRupiah(total)}</span>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        <div className="flex gap-3">
          <button type="button" onClick={() => router.back()}
            className="flex-1 py-3 border border-gray-200 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-50">
            Batal
          </button>
          <button type="submit" disabled={loading || items.length === 0}
            className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white rounded-xl text-sm font-semibold transition-colors">
            {loading ? 'Menyimpan...' : 'Buat Invoice'}
          </button>
        </div>
      </div>
    </form>
  )
}


