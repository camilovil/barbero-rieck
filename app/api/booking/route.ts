import { NextRequest, NextResponse } from 'next/server'
import { createCalendarEvent, getDayBookingCount, isDateBlocked, getSettings, expirePendingEvents } from '@/lib/googleCalendar'
import { sendBookingEmails, sendDepositInstructionsEmail } from '@/lib/email'
import { isDepositEnabled } from '@/lib/flags'
import { depositAmount, motivoParaNoTomarlo, SERVICES } from '@/lib/constants'
import type { BookingState, Location } from '@/types/booking'

export async function POST(req: NextRequest) {
  try {
    const raw = await req.json()

    // JSON serializa Date como string — restaurar el objeto Date
    const booking: BookingState = {
      ...raw,
      date: raw.date ? new Date(raw.date) : null,
    }

    if (!booking.nombre || !booking.email || !booking.whatsapp || !booking.date || !booking.time || !booking.service) {
      return NextResponse.json({ error: 'Faltan campos requeridos' }, { status: 400 })
    }

    /* Nada de lo que decide plata o agenda se le cree al cliente.
       El navegador manda el servicio entero —nombre, precio y duración— y
       hasta acá se guardaba tal cual: alcanzaba con un POST a mano con
       `price: 0` para que `sena` diera cero, `pending` diera falso y el
       turno quedara confirmado sin pagar la seña. Con cualquier otro
       número, la seña que se le pedía salía de ese monto.

       Así que del cliente se toma UNA sola cosa, el nombre del servicio, y
       con eso se busca en el catálogo. El precio y la duración que se
       guardan son los del servidor. */
    const location: Location = booking.location === 'domicilio' ? 'domicilio' : 'local'
    const delCatalogo = SERVICES[location].find(s => s.name === booking.service?.name)
    if (!delCatalogo) {
      return NextResponse.json({ error: 'Ese servicio no existe' }, { status: 400 })
    }
    const rechazo = motivoParaNoTomarlo(booking.date, booking.time, location)
    if (rechazo) {
      return NextResponse.json({ error: rechazo }, { status: 400 })
    }
    booking.location = location
    booking.service = delCatalogo


    /* Antes de contar si queda lugar, soltamos las reservas que nunca pagaron
       la seña: si no, un abandono en la pantalla de pago le tapa el horario a
       alguien que sí lo quiere. */
    if (isDepositEnabled()) {
      try {
        await expirePendingEvents()
      } catch (err) {
        console.error('[api/booking] no se pudieron liberar los vencidos:', err)
      }
    }

    // Verificar que el día no esté bloqueado
    const dayBlocked = await isDateBlocked(booking.date)
    if (dayBlocked) {
      return NextResponse.json({ error: 'Este día no tiene turnos disponibles' }, { status: 409 })
    }

    // Verificar límite diario (configurable desde el admin)
    const { maxDailyBookings } = await getSettings()
    const count = await getDayBookingCount(booking.date)
    if (count >= maxDailyBookings) {
      return NextResponse.json({ error: 'No hay más turnos disponibles para este día' }, { status: 409 })
    }

    // Primero creamos el evento para tener el eventId y generar el link de cancelación
    const sena = booking.service.price ? depositAmount(booking.service.price) : 0
    const pending = isDepositEnabled() && sena > 0
    const eventId = await createCalendarEvent(booking, { pending })

    /* Con seña, el turno todavía no es un turno: el horario le queda guardado
       mientras transfiere, y los mails de confirmación salen cuando Santiago
       ve el comprobante. Confirmar por mail algo que no está pago es prometer
       un turno que se cae solo cuando vence el plazo.

       Lo que sí sale ahora es el mail con el alias y el monto, y no es un
       detalle: es lo único que le queda al cliente si cierra la pestaña. */
    if (pending) {
      try {
        await sendDepositInstructionsEmail(booking, eventId, sena)
      } catch (emailErr) {
        /* El horario no se suelta por esto. La pantalla siguiente muestra el
           alias igual, así que el cliente puede pagar aunque el mail no haya
           salido; tirar la reserva sería el peor de los dos males. */
        console.error('[api/booking] no salió el mail con las instrucciones de la seña:', emailErr)
      }
      return NextResponse.json({ success: true, eventId, pendingPayment: true })
    }

    // Luego enviamos emails con el link de cancelación incluido
    try {
      await sendBookingEmails(booking, eventId)
    } catch (emailErr) {
      console.error('[api/booking] email error (non-fatal):', emailErr)
    }

    return NextResponse.json({ success: true, eventId })
  } catch (err) {
    console.error('[api/booking] error:', err)
    return NextResponse.json({ error: 'Error al confirmar el turno' }, { status: 500 })
  }
}
