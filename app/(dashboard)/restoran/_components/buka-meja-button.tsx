'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export function BukaMejaButton({ tableNumber }: { tableNumber: string }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  async function handleClick() {
    setLoading(true)
    try {
      const res = await fetch('/api/restoran/meja', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tableNumber }),
      })

      const data = await res.json()

      if (res.status === 409) {
        // Meja sudah ada order — langsung navigasi
        router.push(`/restoran/meja/${data.orderId}`)
        return
      }
      if (!res.ok) {
        alert(data.error ?? 'Gagal membuka meja')
        return
      }

      router.push(`/restoran/meja/${data.id}`)
      router.refresh()
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      onClick={handleClick}
      disabled={loading}
      className="rounded-xl border-2 border-dashed border-gray-200 p-3.5 text-center hover:border-orange-300 hover:bg-orange-50 transition-all group disabled:opacity-50"
    >
      <p className="font-bold text-gray-400 group-hover:text-orange-600 text-base transition-colors">
        Meja {tableNumber}
      </p>
      <p className="text-xs text-gray-300 group-hover:text-orange-400 mt-1 transition-colors">
        {loading ? 'Membuka...' : 'Kosong · Klik untuk buka'}
      </p>
    </button>
  )
}


