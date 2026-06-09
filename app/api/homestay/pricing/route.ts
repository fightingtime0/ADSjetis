import { NextRequest, NextResponse } from 'next/server'
import { previewPricing } from '@/lib/accommodation'

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const roomId   = searchParams.get('roomId')
  const checkIn  = searchParams.get('checkIn')
  const checkOut = searchParams.get('checkOut')

  if (!roomId || !checkIn || !checkOut) {
    return NextResponse.json({ error: 'roomId, checkIn, checkOut wajib diisi' }, { status: 400 })
  }

  const result = await previewPricing(roomId, checkIn, checkOut)
  if (!result) return NextResponse.json({ error: 'Kamar tidak ditemukan atau tanggal tidak valid' }, { status: 400 })

  return NextResponse.json(result)
}
