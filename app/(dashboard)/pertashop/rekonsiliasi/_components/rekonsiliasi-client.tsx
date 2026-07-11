'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { formatRupiah, formatDate } from '@/lib/utils'

type ReconLite = {
  id: string
  date: string
  reportedSales: number
  depositAmount: number
  difference: number
  note: string | null
}

function todayStr() {
  const d = new Date()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${m}-${day}`
}

export function RekonsiliasiClient({ recons }: { recons: ReconLite[] }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  const [date, setDate] = useState(todayStr())
  const [deposit, setDeposit] = useState('')
  const [note, setNote] = useState('')

  // Preview total laporan jualan untuk tanggal terpilih
  const [reported, setReported] = useState<{ reportedSales: number; totalLiters: number; saleCount: number } | null>(null)

  useEffect(() => {
    let cancelled = false
    setReported(null)
    fetch(`/api/pertashop/rekonsiliasi?date=${date}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!cancelled && d) setReported(d)
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [date])

  const diff = reported !== null && deposit !== '' ? parseFloat(deposit) - reported.reportedSales : null

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      const res = await fetch('/api/pertashop/rekonsiliasi', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date, depositAmount: parseFloat(deposit), note: note || null }),
      })
      const data = await res.json()
      if (!res.ok) {
        alert(data.error ?? 'Gagal mencatat rekonsiliasi')
        return
      }
      setDeposit('')
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
          <h1 className="text-xl md:text-2xl font-bold text-gray-900">Rekonsiliasi Setoran</h1>
          <p className="text-xs md:text-sm text-gray-500">Cocokkan setoran uang vs laporan hasil jualan</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Form */}
        <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 md:p-5 space-y-3 self-start">
          <h2 className="font-semibold text-gray-900 text-sm md:text-base">Catat Rekonsiliasi</h2>

          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Tanggal</label>
            <input
              type="date" required value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div className="rounded-lg bg-gray-50 p-3 space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500 text-xs">Laporan jualan tanggal ini</span>
              <span className="font-semibold text-gray-900">
                {reported === null ? '…' : formatRupiah(reported.reportedSales)}
              </span>
            </div>
            {reported !== null && (
              <p className="text-xs text-gray-400">
                {reported.saleCount} transaksi · {reported.totalLiters.toLocaleString('id-ID', { maximumFractionDigits: 2 })} liter
              </p>
            )}
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Setoran Uang (Rp)</label>
            <input
              type="number" step="1" min="0" required value={deposit}
              onChange={(e) => setDeposit(e.target.value)}
              placeholder="mis. 1250000"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          {diff !== null && !isNaN(diff) && (
            <div
              className={`rounded-lg p-3 text-sm font-semibold ${
                diff === 0
                  ? 'bg-emerald-50 text-emerald-700'
                  : diff > 0
                    ? 'bg-blue-50 text-blue-700'
                    : 'bg-red-50 text-red-700'
              }`}
            >
              {diff === 0
                ? '✓ Setoran cocok dengan laporan'
                : diff > 0
                  ? `Setoran lebih ${formatRupiah(diff)}`
                  : `Setoran kurang ${formatRupiah(Math.abs(diff))}`}
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Catatan (opsional)</label>
            <input
              type="text" value={note} onChange={(e) => setNote(e.target.value)}
              placeholder="mis. selisih uang kembalian"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <button
            type="submit"
            disabled={loading || reported === null}
            className="w-full bg-emerald-600 text-white rounded-lg py-2.5 text-sm font-semibold hover:bg-emerald-700 transition-colors disabled:opacity-50"
          >
            {loading ? 'Menyimpan...' : 'Simpan Rekonsiliasi'}
          </button>
        </form>

        {/* Riwayat */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-gray-100 shadow-sm">
          <div className="px-4 md:px-5 py-3 md:py-4 border-b border-gray-100">
            <h2 className="font-semibold text-gray-900 text-sm md:text-base">Riwayat Rekonsiliasi</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-gray-500 border-b border-gray-100">
                  <th className="px-4 md:px-5 py-2.5 font-medium">Tanggal</th>
                  <th className="px-3 py-2.5 font-medium text-right">Laporan Jualan</th>
                  <th className="px-3 py-2.5 font-medium text-right">Setoran</th>
                  <th className="px-4 md:px-5 py-2.5 font-medium text-right">Selisih</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {recons.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-5 py-6 text-center text-gray-400">Belum ada rekonsiliasi</td>
                  </tr>
                )}
                {recons.map((r) => (
                  <tr key={r.id}>
                    <td className="px-4 md:px-5 py-3 text-gray-600 whitespace-nowrap">
                      {formatDate(r.date)}
                      {r.note && <p className="text-xs text-gray-400">{r.note}</p>}
                    </td>
                    <td className="px-3 py-3 text-right text-gray-600">{formatRupiah(r.reportedSales)}</td>
                    <td className="px-3 py-3 text-right font-semibold text-gray-900">{formatRupiah(r.depositAmount)}</td>
                    <td
                      className={`px-4 md:px-5 py-3 text-right font-semibold ${
                        r.difference === 0 ? 'text-emerald-600' : r.difference > 0 ? 'text-blue-600' : 'text-red-600'
                      }`}
                    >
                      {r.difference === 0 ? 'Cocok' : `${r.difference > 0 ? '+' : ''}${formatRupiah(r.difference)}`}
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
