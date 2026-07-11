'use client'

import { formatDateTime } from '@/lib/utils'

// Struk thermal 58mm — disembunyikan di layar, hanya muncul saat print.
// Cara pakai: render <Receipt data={...} /> lalu panggil printReceipt().

export type ReceiptData = {
  storeName: string
  storeLocation?: string | null
  invoiceNumber: string
  dateTime: string | Date
  items: { name: string; qty: number; price: number; subtotal: number }[]
  subtotal: number
  discount?: number
  tax?: number
  total: number
  paymentMethod?: string | null
  paidAmount?: number
  change?: number
  footerNote?: string
}

const PAYMENT_LABEL: Record<string, string> = {
  CASH: 'Tunai', QRIS: 'QRIS', TRANSFER: 'Transfer', CARD: 'Kartu', OTHER: 'Lainnya',
}

// Format angka tanpa "Rp" agar muat di kertas 58mm
function num(n: number): string {
  return new Intl.NumberFormat('id-ID', { minimumFractionDigits: 0 }).format(Math.round(n))
}

export function printReceipt() {
  document.body.classList.add('printing-receipt')
  window.print()
  document.body.classList.remove('printing-receipt')
}

export function Receipt({ data }: { data: ReceiptData }) {
  return (
    <div className="print-receipt" style={{ display: 'none' }}>
      <div style={{ fontFamily: "'Courier New', monospace", fontSize: '11px', lineHeight: 1.35, color: '#000' }}>
        {/* Header toko */}
        <div style={{ textAlign: 'center', marginBottom: 6 }}>
          <p style={{ fontWeight: 700, fontSize: '13px', textTransform: 'uppercase' }}>{data.storeName}</p>
          {data.storeLocation && <p>{data.storeLocation}</p>}
        </div>

        <p>{'='.repeat(32)}</p>
        <p>No : {data.invoiceNumber}</p>
        <p>Tgl: {formatDateTime(data.dateTime)}</p>
        <p>{'-'.repeat(32)}</p>

        {/* Item */}
        {data.items.map((it, i) => (
          <div key={i} style={{ marginBottom: 2 }}>
            <p>{it.name}</p>
            <p style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>
                {it.qty} x {num(it.price)}
              </span>
              <span>{num(it.subtotal)}</span>
            </p>
          </div>
        ))}

        <p>{'-'.repeat(32)}</p>

        {/* Ringkasan */}
        <p style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span>Subtotal</span>
          <span>{num(data.subtotal)}</span>
        </p>
        {(data.discount ?? 0) > 0 && (
          <p style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>Diskon</span>
            <span>-{num(data.discount!)}</span>
          </p>
        )}
        {(data.tax ?? 0) > 0 && (
          <p style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>Pajak</span>
            <span>{num(data.tax!)}</span>
          </p>
        )}
        <p style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, fontSize: '12px' }}>
          <span>TOTAL</span>
          <span>{num(data.total)}</span>
        </p>

        {data.paymentMethod && (
          <p style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>Bayar ({PAYMENT_LABEL[data.paymentMethod] ?? data.paymentMethod})</span>
            <span>{num(data.paidAmount ?? data.total)}</span>
          </p>
        )}
        {(data.change ?? 0) > 0 && (
          <p style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>Kembalian</span>
            <span>{num(data.change!)}</span>
          </p>
        )}

        <p>{'='.repeat(32)}</p>
        <div style={{ textAlign: 'center', marginTop: 6 }}>
          <p>{data.footerNote ?? 'Terima kasih atas kunjungan Anda'}</p>
        </div>
      </div>
    </div>
  )
}
