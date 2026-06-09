import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const booking = await prisma.booking.findUnique({
    where: { id: params.id },
    include: {
      room: {
        include: {
          roomType: true,
          facilities: { include: { facility: true } },
          pricing: true,
        },
      },
      payments: { orderBy: { paidAt: 'asc' } },
    },
  })

  if (!booking) return NextResponse.json({ error: 'Booking tidak ditemukan' }, { status: 404 })

  return NextResponse.json({
    ...booking,
    totalPrice: Number(booking.totalPrice),
    dpAmount: Number(booking.dpAmount),
    paidAmount: Number(booking.paidAmount),
    pricePerNight: Number(booking.pricePerNight),
    extraBedPrice: Number(booking.extraBedPrice),
    payments: booking.payments.map((p) => ({ ...p, amount: Number(p.amount) })),
  })
}

// PATCH — ubah status booking: CONFIRMED→CHECKED_IN, CHECKED_IN→CHECKED_OUT, atau CANCELLED
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { status, note } = body

  const booking = await prisma.booking.findUnique({
    where: { id: params.id },
    include: { room: true },
  })
  if (!booking) return NextResponse.json({ error: 'Booking tidak ditemukan' }, { status: 404 })

  // Validasi transisi status
  const VALID_TRANSITIONS: Record<string, string[]> = {
    PENDING:    ['CONFIRMED', 'CANCELLED'],
    CONFIRMED:  ['CHECKED_IN', 'CANCELLED'],
    CHECKED_IN: ['CHECKED_OUT'],
  }
  if (status && !VALID_TRANSITIONS[booking.status]?.includes(status)) {
    return NextResponse.json({
      error: `Tidak bisa ubah status dari ${booking.status} ke ${status}`,
    }, { status: 400 })
  }

  const updated = await prisma.$transaction(async (tx) => {
    const bk = await tx.booking.update({
      where: { id: params.id },
      data: {
        ...(status && { status }),
        ...(note !== undefined && { note }),
      },
      include: {
        room: { select: { id: true, name: true } },
        payments: true,
      },
    })

    // Update status kamar
    if (status === 'CHECKED_IN') {
      await tx.room.update({ where: { id: booking.roomId }, data: { status: 'OCCUPIED' } })
    } else if (status === 'CHECKED_OUT' || status === 'CANCELLED') {
      // Cek apakah ada booking lain yang masih CHECKED_IN di kamar ini
      const otherActive = await tx.booking.findFirst({
        where: {
          roomId: booking.roomId,
          id: { not: params.id },
          status: 'CHECKED_IN',
        },
      })
      if (!otherActive) {
        await tx.room.update({ where: { id: booking.roomId }, data: { status: 'AVAILABLE' } })
      }
    }

    return bk
  })

  return NextResponse.json({
    ...updated,
    totalPrice: Number((updated as any).totalPrice ?? 0),
    paidAmount: Number((updated as any).paidAmount ?? 0),
    dpAmount: Number((updated as any).dpAmount ?? 0),
  })
}
