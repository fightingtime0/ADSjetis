import { getSession } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { QrPrintClient } from './_components/qr-print-client'

export default async function QrPage() {
  const session = await getSession()
  if (!session) redirect('/login')

  const tableNumbers = Array.from({ length: 12 }, (_, i) => String(i + 1))

  return <QrPrintClient tableNumbers={tableNumbers} />
}
