import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { resolveNightlyPricing, calcBookingTotal } from '@/lib/pricing'

// GET /api/penginapan/pricing?roomId=X&checkIn=YYYY-MM-DD&checkOut=YYYY-MM-DD
// Return: breakdown per malam + total
export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = req.nextUrl
  const roomId   = searchParams.get('roomId')
  const checkIn  = searchParams.get('checkIn')
  const checkOut = searchParams.get('checkOut')

  if (!roomId || !checkIn || !checkOut) {
    return NextResponse.json({ error: 'roomId, checkIn, checkOut diperlukan' }, { status: 400 })
  }

  const checkInDate  = new Date(checkIn)
  const checkOutDate = new Date(checkOut)

  if (checkInDate >= checkOutDate) {
    return NextResponse.json({ error: 'checkOut harus setelah checkIn' }, { status: 400 })
  }

  const room = await prisma.room.findUnique({
    where: { id: roomId },
    include: { pricing: true },
  })
  if (!room) return NextResponse.json({ error: 'Kamar tidak ditemukan' }, { status: 404 })

  const breakdown = resolveNightlyPricing(checkInDate, checkOutDate, room.pricing)
  const total = calcBookingTotal(breakdown)
  const totalNights = breakdown.length

  return NextResponse.json({ breakdown, total, totalNights })
}



