import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { startOfDay, endOfDay } from 'date-fns'

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const unitId     = searchParams.get('unitId')
  const employeeId = searchParams.get('employeeId')
  const dateStr    = searchParams.get('date')

  const date = dateStr ? new Date(dateStr) : new Date()

  const shifts = await prisma.shift.findMany({
    where: {
      ...(unitId     ? { unitId }     : {}),
      ...(employeeId ? { employeeId } : {}),
      date: { gte: startOfDay(date), lte: endOfDay(date) },
    },
    include: { employee: { select: { id: true, name: true, position: true } } },
    orderBy: { date: 'desc' },
  })

  return NextResponse.json(shifts)
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { employeeId, unitId, date, clockIn, clockOut, note } = await req.json()
  if (!employeeId || !unitId || !date) {
    return NextResponse.json({ error: 'employeeId, unitId, date wajib diisi' }, { status: 400 })
  }

  const shift = await prisma.shift.create({
    data: {
      employeeId,
      unitId,
      date:     new Date(date),
      clockIn:  clockIn  ? new Date(clockIn)  : null,
      clockOut: clockOut ? new Date(clockOut) : null,
      note:     note ?? null,
    },
    include: { employee: { select: { id: true, name: true } } },
  })

  return NextResponse.json(shift, { status: 201 })
}

export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id, clockIn, clockOut, note } = await req.json()
  if (!id) return NextResponse.json({ error: 'Shift ID wajib' }, { status: 400 })

  const shift = await prisma.shift.update({
    where: { id },
    data: {
      clockIn:  clockIn  ? new Date(clockIn)  : undefined,
      clockOut: clockOut ? new Date(clockOut) : undefined,
      note:     note ?? undefined,
    },
  })

  return NextResponse.json(shift)
}
