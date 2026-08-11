import { NextRequest, NextResponse } from 'next/server'
import { getDayAvailability, expirePendingEvents } from '@/lib/googleCalendar'
import { isDepositEnabled } from '@/lib/mercadopago'
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
    /* Primero soltamos los turnos sin seña que se vencieron, para que el
       horario aparezca libre acá mismo y no cuando pase el cron. Va antes y no
       en paralelo: si corrieran juntos, la grilla podría armarse mientras el
       vencido todavía existe y ese horario seguiría apareciendo ocupado. */
    if (isDepositEnabled()) {
      try {
        await expirePendingEvents()
      } catch (err) {
        console.error('[api/availability] no se pudieron liberar los vencidos:', err)
      }
    }

    const dia = await getDayAvailability(date, location)

    if (dia.dayBlocked) {
      return NextResponse.json({ blocked: TIME_SLOTS[location], dayBlocked: true })
    }

    // Los estáticos son horarios que nunca se venden (almuerzo, etc.)
    const blocked = Array.from(new Set([...BLOCKED_SLOTS, ...dia.blocked]))
    return NextResponse.json({ blocked })
  } catch (err) {
    console.error('[api/availability] error:', err)
    // Fallback: devolver solo los slots estáticos para no romper la UI
    return NextResponse.json({ blocked: BLOCKED_SLOTS })
  }
}
