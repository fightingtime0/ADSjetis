import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// GET — detail order + semua items
export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const order = await prisma.tableOrder.findUnique({
    where: { id: id },
    include: {
      items: {
        include: {
          menuItem: {
            select: { id: true, name: true, price: true, taxRate: true },
          },
        },
        orderBy: { id: 'asc' },
      },
    },
  })

  if (!order) return NextResponse.json({ error: 'Order tidak ditemukan' }, { status: 404 })

  return NextResponse.json(order)
}

// PATCH — update status order (OPEN → BILLED → PAID) atau update guestCount/note
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { status, note, guestCount } = body

  const order = await prisma.tableOrder.findUnique({ where: { id: id } })
  if (!order) return NextResponse.json({ error: 'Order tidak ditemukan' }, { status: 404 })

  const updated = await prisma.tableOrder.update({
    where: { id: id },
    data: {
      ...(status && { status }),
      ...(status === 'BILLED' && { billedAt: new Date() }),
      ...(note !== undefined && { note }),
      ...(guestCount !== undefined && { guestCount }),
    },
    include: {
      items: {
        include: { menuItem: { select: { id: true, name: true, price: true } } },
      },
    },
  })

  return NextResponse.json(updated)
}



