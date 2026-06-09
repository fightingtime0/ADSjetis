import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// POST — checkout order: bayar + potong stok bahan baku
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { paymentMethod, discount = 0 } = body

  if (!paymentMethod) {
    return NextResponse.json({ error: 'Metode pembayaran wajib' }, { status: 400 })
  }

  const order = await prisma.tableOrder.findUnique({
    where: { id: id },
    include: {
      items: {
        where: { status: { not: 'CANCELLED' } },
        include: {
          menuItem: {
            include: {
              ingredients: {
                include: { product: true },
              },
            },
          },
        },
      },
    },
  })

  if (!order) return NextResponse.json({ error: 'Order tidak ditemukan' }, { status: 404 })
  if (order.status === 'PAID' || order.status === 'CANCELLED') {
    return NextResponse.json({ error: 'Order sudah selesai' }, { status: 400 })
  }

  // Hitung ulang total dengan diskon
  const subtotal = order.items.reduce((s, i) => s + Number(i.subtotal), 0)
  const taxRate = Number(order.taxRate)
  const tax = Math.round(((subtotal - discount) * taxRate) / 100)
  const total = subtotal - discount + tax

  // Cek stok bahan baku yang dibutuhkan
  type StockNeed = { productId: string; name: string; qtyNeeded: number; stock: number; unit: string }
  const stockNeeds: StockNeed[] = []

  for (const item of order.items) {
    for (const ingredient of item.menuItem.ingredients) {
      const qtyNeeded = Number(ingredient.qtyUsed) * item.qty
      const existing = stockNeeds.find((s) => s.productId === ingredient.productId)
      if (existing) {
        existing.qtyNeeded += qtyNeeded
      } else {
        stockNeeds.push({
          productId: ingredient.productId,
          name: ingredient.product.name,
          qtyNeeded,
          stock: Number(ingredient.product.stock),
          unit: ingredient.product.unit,
        })
      }
    }
  }

  // Validasi stok
  for (const need of stockNeeds) {
    if (need.stock < need.qtyNeeded) {
      return NextResponse.json({
        error: `Stok bahan baku tidak cukup: ${need.name} (butuh ${need.qtyNeeded} ${need.unit}, tersisa ${need.stock} ${need.unit})`,
      }, { status: 400 })
    }
  }

  // Jalankan dalam satu transaksi DB
  const result = await prisma.$transaction(async (tx) => {
    // Update order → PAID
    const paidOrder = await tx.tableOrder.update({
      where: { id: id },
      data: {
        status: 'PAID',
        paymentMethod,
        discount,
        tax,
        total,
        subtotal,
        paidAt: new Date(),
      },
    })

    // Update semua item aktif → SERVED (jika masih PENDING/COOKING)
    await tx.tableOrderItem.updateMany({
      where: { orderId: id, status: { in: ['PENDING', 'COOKING'] } },
      data: { status: 'SERVED' },
    })

    // Potong stok bahan baku
    for (const need of stockNeeds) {
      const product = await tx.product.findUnique({ where: { id: need.productId } })
      if (!product) continue

      const qtyBefore = Number(product.stock)
      const qtyAfter = qtyBefore - need.qtyNeeded

      await tx.product.update({
        where: { id: need.productId },
        data: { stock: { decrement: need.qtyNeeded } },
      })

      await tx.stockMovement.create({
        data: {
          productId: need.productId,
          type: 'OUT',
          qty: need.qtyNeeded,
          qtyBefore,
          qtyAfter,
          refType: 'TableOrder',
          refId: order.id,
          note: `Pemakaian resep — Order ${order.orderNumber}`,
        },
      })
    }

    return paidOrder
  })

  return NextResponse.json(result)
}



