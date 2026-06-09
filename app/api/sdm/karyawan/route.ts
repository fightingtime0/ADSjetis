import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const unitId = searchParams.get('unitId')
  const q      = searchParams.get('q')

  const employees = await prisma.employee.findMany({
    where: {
      isActive: true,
      ...(unitId ? { primaryUnitId: unitId } : {}),
      ...(q ? { name: { contains: q, mode: 'insensitive' } } : {}),
    },
    include: {
      primaryUnit: { select: { name: true, type: true } },
      user: { select: { email: true, role: true } },
      shifts: { orderBy: { date: 'desc' }, take: 5 },
    },
    orderBy: { name: 'asc' },
  })

  return NextResponse.json(employees.map((e) => ({
    ...e,
    salary: e.salary ? Number(e.salary) : null,
    shifts: e.shifts.map((s) => ({ ...s })),
  })))
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!['OWNER', 'MANAGER'].includes(session.user.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await req.json()
  const { name, primaryUnitId, phone, email, address, idNumber, position, salary, joinDate } = body

  if (!name || !primaryUnitId) {
    return NextResponse.json({ error: 'Nama dan unit wajib diisi' }, { status: 400 })
  }

  const employee = await prisma.employee.create({
    data: {
      name,
      primaryUnitId,
      phone:    phone    ?? null,
      email:    email    ?? null,
      address:  address  ?? null,
      idNumber: idNumber ?? null,
      position: position ?? null,
      salary:   salary   ? Number(salary) : null,
      joinDate: joinDate ? new Date(joinDate) : null,
    },
    include: { primaryUnit: { select: { name: true, type: true } } },
  })

  return NextResponse.json({ ...employee, salary: employee.salary ? Number(employee.salary) : null }, { status: 201 })
}
