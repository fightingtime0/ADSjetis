'use client'

import { useState } from 'react'
import { formatRupiah } from '@/lib/utils'
import type { Role } from '@prisma/client'

type Product = { id: string; name: string; unit: string }
type Category = { id: string; name: string }
type Ingredient = { id: string; qtyUsed: number; product: Product }
type MenuItem = {
  id: string
  name: string
  description: string | null
  price: number
  taxRate: number
  isAvailable: boolean
  menuCategory: Category | null
  ingredients: Ingredient[]
}

type Props = {
  menuItems: MenuItem[]
  categories: Category[]
  products: Product[]
  taxRate: number
  userRole: Role
}

const canEdit = (role: Role) => ['OWNER', 'MANAGER'].includes(role)

const emptyForm = {
  name: '',
  description: '',
  price: '',
  taxRate: '',
  menuCategoryId: '',
  isAvailable: true,
  ingredients: [] as { productId: string; qtyUsed: string }[],
}

export function MenuClient({ menuItems: initialItems, categories, products, taxRate, userRole }: Props) {
  const [items, setItems] = useState(initialItems)
  const [search, setSearch] = useState('')
  const [filterCat, setFilterCat] = useState('')
  const [showUnavailable, setShowUnavailable] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editItem, setEditItem] = useState<MenuItem | null>(null)
  const [form, setForm] = useState({ ...emptyForm, taxRate: taxRate.toString() })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const filtered = items.filter((m) => {
    const matchSearch = !search || m.name.toLowerCase().includes(search.toLowerCase())
    const matchCat = !filterCat || m.menuCategory?.id === filterCat
    const matchAvail = showUnavailable || m.isAvailable
    return matchSearch && matchCat && matchAvail
  })

  // Group by category
  const grouped = categories.reduce((acc, cat) => {
    const catItems = filtered.filter((m) => m.menuCategory?.id === cat.id)
    if (catItems.length > 0) acc.push({ category: cat, items: catItems })
    return acc
  }, [] as { category: Category; items: MenuItem[] }[])
  const uncategorized = filtered.filter((m) => !m.menuCategory)
  if (uncategorized.length > 0) grouped.push({ category: { id: 'none', name: 'Lainnya' }, items: uncategorized })

  function openAdd() {
    setEditItem(null)
    setForm({ ...emptyForm, taxRate: taxRate.toString() })
    setError('')
    setShowForm(true)
  }

  function openEdit(item: MenuItem) {
    setEditItem(item)
    setForm({
      name: item.name,
      description: item.description ?? '',
      price: item.price.toString(),
      taxRate: item.taxRate.toString(),
      menuCategoryId: item.menuCategory?.id ?? '',
      isAvailable: item.isAvailable,
      ingredients: item.ingredients.map((ing) => ({
        productId: ing.product.id,
        qtyUsed: ing.qtyUsed.toString(),
      })),
    })
    setError('')
    setShowForm(true)
  }

  function addIngredient() {
    setForm((f) => ({ ...f, ingredients: [...f.ingredients, { productId: '', qtyUsed: '' }] }))
  }

  function updateIngredient(idx: number, field: 'productId' | 'qtyUsed', val: string) {
    setForm((f) => {
      const ings = [...f.ingredients]
      ings[idx] = { ...ings[idx], [field]: val }
      return { ...f, ingredients: ings }
    })
  }

  function removeIngredient(idx: number) {
    setForm((f) => ({ ...f, ingredients: f.ingredients.filter((_, i) => i !== idx) }))
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setSaving(true)

    const payload = {
      name: form.name,
      description: form.description || null,
      price: parseFloat(form.price),
      taxRate: parseFloat(form.taxRate),
      menuCategoryId: form.menuCategoryId || null,
      isAvailable: form.isAvailable,
      ingredients: form.ingredients
        .filter((ing) => ing.productId && ing.qtyUsed)
        .map((ing) => ({ productId: ing.productId, qtyUsed: parseFloat(ing.qtyUsed) })),
    }

    try {
      const url = editItem ? `/api/restoran/menu/${editItem.id}` : '/api/restoran/menu'
      const method = editItem ? 'PUT' : 'POST'
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
      if (!res.ok) { const e = await res.json(); setError(e.error ?? 'Gagal menyimpan'); return }

      const saved = await res.json()
      const normalized: MenuItem = {
        ...saved,
        price: Number(saved.price),
        taxRate: Number(saved.taxRate),
        ingredients: (saved.ingredients ?? []).map((ing: any) => ({ ...ing, qtyUsed: Number(ing.qtyUsed) })),
      }

      if (editItem) {
        setItems((prev) => prev.map((m) => m.id === editItem.id ? normalized : m))
      } else {
        setItems((prev) => [...prev, normalized])
      }
      setShowForm(false)
    } finally {
      setSaving(false)
    }
  }

  async function toggleAvailable(item: MenuItem) {
    const res = await fetch(`/api/restoran/menu/${item.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isAvailable: !item.isAvailable }),
    })
    if (!res.ok) return
    setItems((prev) => prev.map((m) => m.id === item.id ? { ...m, isAvailable: !m.isAvailable } : m))
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Manajemen Menu</h1>
          <p className="text-sm text-gray-500">{items.length} menu terdaftar</p>
        </div>
        {canEdit(userRole) && (
          <button
            onClick={openAdd}
            className="inline-flex items-center gap-2 bg-orange-600 hover:bg-orange-700 text-white text-sm font-semibold px-4 py-2.5 rounded-lg transition-colors"
          >
            + Tambah Menu
          </button>
        )}
      </div>

      {/* Filter */}
      <div className="flex flex-wrap gap-3">
        <input
          type="text"
          placeholder="Cari menu..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 min-w-48 px-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
        />
        <select
          value={filterCat}
          onChange={(e) => setFilterCat(e.target.value)}
          className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none"
        >
          <option value="">Semua Kategori</option>
          {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <label className="flex items-center gap-2 px-3 py-2 text-sm border border-gray-200 rounded-lg cursor-pointer">
          <input type="checkbox" checked={showUnavailable} onChange={(e) => setShowUnavailable(e.target.checked)} />
          Tampilkan yang tidak aktif
        </label>
      </div>

      {/* Menu grouped by category */}
      <div className="space-y-6">
        {grouped.map(({ category, items: catItems }) => (
          <div key={category.id}>
            <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wide mb-3">{category.name}</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {catItems.map((item) => (
                <div
                  key={item.id}
                  className={`bg-white rounded-xl border shadow-sm p-4 transition-all ${
                    item.isAvailable ? 'border-gray-100' : 'border-dashed border-gray-200 opacity-60'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div>
                      <p className="font-semibold text-gray-900">{item.name}</p>
                      {item.description && <p className="text-xs text-gray-400 mt-0.5">{item.description}</p>}
                    </div>
                    {!item.isAvailable && (
                      <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full flex-shrink-0">Habis</span>
                    )}
                  </div>

                  <p className="text-base font-bold text-orange-600">
                    {formatRupiah(item.price)}
                    {item.taxRate > 0 && <span className="text-xs font-normal text-gray-400 ml-1">+{item.taxRate}%</span>}
                  </p>

                  {item.ingredients.length > 0 && (
                    <div className="mt-2 pt-2 border-t border-gray-50">
                      <p className="text-xs text-gray-400 font-medium mb-1">Resep:</p>
                      {item.ingredients.map((ing) => (
                        <p key={ing.id} className="text-xs text-gray-500">
                          {ing.product.name}: {ing.qtyUsed} {ing.product.unit}
                        </p>
                      ))}
                    </div>
                  )}

                  {canEdit(userRole) && (
                    <div className="flex gap-2 mt-3 pt-2 border-t border-gray-50">
                      <button onClick={() => openEdit(item)} className="text-xs text-blue-600 hover:underline font-medium">
                        Edit
                      </button>
                      <button onClick={() => toggleAvailable(item)} className="text-xs text-gray-500 hover:text-gray-700">
                        {item.isAvailable ? 'Tandai Habis' : 'Tandai Tersedia'}
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
        {grouped.length === 0 && (
          <div className="py-16 text-center text-sm text-gray-400">Tidak ada menu ditemukan</div>
        )}
      </div>

      {/* Modal Form */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between">
              <h3 className="text-base font-bold text-gray-900">
                {editItem ? 'Edit Menu' : 'Tambah Menu Baru'}
              </h3>
              <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleSave} className="p-6 space-y-4">
              {error && (
                <div className="text-sm text-red-600 bg-red-50 border border-red-200 px-4 py-3 rounded-lg">{error}</div>
              )}

              <Field label="Nama Menu *">
                <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required className={inp} placeholder="Nasi Ayam Goreng" />
              </Field>

              <Field label="Deskripsi">
                <input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className={inp} placeholder="Deskripsi singkat menu" />
              </Field>

              <div className="grid grid-cols-2 gap-3">
                <Field label="Harga (Rp) *">
                  <input type="number" min={0} value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} required className={inp} />
                </Field>
                <Field label="Pajak (%)">
                  <input type="number" min={0} max={100} value={form.taxRate} onChange={(e) => setForm({ ...form, taxRate: e.target.value })} className={inp} />
                </Field>
              </div>

              <Field label="Kategori">
                <select value={form.menuCategoryId} onChange={(e) => setForm({ ...form, menuCategoryId: e.target.value })} className={inp}>
                  <option value="">— Tanpa Kategori —</option>
                  {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </Field>

              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={form.isAvailable} onChange={(e) => setForm({ ...form, isAvailable: e.target.checked })} />
                <span className="text-gray-700">Tersedia (tampil di order)</span>
              </label>

              {/* Resep / Ingredients */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-medium text-gray-600">Resep / Bahan Baku</label>
                  <button type="button" onClick={addIngredient} className="text-xs text-orange-600 hover:underline font-medium">
                    + Tambah Bahan
                  </button>
                </div>
                {form.ingredients.length === 0 && (
                  <p className="text-xs text-gray-400 italic">Opsional — untuk potong stok otomatis saat order dibayar</p>
                )}
                <div className="space-y-2">
                  {form.ingredients.map((ing, idx) => (
                    <div key={idx} className="flex gap-2 items-center">
                      <select
                        value={ing.productId}
                        onChange={(e) => updateIngredient(idx, 'productId', e.target.value)}
                        className={`flex-1 ${inp}`}
                      >
                        <option value="">Pilih bahan...</option>
                        {products.map((p) => <option key={p.id} value={p.id}>{p.name} ({p.unit})</option>)}
                      </select>
                      <input
                        type="number"
                        min={0}
                        step="0.001"
                        placeholder="Qty"
                        value={ing.qtyUsed}
                        onChange={(e) => updateIngredient(idx, 'qtyUsed', e.target.value)}
                        className={`w-20 ${inp}`}
                      />
                      <button type="button" onClick={() => removeIngredient(idx)} className="text-red-400 hover:text-red-600 flex-shrink-0">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowForm(false)} className="flex-1 px-4 py-2.5 text-sm text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50">Batal</button>
                <button type="submit" disabled={saving} className="flex-1 px-4 py-2.5 text-sm bg-orange-600 text-white rounded-lg font-semibold hover:bg-orange-700 disabled:opacity-60">
                  {saving ? 'Menyimpan...' : 'Simpan'}
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

const inp = 'w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500'


