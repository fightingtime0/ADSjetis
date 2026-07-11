'use client'

import { useState, useOptimistic, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { formatRupiah, formatDateTime } from '@/lib/utils'
import { Receipt, printReceipt, type ReceiptData } from '@/components/receipt'

type MenuItem = { id: string; name: string; price: number; taxRate: number; category: { id: string; name: string } | null }
type Category = { id: string; name: string }
type OrderItem = {
  id: string
  menuItemId: string
  qty: number
  price: number
  subtotal: number
  note: string | null
  status: string
  menuItem: { id: string; name: string; price: number }
}
type Order = {
  id: string
  orderNumber: string
  tableNumber: string
  guestCount: number | null
  status: string
  subtotal: number
  discount: number
  taxRate: number
  tax: number
  total: number
  openedAt: Date
  items: OrderItem[]
}

type Props = {
  order: Order
  menuItems: MenuItem[]
  categories: Category[]
  taxRate: number
  unitName: string
  unitLocation: string | null
}

const ITEM_STATUS_STYLE: Record<string, string> = {
  PENDING:   'bg-yellow-100 text-yellow-700',
  COOKING:   'bg-blue-100 text-blue-700',
  SERVED:    'bg-green-100 text-green-700',
  CANCELLED: 'bg-red-100 text-red-600 line-through',
}
const ITEM_STATUS_LABEL: Record<string, string> = {
  PENDING: 'Pending', COOKING: 'Memasak', SERVED: 'Tersaji', CANCELLED: 'Batal',
}
const ITEM_STATUS_NEXT: Record<string, string> = {
  PENDING: 'COOKING', COOKING: 'SERVED',
}

const PAYMENT_METHODS = [
  { value: 'CASH', label: 'Tunai' },
  { value: 'QRIS', label: 'QRIS' },
  { value: 'TRANSFER', label: 'Transfer' },
  { value: 'CARD', label: 'Kartu' },
]

export function OrderMejaClient({ order: initialOrder, menuItems, categories, taxRate, unitName, unitLocation }: Props) {
  const router = useRouter()
  const [, startTransition] = useTransition()
  const [order, setOrder] = useState(initialOrder)
  const [filterCat, setFilterCat] = useState('')
  const [searchMenu, setSearchMenu] = useState('')
  const [addingItem, setAddingItem] = useState<string | null>(null)
  const [noteInput, setNoteInput] = useState('')
  const [showPayModal, setShowPayModal] = useState(false)
  const [payMethod, setPayMethod] = useState('CASH')
  const [discount, setDiscount] = useState(0)
  const [paying, setPaying] = useState(false)
  const [payError, setPayError] = useState('')
  const [paidReceipt, setPaidReceipt] = useState<ReceiptData | null>(null)
  // Mobile: toggle antara panel Menu dan panel Order
  const [activeTab, setActiveTab] = useState<'menu' | 'order'>('menu')

  const isEditable = order.status === 'OPEN'
  const isBillable = order.status === 'OPEN' || order.status === 'BILLED'

  const filteredMenus = menuItems.filter((m) => {
    const matchCat = !filterCat || m.category?.id === filterCat
    const matchSearch = !searchMenu || m.name.toLowerCase().includes(searchMenu.toLowerCase())
    return matchCat && matchSearch
  })

  const activeItems = order.items.filter((i) => i.status !== 'CANCELLED')
  const subtotal = activeItems.reduce((s, i) => s + i.subtotal, 0)
  const tax = Math.round(((subtotal - discount) * taxRate) / 100)
  const total = subtotal - discount + tax

  async function addItem(menuItem: MenuItem) {
    if (!isEditable) return
    setAddingItem(menuItem.id)
    try {
      const res = await fetch(`/api/restoran/meja/${order.id}/items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ menuItemId: menuItem.id, qty: 1, note: noteInput || null }),
      })
      if (!res.ok) { const e = await res.json(); alert(e.error); return }
      const newItem = await res.json()

      setOrder((prev) => {
        const exists = prev.items.find((i) => i.id === newItem.id)
        const items = exists
          ? prev.items.map((i) => i.id === newItem.id ? { ...i, qty: newItem.qty, subtotal: newItem.subtotal } : i)
          : [...prev.items, { ...newItem, price: Number(newItem.price), subtotal: Number(newItem.subtotal) }]
        return { ...prev, items }
      })
    } finally {
      setAddingItem(null)
    }
  }

  async function updateItemStatus(itemId: string, status: string) {
    const res = await fetch(`/api/restoran/meja/${order.id}/items`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ itemId, status }),
    })
    if (!res.ok) return
    const updated = await res.json()
    setOrder((prev) => ({
      ...prev,
      items: prev.items.map((i) => i.id === itemId ? { ...i, status: updated.status } : i),
    }))
  }

  async function removeItem(itemId: string) {
    if (!confirm('Hapus item ini dari order?')) return
    const res = await fetch(`/api/restoran/meja/${order.id}/items?itemId=${itemId}`, { method: 'DELETE' })
    if (!res.ok) return
    setOrder((prev) => ({ ...prev, items: prev.items.filter((i) => i.id !== itemId) }))
  }

  async function handlePay() {
    setPayError('')
    setPaying(true)
    try {
      const res = await fetch(`/api/restoran/meja/${order.id}/bayar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paymentMethod: payMethod, discount }),
      })
      const data = await res.json()
      if (!res.ok) { setPayError(data.error ?? 'Gagal melakukan pembayaran'); return }
      setShowPayModal(false)
      // Tampilkan modal sukses + opsi cetak struk sebelum kembali ke daftar meja
      setPaidReceipt({
        storeName: unitName,
        storeLocation: unitLocation,
        invoiceNumber: order.orderNumber,
        dateTime: data.paidAt ?? new Date(),
        items: activeItems.map((i) => ({
          name: i.menuItem.name,
          qty: i.qty,
          price: i.price,
          subtotal: i.subtotal,
        })),
        subtotal,
        discount,
        tax,
        total,
        paymentMethod: payMethod,
        footerNote: `Meja ${order.tableNumber} — Terima kasih`,
      })
    } finally {
      setPaying(false)
    }
  }

  function finishAfterPay() {
    setPaidReceipt(null)
    router.push('/restoran')
    router.refresh()
  }

  return (
    <>
    {/* ── Mobile Tab Bar ─────────────────────────────────────────
        Hanya tampil di layar < md. Desktop: panel selalu side-by-side.
    ──────────────────────────────────────────────────────────── */}
    <div className="flex md:hidden mb-3 bg-white border border-gray-100 rounded-xl overflow-hidden shadow-sm">
      <button
        onClick={() => setActiveTab('menu')}
        className={`flex-1 py-2.5 text-sm font-semibold transition-colors ${
          activeTab === 'menu'
            ? 'bg-orange-600 text-white'
            : 'text-gray-600 hover:bg-gray-50'
        }`}
      >
        🍽 Menu
      </button>
      <button
        onClick={() => setActiveTab('order')}
        className={`flex-1 py-2.5 text-sm font-semibold transition-colors relative ${
          activeTab === 'order'
            ? 'bg-orange-600 text-white'
            : 'text-gray-600 hover:bg-gray-50'
        }`}
      >
        Order{activeItems.length > 0 ? ` (${activeItems.length})` : ''}
        {/* Dot indicator saat ada item & sedang lihat tab menu */}
        {activeItems.length > 0 && activeTab !== 'order' && (
          <span className="absolute top-2 right-4 w-2 h-2 rounded-full bg-orange-500" />
        )}
      </button>
    </div>

    {/* ── Panel Wrapper ──────────────────────────────────────────
        Mobile:  flex-col, panel aktif penuh lebar, panel lain hidden
        Desktop: flex-row side-by-side dengan tinggi tetap
    ──────────────────────────────────────────────────────────── */}
    <div className="flex flex-col md:flex-row md:gap-5 md:h-[calc(100vh-120px)] gap-0">
      {/* Kiri: Pilih Menu */}
      <div className={`flex-1 flex flex-col min-w-0 ${activeTab !== 'menu' ? 'hidden md:flex' : ''}`}>
        <div className="mb-4 flex gap-3 flex-wrap">
          <input
            type="text"
            placeholder="Cari menu..."
            value={searchMenu}
            onChange={(e) => setSearchMenu(e.target.value)}
            disabled={!isEditable}
            className="flex-1 min-w-40 px-4 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 disabled:bg-gray-50 disabled:text-gray-400"
          />
          <select
            value={filterCat}
            onChange={(e) => setFilterCat(e.target.value)}
            disabled={!isEditable}
            className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none disabled:bg-gray-50"
          >
            <option value="">Semua Kategori</option>
            {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>

        {!isEditable && (
          <div className="mb-3 px-4 py-2.5 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-700 font-medium">
            {order.status === 'BILLED' ? '📋 Order sedang dalam proses tagihan' : '✅ Order sudah selesai'}
          </div>
        )}

        <div className="flex-1 overflow-y-auto">
          <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3">
            {filteredMenus.map((m) => (
              <button
                key={m.id}
                onClick={() => addItem(m)}
                disabled={!isEditable || addingItem === m.id}
                className="text-left bg-white border border-gray-100 shadow-sm rounded-xl p-3.5 hover:border-orange-300 hover:shadow-md active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {m.category && (
                  <p className="text-xs text-orange-500 font-medium mb-1">{m.category.name}</p>
                )}
                <p className="text-sm font-semibold text-gray-900 leading-snug">{m.name}</p>
                <p className="text-base font-bold text-orange-600 mt-2">{formatRupiah(m.price)}</p>
                {m.taxRate > 0 && <p className="text-xs text-gray-400 mt-0.5">+{m.taxRate}% pajak</p>}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Kanan: Order Detail */}
      <div className={`md:w-80 xl:w-96 flex flex-col bg-white rounded-2xl border border-gray-100 shadow-sm flex-shrink-0 ${activeTab !== 'order' ? 'hidden md:flex' : ''}`}>
        {/* Header */}
        <div className="px-5 py-4 border-b border-gray-100">
          <div className="flex items-center justify-between mb-1">
            <h2 className="font-bold text-gray-900 text-lg">Meja {order.tableNumber}</h2>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
              order.status === 'OPEN' ? 'bg-amber-100 text-amber-700' :
              order.status === 'BILLED' ? 'bg-blue-100 text-blue-700' :
              'bg-green-100 text-green-700'
            }`}>{order.status}</span>
          </div>
          <p className="text-xs text-gray-400">{order.orderNumber} · {formatDateTime(order.openedAt)}</p>
          {order.guestCount && <p className="text-xs text-gray-400">{order.guestCount} tamu</p>}
        </div>

        {/* Item List */}
        <div className="flex-1 overflow-y-auto divide-y divide-gray-50">
          {order.items.length === 0 && (
            <div className="py-16 text-center text-sm text-gray-400">
              <p className="text-3xl mb-2">🍽</p>
              <span className="md:hidden">Belum ada item. Pilih dari tab Menu.</span>
              <span className="hidden md:inline">Belum ada item. Pilih menu dari kiri.</span>
            </div>
          )}

          {order.items.map((item) => (
            <div key={item.id} className={`px-5 py-3 ${item.status === 'CANCELLED' ? 'opacity-40' : ''}`}>
              <div className="flex items-start gap-2 mb-1.5">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900">{item.menuItem.name}</p>
                  {item.note && <p className="text-xs text-gray-400 italic">"{item.note}"</p>}
                </div>
                {isEditable && item.status === 'PENDING' && (
                  <button onClick={() => removeItem(item.id)} className="text-gray-300 hover:text-red-500">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${ITEM_STATUS_STYLE[item.status]}`}>
                    {ITEM_STATUS_LABEL[item.status]}
                  </span>
                  {ITEM_STATUS_NEXT[item.status] && (
                    <button
                      onClick={() => updateItemStatus(item.id, ITEM_STATUS_NEXT[item.status])}
                      className="text-xs text-blue-600 hover:underline"
                    >
                      → {ITEM_STATUS_LABEL[ITEM_STATUS_NEXT[item.status]]}
                    </button>
                  )}
                </div>
                <div className="text-right">
                  <p className="text-xs text-gray-400">×{item.qty}</p>
                  <p className="text-sm font-semibold text-gray-800">{formatRupiah(item.subtotal)}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Footer: Ringkasan + Bayar */}
        <div className="px-5 py-4 border-t border-gray-100 space-y-3">
          <div className="space-y-1 text-sm">
            <div className="flex justify-between text-gray-500">
              <span>Subtotal ({activeItems.length} item)</span>
              <span>{formatRupiah(subtotal)}</span>
            </div>
            {taxRate > 0 && (
              <div className="flex justify-between text-gray-500">
                <span>Pajak ({taxRate}%)</span>
                <span>{formatRupiah(tax)}</span>
              </div>
            )}
            <div className="flex justify-between font-bold text-gray-900 text-base pt-1 border-t border-gray-100">
              <span>Total</span>
              <span className="text-orange-600">{formatRupiah(total)}</span>
            </div>
          </div>

          {isBillable && activeItems.length > 0 && (
            <button
              onClick={() => setShowPayModal(true)}
              className="w-full py-3 bg-orange-600 hover:bg-orange-700 text-white font-bold rounded-xl text-base transition-colors"
            >
              Bayar {formatRupiah(total)}
            </button>
          )}

          <button
            onClick={() => router.push('/restoran')}
            className="w-full py-2 text-sm text-gray-500 hover:text-gray-700 transition-colors"
          >
            ← Kembali ke Daftar Meja
          </button>
        </div>
      </div>
    </div>{/* end panel wrapper */}

    {/* Modal Bayar */}
      {showPayModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm">
            <div className="px-6 py-5 border-b border-gray-100">
              <h3 className="text-lg font-bold text-gray-900">Pembayaran</h3>
              <p className="text-sm text-gray-500">Meja {order.tableNumber} · {order.orderNumber}</p>
            </div>

            <div className="p-6 space-y-4">
              {payError && (
                <div className="text-sm bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                  {payError}
                </div>
              )}

              {/* Detail tagihan */}
              <div className="space-y-1.5 text-sm bg-gray-50 rounded-xl p-4">
                {activeItems.map((item) => (
                  <div key={item.id} className="flex justify-between text-gray-700">
                    <span>{item.menuItem.name} ×{item.qty}</span>
                    <span>{formatRupiah(item.subtotal)}</span>
                  </div>
                ))}
                <div className="border-t border-gray-200 pt-2 mt-2 space-y-1">
                  <div className="flex justify-between items-center text-gray-600">
                    <span>Diskon (Rp)</span>
                    <input
                      type="number"
                      min={0}
                      max={subtotal}
                      value={discount}
                      onChange={(e) => setDiscount(Number(e.target.value))}
                      className="w-28 text-right text-sm border border-gray-200 rounded px-2 py-0.5 focus:outline-none focus:ring-1 focus:ring-orange-500"
                    />
                  </div>
                  {taxRate > 0 && (
                    <div className="flex justify-between text-gray-600">
                      <span>Pajak ({taxRate}%)</span>
                      <span>{formatRupiah(Math.round(((subtotal - discount) * taxRate) / 100))}</span>
                    </div>
                  )}
                  <div className="flex justify-between font-bold text-gray-900 text-base">
                    <span>Total</span>
                    <span className="text-orange-600">
                      {formatRupiah(subtotal - discount + Math.round(((subtotal - discount) * taxRate) / 100))}
                    </span>
                  </div>
                </div>
              </div>

              {/* Metode */}
              <div>
                <p className="text-xs font-medium text-gray-600 mb-2">Metode Pembayaran</p>
                <div className="grid grid-cols-4 gap-2">
                  {PAYMENT_METHODS.map((m) => (
                    <button
                      key={m.value}
                      onClick={() => setPayMethod(m.value)}
                      className={`py-2 text-xs font-medium rounded-lg transition-colors ${
                        payMethod === m.value
                          ? 'bg-orange-600 text-white'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="px-6 pb-6 flex gap-3">
              <button
                onClick={() => { setShowPayModal(false); setPayError('') }}
                className="flex-1 py-2.5 border border-gray-200 text-sm text-gray-600 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Batal
              </button>
              <button
                onClick={handlePay}
                disabled={paying}
                className="flex-1 py-2.5 bg-orange-600 hover:bg-orange-700 text-white font-bold rounded-lg text-sm disabled:opacity-50 transition-colors"
              >
                {paying ? 'Memproses...' : 'Konfirmasi Bayar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal sukses bayar + cetak struk */}
      {paidReceipt && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm">
            <div className="p-6 text-center border-b border-gray-100">
              <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <svg className="w-7 h-7 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h3 className="text-lg font-bold text-gray-900">Pembayaran Berhasil!</h3>
              <p className="text-sm text-gray-500 mt-1">
                Meja {order.tableNumber} · {paidReceipt.invoiceNumber}
              </p>
              <p className="text-2xl font-bold text-gray-900 mt-2">{formatRupiah(paidReceipt.total)}</p>
            </div>
            <div className="px-5 py-5 flex gap-3">
              <button
                onClick={printReceipt}
                className="flex-1 py-2.5 border border-gray-300 hover:bg-gray-50 text-gray-700 font-semibold rounded-lg text-sm transition-colors"
              >
                🖨 Cetak Struk
              </button>
              <button
                onClick={finishAfterPay}
                className="flex-1 py-2.5 bg-orange-600 hover:bg-orange-700 text-white font-semibold rounded-lg text-sm transition-colors"
              >
                Selesai
              </button>
            </div>
          </div>

          {/* Struk print (hanya muncul saat cetak) */}
          <Receipt data={paidReceipt} />
        </div>
      )}
    </>
  )
}


