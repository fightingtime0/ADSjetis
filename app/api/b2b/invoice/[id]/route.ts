import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

function serializeInvoice(inv: any) {
  return {
    ...inv,
    subtotal:   Number(inv.subtotal),
    discount:   Number(inv.discount),
    taxRate:    Number(inv.taxRate),
    tax:        Number(inv.tax),
    total:      Number(inv.total),
    paidAmount: Number(inv.paidAmount),
    items: (inv.items ?? []).map((item: any) => ({
      ...item,
      qty:      Number(item.qty),
      price:    Number(item.price),
      subtotal: Number(item.subtotal),
    })),
  }
}

export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  const invoice = await prisma.b2BInvoice.findUnique({
    where: { id: params.id },
    include: {
      sellerUnit: { select: { id: true, name: true, taxRate: true } },
      buyerUnit:  { select: { id: true, name: true } },
      items: { include: { sellerProduct: { select: { id: true, name: true, stock: true, unit: true } } } },
    },
  })
  if (!invoice) return NextResponse.json({ error: 'Invoice tidak ditemukan' }, { status: 404 })

  return NextResponse.json(serializeInvoice(invoice))
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { action, paidAmount } = await req.json()

  const invoice = await prisma.b2BInvoice.findUnique({
    where: { id: params.id },
    include: { items: { include: { sellerProduct: true } } },
  })
  if (!invoice) return NextResponse.json({ error: 'Invoice tidak ditemukan' }, { status: 404 })

  // ── SEND: DRAFT → SENT ──────────────────────────────────────────
  if (action === 'send') {
    if (invoice.status !== 'DRAFT') {
      return NextResponse.json({ error: 'Hanya invoice DRAFT yang bisa dikirim' }, { status: 400 })
    }
    const updated = await prisma.b2BInvoice.update({
      where: { id: params.id },
      data: { status: 'SENT' },
    })
    return NextResponse.json(serializeInvoice(updated))
  }

  // ── PAY: SENT/PARTIAL → PAID + stock movement ───────────────────
  if (action === 'pay') {
    if (!['SENT', 'PARTIAL'].includes(invoice.status)) {
      return NextResponse.json({ error: 'Invoice harus SENT atau PARTIAL untuk dibayar' }, { status: 400 })
    }

    const amount    = Number(paidAmount ?? Number(invoice.total))
    const totalPaid = Number(invoice.paidAmount) + amount
    const total     = Number(invoice.total)

    if (totalPaid > total) {
      return NextResponse.json({ error: `Pembayaran melebihi total. Sisa: ${total - Number(invoice.paidAmount)}` }, { status: 400 })
    }

    const newStatus = totalPaid >= total ? 'PAID' : 'PARTIAL'
    const isFullyPaid = newStatus === 'PAID'

    const updated = await prisma.$transaction(async (tx) => {
      const upd = await tx.b2BInvoice.update({
        where: { id: params.id },
        data: {
          paidAmount: totalPaid,
          status:     newStatus,
          paidAt:     isFullyPaid ? new Date() : null,
        },
        include: { items: { include: { sellerProduct: true } }, sellerUnit: true, buyerUnit: true },
      })

      // Saat PAID penuh: kurangi stok Toko
      if (isFullyPaid) {
        for (const item of invoice.items) {
          const product = item.sellerProduct
          const qtyBefore = Number(product.stock)
          const qtyAfter  = qtyBefore - Number(item.qty)

          await tx.product.update({
            where: { id: product.id },
            data:  { stock: qtyAfter },
          })

          await tx.stockMovement.create({
            data: {
              productId: product.id,
              type:      'OUT',
              qty:       Number(item.qty),
              qtyBefore,
              qtyAfter,
              note:      `B2B Invoice ${invoice.invoiceNumber} ke ${upd.buyerUnit.name}`,
              refType:   'B2BInvoice',
              refId:     invoice.id,
            },
          })
        }
      }

      return upd
    })

    return NextResponse.json(serializeInvoice(updated))
  }

  // ── CANCEL ──────────────────────────────────────────────────────
  if (action === 'cancel') {
    if (!['DRAFT', 'SENT'].includes(invoice.status)) {
      return NextResponse.json({ error: 'Hanya invoice DRAFT atau SENT yang bisa dibatalkan' }, { status: 400 })
    }
    const updated = await prisma.b2BInvoice.update({
      where: { id: params.id },
      data: { status: 'CANCELLED' },
    })
    return NextResponse.json(serializeInvoice(updated))
  }

  return NextResponse.json({ error: 'Action tidak dikenal' }, { status: 400 })
}
