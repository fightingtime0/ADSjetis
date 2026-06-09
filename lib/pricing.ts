import { PricingDayType } from '@prisma/client'
import { eachDayOfInterval, isWeekend, format } from 'date-fns'

type RoomPricing = {
  id: string
  dayType: PricingDayType
  price: { toString(): string } // Decimal
  startDate: Date | null
  endDate: Date | null
  label: string | null
  isActive: boolean
}

export type NightBreakdown = {
  date: string        // 'YYYY-MM-DD'
  dayType: PricingDayType
  label: string       // 'Weekday' | 'Weekend' | 'Lebaran 2025' dll
  price: number
}

/**
 * Hitung harga per malam untuk range checkIn–checkOut.
 * Prioritas: Peak Season (startDate/endDate) > HOLIDAY > WEEKEND > WEEKDAY
 * Fallback: 0 (harus diset minimal WEEKDAY)
 */
export function resolveNightlyPricing(
  checkIn: Date,
  checkOut: Date,
  pricings: RoomPricing[]
): NightBreakdown[] {
  // Malam = checkIn s.d checkOut - 1 hari
  const nights = eachDayOfInterval({ start: checkIn, end: checkOut }).slice(0, -1)

  const activePricings = pricings.filter((p) => p.isActive)

  return nights.map((night) => {
    const nightStr = format(night, 'yyyy-MM-dd')

    // 1. Peak season: cek range tanggal spesifik (startDate–endDate)
    const peakMatch = activePricings.find(
      (p) =>
        p.startDate !== null &&
        p.endDate !== null &&
        night >= p.startDate &&
        night <= p.endDate
    )
    if (peakMatch) {
      return {
        date: nightStr,
        dayType: peakMatch.dayType,
        label: peakMatch.label ?? 'Peak Season',
        price: Number(peakMatch.price),
      }
    }

    // 2. Weekend / Weekday berdasarkan hari
    const dayIsWeekend = isWeekend(night)
    const dayTypeLookup = dayIsWeekend ? PricingDayType.WEEKEND : PricingDayType.WEEKDAY
    const dayMatch = activePricings.find(
      (p) => p.dayType === dayTypeLookup && !p.startDate && !p.endDate
    )
    if (dayMatch) {
      return {
        date: nightStr,
        dayType: dayMatch.dayType,
        label: dayIsWeekend ? 'Weekend' : 'Weekday',
        price: Number(dayMatch.price),
      }
    }

    // 3. Fallback: ambil harga WEEKDAY apapun yang ada
    const fallback = activePricings.find((p) => p.dayType === PricingDayType.WEEKDAY)
    return {
      date: nightStr,
      dayType: PricingDayType.WEEKDAY,
      label: 'Weekday',
      price: fallback ? Number(fallback.price) : 0,
    }
  })
}

export function calcBookingTotal(breakdown: NightBreakdown[]): number {
  return breakdown.reduce((sum, n) => sum + n.price, 0)
}

/**
 * Ambil harga representatif untuk "malam ini" — dipakai di grid kamar.
 * Pakai tanggal hari ini sebagai acuan.
 */
export function getTonightPrice(pricings: RoomPricing[]): number {
  const today = new Date()
  const tomorrow = new Date(today)
  tomorrow.setDate(today.getDate() + 1)
  const breakdown = resolveNightlyPricing(today, tomorrow, pricings)
  return breakdown[0]?.price ?? 0
}

export function generateBookingCode(): string {
  const now = new Date()
  const y = now.getFullYear().toString().slice(-2)
  const m = String(now.getMonth() + 1).padStart(2, '0')
  const d = String(now.getDate()).padStart(2, '0')
  const rand = Math.floor(Math.random() * 9000 + 1000)
  return `BK-${y}${m}${d}-${rand}`
}
