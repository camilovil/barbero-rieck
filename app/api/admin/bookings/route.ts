import { NextResponse } from 'next/server'
import { getUpcomingEvents, expirePendingEvents } from '@/lib/googleCalendar'

export async function GET() {
  try {
    /* Primero soltamos las reservas que nunca pagaron, y recién después
       armamos la lista: en paralelo la agenda se leería antes de que el
       barrido termine y el turno vencido aparecería igual. Sin esto el panel
       le muestra a Santiago turnos que ya no existen —el barrido corre cuando
       alguien reserva o mira horarios, y puede pasar un buen rato hasta que
       eso ocurra— y termina contando con un turno que se cayó solo.

       Acá el barrido NO cuelga de que la seña esté encendida, y en las dos
       rutas públicas sí. La asimetría es a propósito: si alguna vez se apaga
       DEPOSIT_ENABLED con reservas pendientes vivas, esos eventos quedan
       tapando su horario y ya nadie los toca —ni las rutas públicas, porque
       el flag está apagado, ni el cron, que no está agendado—. No hay
       síntoma: ese horario simplemente no vuelve a aparecer libre nunca.
       Esta ruta la abre Santiago unas pocas veces por día, así que la
       consulta de más no se siente; ponerla en /api/availability, que es lo
       que más se pega, sería pagar un viaje a Google en cada grilla de
       horarios para un caso que pasa una vez. */
    try {
      await expirePendingEvents()
    } catch (err) {
      console.error('[api/admin/bookings] no se pudieron liberar los vencidos:', err)
    }

    const events = await getUpcomingEvents(30) // próximos 30 días
    return NextResponse.json({ events })
  } catch (err) {
    console.error('[api/admin/bookings] error:', err)
    return NextResponse.json({ error: 'Error al obtener turnos' }, { status: 500 })
  }
}
