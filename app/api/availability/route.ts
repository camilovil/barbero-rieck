import { NextRequest, NextResponse } from 'next/server'
import { getDayAvailability, expirePendingEvents } from '@/lib/googleCalendar'
import { isDepositEnabled } from '@/lib/flags'
import { BLOCKED_SLOTS, TIME_SLOTS } from '@/lib/constants'
import { diaDeAgenda } from '@/lib/format'
import { slotsPasados } from '@/lib/agenda'
import type { Location } from '@/types/booking'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const dateParam = searchParams.get('date')
  const location = searchParams.get('location') as Location | null

  if (!dateParam || !location) {
    return NextResponse.json({ error: 'Faltan parámetros date y location' }, { status: 400 })
  }

  const date = diaDeAgenda(dateParam)
  if (isNaN(date.getTime())) {
    return NextResponse.json({ error: 'Fecha inválida' }, { status: 400 })
  }

  const pasados = slotsPasados(date, location)

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
    const blocked = Array.from(new Set([...BLOCKED_SLOTS, ...pasados, ...dia.blocked]))
    return NextResponse.json({ blocked })
  } catch (err) {
    console.error('[api/availability] error:', err)
    /* Sin Google no sabemos qué está tomado, pero lo que ya pasó no depende
       de Google: eso se tapa igual. */
    return NextResponse.json({ blocked: Array.from(new Set([...BLOCKED_SLOTS, ...pasados])) })
  }
}
