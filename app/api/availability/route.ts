import { NextRequest, NextResponse } from 'next/server'
import { getBookedSlots, isDateBlocked } from '@/lib/googleCalendar'
import { BLOCKED_SLOTS, TIME_SLOTS } from '@/lib/constants'
import type { Location } from '@/types/booking'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const dateParam = searchParams.get('date')
  const location = searchParams.get('location') as Location | null

  if (!dateParam || !location) {
    return NextResponse.json({ error: 'Faltan parámetros date y location' }, { status: 400 })
  }

  const date = new Date(dateParam)
  if (isNaN(date.getTime())) {
    return NextResponse.json({ error: 'Fecha inválida' }, { status: 400 })
  }

  try {
    // Si el día está bloqueado por Santiago, devolver todos los slots como ocupados
    const dayBlocked = await isDateBlocked(date)
    if (dayBlocked) {
      return NextResponse.json({ blocked: TIME_SLOTS[location], dayBlocked: true })
    }

    // Slots ocupados en Calendar + slots bloqueados estáticos (horarios de almuerzo, etc.)
    const calendarBooked = await getBookedSlots(date, location)
    const blocked = Array.from(new Set([...BLOCKED_SLOTS, ...calendarBooked]))

    return NextResponse.json({ blocked })
  } catch (err) {
    console.error('[api/availability] error:', err)
    // Fallback: devolver solo los slots estáticos para no romper la UI
    return NextResponse.json({ blocked: BLOCKED_SLOTS })
  }
}
