'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { formatRupiah } from '@/lib/utils'

type Supplier = { id: string; name: string }
type Product = { id: string; name: string; unit: string; costPrice: number; stock: number }
type POItem = { product: Product; qty: number; price: number }

export function BuatPOClient({ suppliers, products }: { suppliers: Supplier[]; products: Product[] }) {
  const router = useRouter()
  const [supplierId, setSupplierId] = useState('')
  const [note, setNote] = useState('')
  const [items, setItems] = useState<POItem[]>([])
  const [search, setSearch] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const filteredProducts = products.filter((p) =>
    !search || p.name.toLowerCase().includes(search.toLowerCase())
  )

  function addProduct(product: Product) {
    if (items.find((i) => i.product.id === product.id)) return
    setItems((prev) => [...prev, { product, qty: 1, price: product.costPrice }])
  }

  function updateItem(productId: string, field: 'qty' | 'price', value: number) {
    setItems((prev) => prev.map((i) =>
      i.product.id === productId ? { ...i, [field]: value } : i
    ))
  }

  function removeItem(productId: string) {
    setItems((prev) => prev.filter((i) => i.product.id !== productId))
  }

  const total = items.reduce((s, i) => s + i.qty * i.price, 0)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!supplierId) { setError('Pilih supplier'); return }
    if (items.length === 0) { setError('Tambahkan minimal 1 produk'); return }
    setError('')
    setSaving(true)

    try {
      const res = await fetch('/api/toko/pembelian', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          supplierId,
          note,
          items: items.map((i) => ({ productId: i.product.id, qty: i.qty, price: i.price })),
        }),
      })

      if (!res.ok) {
        const err = await res.json()
        setError(err.error ?? 'Gagal membuat PO')
        return
      }

      router.push('/toko/pembelian')
      router.refresh()
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-5 max-w-5xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Buat Purchase Order</h1>
        <p className="text-sm text-gray-500">Pembelian barang dari supplier</p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg">{error}</div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Kiri: Pilih Produk */}
          <div className="lg:col-span-2 space-y-4">
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
              <h2 className="font-semibold text-gray-900 mb-3">Pilih Produk</h2>
              <input
                type="text"
                placeholder="Cari produk..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full mb-3 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <div className="grid grid-cols-2 gap-2 max-h-64 overflow-y-auto">
                {filteredProducts.map((p) => {
                  const inList = items.some((i) => i.product.id === p.id)
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => addProduct(p)}
                      disabled={inList}
                      className={`text-left p-3 rounded-lg border text-sm transition-all ${
                        inList
                          ? 'bg-green-50 border-green-300 text-green-700'
                          : 'bg-gray-50 border-gray-200 hover:border-blue-300 hover:bg-blue-50'
                      }`}
                    >
                      <p className="font-medium truncate">{p.name}</p>
                      <p className="text-xs text-gray-400">Stok: {p.stock} {p.unit}</p>
                      <p className="text-xs text-blue-600">{formatRupiah(p.costPrice)}/{p.unit}</p>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Item List */}
            {items.length > 0 && (
              <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 text-xs text-gray-500 uppercase">
                      <th className="px-4 py-3 text-left font-semibold">Produk</th>
                      <th className="px-4 py-3 text-center font-semibold">Qty</th>
                      <th className="px-4 py-3 text-right font-semibold">Harga/Satuan</th>
                      <th className="px-4 py-3 text-right font-semibold">Subtotal</th>
                      <th className="px-4 py-3" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {items.map((item) => (
                      <tr key={item.product.id}>
                        <td className="px-4 py-3">
                          <p className="font-medium text-gray-900">{item.product.name}</p>
                          <p className="text-xs text-gray-400">{item.product.unit}</p>
                        </td>
                        <td className="px-4 py-3">
                          <input
                            type="number"
                            min={1}
                            value={item.qty}
                            onChange={(e) => updateItem(item.product.id, 'qty', Number(e.target.value))}
                            className="w-20 text-center border border-gray-200 rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                          />
                        </td>
                        <td className="px-4 py-3">
                          <input
                            type="number"
                            min={0}
                            value={item.price}
                            onChange={(e) => updateItem(item.product.id, 'price', Number(e.target.value))}
                            className="w-32 text-right border border-gray-200 rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                          />
                        </td>
                        <td className="px-4 py-3 text-right font-semibold text-gray-900">
                          {formatRupiah(item.qty * item.price)}
                        </td>
                        <td className="px-4 py-3">
                          <button
                            type="button"
                            onClick={() => removeItem(item.product.id)}
                            className="text-red-400 hover:text-red-600"
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t border-gray-200 bg-gray-50">
                      <td colSpan={3} className="px-4 py-3 font-bold text-gray-900 text-right">Total</td>
                      <td className="px-4 py-3 font-bold text-right text-blue-700">{formatRupiah(total)}</td>
                      <td />
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </div>

          {/* Kanan: Info PO */}
          <div className="space-y-4">
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 space-y-4">
              <h2 className="font-semibold text-gray-900">Detail PO</h2>

              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">Supplier *</label>
                <select
                  value={supplierId}
                  onChange={(e) => setSupplierId(e.target.value)}
                  required
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Pilih Supplier</option>
                  {suppliers.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">Catatan</label>
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  placeholder="Catatan tambahan..."
                />
              </div>

              <div className="pt-2 border-t border-gray-100">
                <div className="flex justify-between text-sm font-bold text-gray-900 mb-4">
                  <span>Total PO</span>
                  <span className="text-blue-700">{formatRupiah(total)}</span>
                </div>

                <button
                  type="submit"
                  disabled={saving || items.length === 0}
                  className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold rounded-lg text-sm transition-colors"
                >
                  {saving ? 'Menyimpan...' : 'Simpan sebagai Draft'}
                </button>
                <button
                  type="button"
                  onClick={() => router.back()}
                  className="w-full mt-2 py-2.5 text-sm text-gray-600 hover:text-gray-800 transition-colors"
                >
                  Batal
                </button>
              </div>
            </div>
          </div>
        </div>
      </form>
    </div>
  )
}


