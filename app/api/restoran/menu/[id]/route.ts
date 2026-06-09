import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  const session = await getSession()
  if (!session || !['OWNER', 'MANAGER'].includes(session.user.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await req.json()
  const { name, description, price, taxRate, menuCategoryId, isAvailable, ingredients } = body

  const menuItem = await prisma.$transaction(async (tx) => {
    // Update resep: hapus lama, buat baru
    if (ingredients !== undefined) {
      await tx.menuItemIngredient.deleteMany({ where: { menuItemId: id } })
      if (ingredients.length > 0) {
        await tx.menuItemIngredient.createMany({
          data: ingredients.map((ing: { productId: string; qtyUsed: number }) => ({
            menuItemId: id,
            productId: ing.productId,
            qtyUsed: ing.qtyUsed,
          })),
        })
      }
    }

    return tx.menuItem.update({
      where: { id: id },
      data: {
        ...(name && { name }),
        ...(description !== undefined && { description }),
        ...(price !== undefined && { price }),
        ...(taxRate !== undefined && { taxRate }),
        ...(menuCategoryId !== undefined && { menuCategoryId }),
        ...(isAvailable !== undefined && { isAvailable }),
      },
      include: {
        menuCategory: true,
        ingredients: { include: { product: { select: { id: true, name: true, unit: true } } } },
      },
    })
  })

  return NextResponse.json(menuItem)
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await getSession()
  if (!session || !['OWNER', 'MANAGER'].includes(session.user.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  await prisma.menuItem.update({
    where: { id: id },
    data: { isAvailable: false },
  })

  return NextResponse.json({ success: true })
}





