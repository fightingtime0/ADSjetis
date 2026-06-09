import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// POST — tambah item ke order
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { menuItemId, qty, note } = body

  if (!menuItemId || !qty) {
    return NextResponse.json({ error: 'menuItemId dan qty wajib diisi' }, { status: 400 })
  }

  const order = await prisma.tableOrder.findUnique({ where: { id: id } })
  if (!order) return NextResponse.json({ error: 'Order tidak ditemukan' }, { status: 404 })
  if (order.status !== 'OPEN') {
    return NextResponse.json({ error: 'Order sudah di-bill atau selesai' }, { status: 400 })
  }

  const menuItem = await prisma.menuItem.findUnique({ where: { id: menuItemId } })
  if (!menuItem || !menuItem.isAvailable) {
    return NextResponse.json({ error: 'Menu tidak tersedia' }, { status: 400 })
  }

  const subtotal = Number(menuItem.price) * qty

  // Cek apakah sudah ada item yang sama (status PENDING), tambah qty saja
  const existingItem = await prisma.tableOrderItem.findFirst({
    where: { orderId: id, menuItemId, status: 'PENDING' },
  })

  let item
  if (existingItem) {
    const newQty = existingItem.qty + qty
    item = await prisma.tableOrderItem.update({
      where: { id: existingItem.id },
      data: {
        qty: newQty,
        subtotal: Number(menuItem.price) * newQty,
      },
      include: { menuItem: { select: { id: true, name: true, price: true } } },
    })
  } else {
    item = await prisma.tableOrderItem.create({
      data: {
        orderId: id,
        menuItemId,
        qty,
        price: menuItem.price,
        subtotal,
        note: note ?? null,
        status: 'PENDING',
      },
      include: { menuItem: { select: { id: true, name: true, price: true } } },
    })
  }

  // Recalculate totals
  await recalcOrder(id)

  return NextResponse.json(item, { status: 201 })
}

// PATCH — update status satu item (PENDING→COOKING→SERVED) atau cancel
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { itemId, status, qty } = body

  const item = await prisma.tableOrderItem.findUnique({
    where: { id: itemId },
    include: { menuItem: true },
  })
  if (!item) return NextResponse.json({ error: 'Item tidak ditemukan' }, { status: 404 })

  const updated = await prisma.tableOrderItem.update({
    where: { id: itemId },
    data: {
      ...(status && { status }),
      ...(qty !== undefined && {
        qty,
        subtotal: Number(item.menuItem.price) * qty,
      }),
    },
    include: { menuItem: { select: { id: true, name: true, price: true } } },
  })

  if (status === 'CANCELLED' || qty !== undefined) {
    await recalcOrder(id)
  }

  return NextResponse.json(updated)
}

// DELETE — hapus item dari order
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = req.nextUrl
  const itemId = searchParams.get('itemId')
  if (!itemId) return NextResponse.json({ error: 'itemId diperlukan' }, { status: 400 })

  await prisma.tableOrderItem.delete({ where: { id: itemId } })
  await recalcOrder(id)

  return NextResponse.json({ success: true })
}

async function recalcOrder(orderId: string) {
  const order = await prisma.tableOrder.findUnique({
    where: { id: orderId },
    include: { items: true },
  })
  if (!order) return

  const activeItems = order.items.filter((i) => i.status !== 'CANCELLED')
  const subtotal = activeItems.reduce((s, i) => s + Number(i.subtotal), 0)
  const taxRate = Number(order.taxRate)
  const tax = Math.round((subtotal * taxRate) / 100)
  const total = subtotal + tax

  await prisma.tableOrder.update({
    where: { id: orderId },
    data: { subtotal, tax, total },
  })
}



