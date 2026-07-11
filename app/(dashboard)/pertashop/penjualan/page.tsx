import { getSession } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { startOfDay, endOfDay } from 'date-fns'
import { PenjualanClient } from './_components/penjualan-client'

export default async function PenjualanPage() {
  const session = await getSession()
  if (!session) redirect('/login')

  const unit = await prisma.businessUnit.findFirst({ where: { type: 'PERTASHOP', isActive: true } })
  if (!unit) return <p className="text-red-500">Unit Pertashop tidak ditemukan.</p>

  const now = new Date()
  const [products, sales, todayAgg] = await Promise.all([
    prisma.fuelProduct.findMany({ where: { unitId: unit.id, isActive: true }, orderBy: { name: 'asc' } }),
    prisma.fuelSale.findMany({
      where: { unitId: unit.id },
      include: { fuelProduct: { select: { name: true } } },
      orderBy: { soldAt: 'desc' },
      take: 50,
    }),
    prisma.fuelSale.aggregate({
      where: { unitId: unit.id, soldAt: { gte: startOfDay(now), lte: endOfDay(now) } },
      _sum: { total: true, liters: true, margin: true },
    }),
  ])

  return (
    <PenjualanClient
      products={products.map((p) => ({
        id: p.id,
        name: p.name,
        buyPrice: Number(p.buyPrice),
        sellPrice: Number(p.sellPrice),
        stock: Number(p.stock),
      }))}
      sales={sales.map((s) => ({
        id: s.id,
        saleNumber: s.saleNumber,
        productName: s.fuelProduct.name,
        liters: Number(s.liters),
        sellPrice: Number(s.sellPrice),
        total: Number(s.total),
        margin: Number(s.margin),
        note: s.note,
        soldAt: s.soldAt.toISOString(),
      }))}
      today={{
        total: Number(todayAgg._sum.total ?? 0),
        liters: Number(todayAgg._sum.liters ?? 0),
        margin: Number(todayAgg._sum.margin ?? 0),
      }}
    />
  )
}
