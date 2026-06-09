import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// POST — tambah pembayaran (DP / FULL / REFUND)
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { amount, method, type, note } = body

  if (!amount || !method || !type) {
    return NextResponse.json({ error: 'amount, method, type wajib diisi' }, { status: 400 })
  }
  if (!['DP', 'FULL', 'REFUND'].includes(type)) {
    return NextResponse.json({ error: 'type harus DP, FULL, atau REFUND' }, { status: 400 })
  }

  const booking = await prisma.booking.findUnique({
    where: { id: id },
    include: { payments: true },
  })
  if (!booking) return NextResponse.json({ error: 'Booking tidak ditemukan' }, { status: 404 })

  if (booking.status === 'CANCELLED' || booking.status === 'CHECKED_OUT') {
    return NextResponse.json({ error: 'Booking sudah selesai atau dibatalkan' }, { status: 400 })
  }

  const totalPaid = booking.payments
    .filter((p) => p.type !== 'REFUND')
    .reduce((s, p) => s + Number(p.amount), 0)
  const totalRefunded = booking.payments
    .filter((p) => p.type === 'REFUND')
    .reduce((s, p) => s + Number(p.amount), 0)
  const currentPaid = totalPaid - totalRefunded
  const totalPrice = Number(booking.totalPrice)

  if (type !== 'REFUND' && currentPaid + Number(amount) > totalPrice) {
    return NextResponse.json({
      error: `Total bayar melebihi tagihan. Sisa: ${totalPrice - currentPaid}`,
    }, { status: 400 })
  }

  const newPaidAmount = type === 'REFUND'
    ? Math.max(0, currentPaid - Number(amount))
    : currentPaid + Number(amount)

  const payment = await prisma.$transaction(async (tx) => {
    const pay = await tx.bookingPayment.create({
      data: {
        bookingId: id,
        amount: Number(amount),
        method,
        type,
        note: note ?? null,
        paidAt: new Date(),
      },
    })

    await tx.booking.update({
      where: { id: id },
      data: { paidAmount: newPaidAmount },
    })

    return pay
  })

  return NextResponse.json({ ...payment, amount: Number(payment.amount) }, { status: 201 })
}



