import { getSession } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { StokClient } from './_components/stok-client'

export default async function StokPage() {
  const session = await getSession()
  if (!session) redirect('/login')

  const unit = await prisma.businessUnit.findFirst({ where: { type: 'PERTASHOP', isActive: true } })
  if (!unit) return <p className="text-red-500">Unit Pertashop tidak ditemukan.</p>

  const [products, readings] = await Promise.all([
    prisma.fuelProduct.findMany({ where: { unitId: unit.id, isActive: true }, orderBy: { name: 'asc' } }),
    prisma.fuelStockReading.findMany({
      where: { unitId: unit.id },
      include: { fuelProduct: { select: { name: true } } },
      orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
      take: 60,
    }),
  ])

  return (
    <StokClient
      products={products.map((p) => ({
        id: p.id,
        name: p.name,
        stock: Number(p.stock),
        buyPrice: Number(p.buyPrice),
      }))}
      readings={readings.map((r) => ({
        id: r.id,
        type: r.type,
        date: r.date.toISOString(),
        productName: r.fuelProduct.name,
        expectedLiters: Number(r.expectedLiters),
        actualLiters: Number(r.actualLiters),
        lossLiters: Number(r.lossLiters),
        note: r.note,
      }))}
    />
  )
}
