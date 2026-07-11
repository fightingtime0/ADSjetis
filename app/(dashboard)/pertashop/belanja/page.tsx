import { getSession } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { BelanjaClient } from './_components/belanja-client'

export default async function BelanjaPage() {
  const session = await getSession()
  if (!session) redirect('/login')

  const unit = await prisma.businessUnit.findFirst({ where: { type: 'PERTASHOP', isActive: true } })
  if (!unit) return <p className="text-red-500">Unit Pertashop tidak ditemukan.</p>

  const [products, purchases] = await Promise.all([
    prisma.fuelProduct.findMany({ where: { unitId: unit.id, isActive: true }, orderBy: { name: 'asc' } }),
    prisma.fuelPurchase.findMany({
      where: { unitId: unit.id },
      include: { fuelProduct: { select: { name: true } } },
      orderBy: { purchasedAt: 'desc' },
      take: 50,
    }),
  ])

  return (
    <BelanjaClient
      products={products.map((p) => ({
        id: p.id,
        name: p.name,
        buyPrice: Number(p.buyPrice),
        sellPrice: Number(p.sellPrice),
        stock: Number(p.stock),
      }))}
      purchases={purchases.map((b) => ({
        id: b.id,
        purchaseNumber: b.purchaseNumber,
        productName: b.fuelProduct.name,
        liters: Number(b.liters),
        buyPrice: Number(b.buyPrice),
        total: Number(b.total),
        note: b.note,
        purchasedAt: b.purchasedAt.toISOString(),
      }))}
    />
  )
}
