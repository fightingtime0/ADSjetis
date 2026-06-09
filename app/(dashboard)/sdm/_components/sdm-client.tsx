'use client'

import { useState } from 'react'
import { formatRupiah, formatDate } from '@/lib/utils'

type Unit = { id: string; name: string; type: string }
type Employee = {
  id: string; name: string; position: string | null; phone: string | null
  email: string | null; idNumber: string | null; salary: number | null
  joinDate: string | null; isActive: boolean
  primaryUnit: { name: string; type: string }
  user: { email: string; role: string } | null
}

const UNIT_COLOR: Record<string, string> = {
  RETAIL:     'bg-sky-100 text-sky-700',
  RESTAURANT: 'bg-orange-100 text-orange-700',
  HOMESTAY:   'bg-teal-100 text-teal-700',
  LODGING:    'bg-purple-100 text-purple-700',
}

export function SdmClient({
  employees: initialEmployees,
  units,
  role,
}: {
  employees: Employee[]
  units: Unit[]
  role: string
}) {
  const [employees, setEmployees] = useState(initialEmployees)
  const [filterUnit, setFilterUnit] = useState('')
  const [search, setSearch] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editEmployee, setEditEmployee] = useState<Employee | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Form state
  const [form, setForm] = useState({
    name: '', primaryUnitId: '', position: '', phone: '', email: '',
    idNumber: '', address: '', salary: '', joinDate: '',
  })

  function openAdd() {
    setEditEmployee(null)
    setForm({ name: '', primaryUnitId: units[0]?.id ?? '', position: '', phone: '', email: '', idNumber: '', address: '', salary: '', joinDate: '' })
    setError('')
    setShowModal(true)
  }

  function openEdit(emp: Employee) {
    setEditEmployee(emp)
    const unit = units.find((u) => u.name === emp.primaryUnit.name)
    setForm({
      name:         emp.name,
      primaryUnitId: unit?.id ?? '',
      position:     emp.position ?? '',
      phone:        emp.phone ?? '',
      email:        emp.email ?? '',
      idNumber:     emp.idNumber ?? '',
      address:      '',
      salary:       emp.salary ? String(emp.salary) : '',
      joinDate:     emp.joinDate ? emp.joinDate.split('T')[0] : '',
    })
    setError('')
    setShowModal(true)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true); setError('')

    const url    = editEmployee ? `/api/sdm/karyawan/${editEmployee.id}` : '/api/sdm/karyawan'
    const method = editEmployee ? 'PUT' : 'POST'

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, salary: form.salary ? Number(form.salary) : undefined }),
    })
    const data = await res.json()
    setLoading(false)
    if (!res.ok) return setError(data.error ?? 'Gagal menyimpan')

    if (editEmployee) {
      setEmployees((prev) => prev.map((e) => e.id === editEmployee.id ? { ...e, ...data } : e))
    } else {
      setEmployees((prev) => [...prev, data])
    }
    setShowModal(false)
  }

  async function handleDeactivate(emp: Employee) {
    if (!confirm(`Nonaktifkan ${emp.name}?`)) return
    const res = await fetch(`/api/sdm/karyawan/${emp.id}`, { method: 'DELETE' })
    if (res.ok) setEmployees((prev) => prev.filter((e) => e.id !== emp.id))
  }

  const filtered = employees.filter((e) => {
    const matchUnit   = !filterUnit || units.find((u) => u.id === filterUnit)?.name === e.primaryUnit.name
    const matchSearch = !search || e.name.toLowerCase().includes(search.toLowerCase())
    return matchUnit && matchSearch
  })

  return (
    <>
      {/* Filter bar */}
      <div className="flex items-center gap-3 flex-wrap">
        <input type="text" placeholder="Cari nama..." value={search} onChange={(e) => setSearch(e.target.value)}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 w-48" />
        <select value={filterUnit} onChange={(e) => setFilterUnit(e.target.value)}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300">
          <option value="">Semua Unit</option>
          {units.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
        </select>
        <span className="text-sm text-gray-500 ml-auto">{filtered.length} karyawan</span>
        {['OWNER', 'MANAGER'].includes(role) && (
          <button onClick={openAdd}
            className="bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors">
            + Tambah Karyawan
          </button>
        )}
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-left text-xs text-gray-500 uppercase tracking-wide">
                <th className="px-5 py-3 font-semibold">Nama</th>
                <th className="px-5 py-3 font-semibold">Unit</th>
                <th className="px-5 py-3 font-semibold">Jabatan</th>
                <th className="px-5 py-3 font-semibold">Kontak</th>
                <th className="px-5 py-3 font-semibold">Gaji</th>
                <th className="px-5 py-3 font-semibold">Bergabung</th>
                {['OWNER', 'MANAGER'].includes(role) && <th className="px-5 py-3 font-semibold">Aksi</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.length === 0 && (
                <tr><td colSpan={7} className="px-5 py-12 text-center text-sm text-gray-400">Tidak ada karyawan</td></tr>
              )}
              {filtered.map((emp) => (
                <tr key={emp.id} className="hover:bg-gray-50">
                  <td className="px-5 py-3.5">
                    <p className="font-semibold text-gray-900">{emp.name}</p>
                    {emp.user && <p className="text-xs text-gray-400">{emp.user.email} · {emp.user.role}</p>}
                  </td>
                  <td className="px-5 py-3.5">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${UNIT_COLOR[emp.primaryUnit.type] ?? 'bg-gray-100 text-gray-600'}`}>
                      {emp.primaryUnit.name}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-gray-600">{emp.position ?? '—'}</td>
                  <td className="px-5 py-3.5">
                    <p className="text-gray-700">{emp.phone ?? '—'}</p>
                    {emp.email && <p className="text-xs text-gray-400">{emp.email}</p>}
                  </td>
                  <td className="px-5 py-3.5 font-medium text-gray-700">
                    {emp.salary ? formatRupiah(emp.salary) : '—'}
                  </td>
                  <td className="px-5 py-3.5 text-gray-500">
                    {emp.joinDate ? formatDate(new Date(emp.joinDate)) : '—'}
                  </td>
                  {['OWNER', 'MANAGER'].includes(role) && (
                    <td className="px-5 py-3.5">
                      <div className="flex gap-2">
                        <button onClick={() => openEdit(emp)}
                          className="text-xs text-indigo-600 hover:underline font-medium">Edit</button>
                        {role === 'OWNER' && (
                          <button onClick={() => handleDeactivate(emp)}
                            className="text-xs text-red-500 hover:underline font-medium">Nonaktif</button>
                        )}
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-bold text-gray-900 mb-5">
              {editEmployee ? `Edit: ${editEmployee.name}` : 'Tambah Karyawan Baru'}
            </h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-xs text-gray-500 mb-1">Nama Lengkap *</label>
                  <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs text-gray-500 mb-1">Unit *</label>
                  <select required value={form.primaryUnitId} onChange={(e) => setForm({ ...form, primaryUnitId: e.target.value })}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400">
                    {units.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
                  </select>
                </div>
                {[
                  { label: 'Jabatan', key: 'position', type: 'text' },
                  { label: 'No. HP', key: 'phone', type: 'text' },
                  { label: 'Email', key: 'email', type: 'email' },
                  { label: 'No. KTP', key: 'idNumber', type: 'text' },
                  { label: 'Gaji (Rp)', key: 'salary', type: 'number' },
                  { label: 'Tanggal Bergabung', key: 'joinDate', type: 'date' },
                ].map(({ label, key, type }) => (
                  <div key={key}>
                    <label className="block text-xs text-gray-500 mb-1">{label}</label>
                    <input type={type} value={(form as any)[key]}
                      onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" />
                  </div>
                ))}
              </div>
              {error && <p className="text-sm text-red-600">{error}</p>}
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)}
                  className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-50">
                  Batal
                </button>
                <button type="submit" disabled={loading}
                  className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white rounded-xl text-sm font-semibold">
                  {loading ? 'Menyimpan...' : 'Simpan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}


