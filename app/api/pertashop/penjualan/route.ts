import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { generateInvoiceNumber } from '@/lib/utils'

// GET — riwayat penjualan BBM
export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const unit = await prisma.businessUnit.findFirst({ where: { type: 'PERTASHOP', isActive: true } })
  if (!unit) return NextResponse.json({ error: 'Unit Pertashop tidak ditemukan' }, { status: 404 })

  const sales = await prisma.fuelSale.findMany({
    where: { unitId: unit.id },
    include: { fuelProduct: { select: { name: true } } },
    orderBy: { soldAt: 'desc' },
    take: 100,
  })

  return NextResponse.json(sales)
}

// POST — catat penjualan BBM (liter & harga jual) → stok berkurang
// Margin dihitung dari snapshot harga beli produk saat ini
export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { fuelProductId, liters, sellPrice, note, soldAt } = body

  if (!fuelProductId || !liters) {
    return NextResponse.json({ error: 'Produk dan liter wajib diisi' }, { status: 400 })
  }
  if (Number(liters) <= 0) {
    return NextResponse.json({ error: 'Liter harus lebih dari 0' }, { status: 400 })
  }

  const product = await prisma.fuelProduct.findUnique({ where: { id: fuelProductId } })
  if (!product || !product.isActive) {
    return NextResponse.json({ error: 'Produk BBM tidak ditemukan' }, { status: 404 })
  }

  const price = sellPrice ? Number(sellPrice) : Number(product.sellPrice)
  const buyPrice = Number(product.buyPrice)
  const total = Number(liters) * price
  const margin = Number(liters) * (price - buyPrice)

  const [sale] = await prisma.$transaction([
    prisma.fuelSale.create({
      data: {
        saleNumber: generateInvoiceNumber('FJL'),
        liters: Number(liters),
        sellPrice: price,
        buyPrice,
        total,
        margin,
        note: note ?? null,
        soldAt: soldAt ? new Date(soldAt) : new Date(),
        fuelProductId,
        unitId: product.unitId,
      },
    }),
    prisma.fuelProduct.update({
      where: { id: fuelProductId },
      data: { stock: { decrement: Number(liters) } },
    }),
  ])

  return NextResponse.json(sale, { status: 201 })
}
