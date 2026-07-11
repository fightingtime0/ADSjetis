import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// PATCH — update status / tambah pembayaran pesanan rombongan
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { status, addPayment, pax, menuType, customMenu, pricePerPax, eventDate, note } = body

  const order = await prisma.groupOrder.findUnique({ where: { id } })
  if (!order) return NextResponse.json({ error: 'Pesanan tidak ditemukan' }, { status: 404 })

  const newPax = pax !== undefined ? Number(pax) : order.pax
  const newPrice = pricePerPax !== undefined ? Number(pricePerPax) : Number(order.pricePerPax)
  const newPaid = Number(order.paidAmount) + Number(addPayment ?? 0)

  const updated = await prisma.groupOrder.update({
    where: { id },
    data: {
      ...(status !== undefined && { status }),
      ...(pax !== undefined && { pax: newPax }),
      ...(menuType !== undefined && { menuType }),
      ...(customMenu !== undefined && { customMenu }),
      ...(eventDate !== undefined && { eventDate: new Date(eventDate) }),
      ...(note !== undefined && { note }),
      ...((pax !== undefined || pricePerPax !== undefined) && {
        pricePerPax: newPrice,
        totalPrice: newPax * newPrice,
      }),
      ...(addPayment !== undefined && { paidAmount: newPaid }),
    },
  })

  return NextResponse.json(updated)
}

// DELETE — batalkan pesanan (soft: set CANCELLED)
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const updated = await prisma.groupOrder.update({
    where: { id },
    data: { status: 'CANCELLED' },
  })

  return NextResponse.json(updated)
}
