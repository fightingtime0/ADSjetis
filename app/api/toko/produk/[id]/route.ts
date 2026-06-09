import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const product = await prisma.product.findUnique({
    where: { id: id },
    include: {
      category: true,
      stockMovements: { orderBy: { createdAt: 'desc' }, take: 20 },
    },
  })

  if (!product) return NextResponse.json({ error: 'Produk tidak ditemukan' }, { status: 404 })
  return NextResponse.json(product)
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await getSession()
  if (!session || !['OWNER', 'MANAGER'].includes(session.user.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await req.json()
  const { name, sku, unit, costPrice, sellPrice, minStock, categoryId } = body

  const product = await prisma.product.update({
    where: { id: id },
    data: {
      name,
      sku: sku || null,
      unit,
      costPrice,
      sellPrice,
      minStock,
      categoryId: categoryId || null,
    },
    include: { category: true },
  })

  return NextResponse.json(product)
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await getSession()
  if (!session || !['OWNER', 'MANAGER'].includes(session.user.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // Soft delete
  await prisma.product.update({
    where: { id: id },
    data: { isActive: false },
  })

  return NextResponse.json({ success: true })
}



