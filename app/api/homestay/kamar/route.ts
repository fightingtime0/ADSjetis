import { NextResponse } from 'next/server'
import { getRooms } from '@/lib/accommodation'

export async function GET() {
  const rooms = await getRooms('HOMESTAY')
  if (!rooms) return NextResponse.json({ error: 'Unit tidak ditemukan' }, { status: 404 })

  const serialized = rooms.map((r) => ({
    ...r,
    pricing: r.pricing.map((p) => ({ ...p, price: Number(p.price) })),
    bookings: r.bookings.map((b) => ({
      ...b,
      totalPrice: Number(b.totalPrice),
      paidAmount: Number(b.paidAmount),
    })),
  }))

  return NextResponse.json(serialized)
}



