import { NextResponse } from 'next/server'
import { getUpcomingEvents, expirePendingEvents } from '@/lib/googleCalendar'
import { isDepositEnabled } from '@/lib/mercadopago'

export async function GET() {
  try {
    /* Primero soltamos las reservas que nunca pagaron, y recién después
       armamos la lista: en paralelo la agenda se leería antes de que el
       barrido termine y el turno vencido aparecería igual. Sin esto el panel
       le muestra a Santiago turnos que ya no existen —el barrido corre cuando
       alguien reserva o mira horarios, y puede pasar un buen rato hasta que
       eso ocurra— y termina contando con un turno que se cayó solo. */
    if (isDepositEnabled()) {
      try {
        await expirePendingEvents()
      } catch (err) {
        console.error('[api/admin/bookings] no se pudieron liberar los vencidos:', err)
      }
    }

    const events = await getUpcomingEvents(30) // próximos 30 días
    return NextResponse.json({ events })
  } catch (err) {
    console.error('[api/admin/bookings] error:', err)
    return NextResponse.json({ error: 'Error al obtener turnos' }, { status: 500 })
  }
}
