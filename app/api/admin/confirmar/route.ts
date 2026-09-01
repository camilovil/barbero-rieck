import { NextRequest, NextResponse } from 'next/server'
import { confirmCalendarEvent } from '@/lib/googleCalendar'
import { sendBookingEmails } from '@/lib/email'

/* Santiago confirma el turno cuando ve que la plata entró. Es el único
   camino que confirma una seña: le llega el comprobante de la transferencia
   por WhatsApp, lo mira, y toca el botón. Antes esto convivía con un webhook
   de Mercado Pago que confirmaba solo; hoy el que mira la plata es él.

   Le saca el ⏳ al evento, lo pasa a confirmado, lo deja fuera del barrido de
   vencidos y recién ahí salen los mails.

   Sirve igual para el efectivo y para el turno que arregló por WhatsApp: la
   seña existe para cubrirse de las ausencias, no para impedirle cobrar como
   quiera.

   La protege proxy.ts, como todo /api/admin/*. */
export async function POST(req: NextRequest) {
  try {
    const { eventId } = await req.json()
    if (!eventId) return NextResponse.json({ error: 'Falta eventId' }, { status: 400 })

    const booking = await confirmCalendarEvent(eventId)
    if (!booking) {
      /* confirmCalendarEvent sólo toca lo que está esperando la seña. Si
         devuelve null, o ya estaba confirmado —el webhook ganó de mano, o
         Santiago tocó dos veces— o el hold se venció y el evento no existe
         más. En los dos casos no hay nada que hacer y no es un error. */
      return NextResponse.json(
        { error: 'Ese turno ya no está esperando la seña: o ya se confirmó, o el horario se liberó.' },
        { status: 409 },
      )
    }

    /* El cliente reservó y quedó esperando: ahora su turno es un turno, y
       tiene que enterarse. Es el mismo mail que sale cuando se reserva sin
       seña — no la menciona, así que no le promete nada que no haya pasado. */
    try {
      await sendBookingEmails(booking, eventId)
    } catch (emailErr) {
      // El turno ya está confirmado; que falle un mail no lo desconfirma.
      console.error('[api/admin/confirmar] email error (non-fatal):', emailErr)
    }

    console.log(`[api/admin/confirmar] turno ${eventId} confirmado a mano`)
    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[api/admin/confirmar] error:', err)
    return NextResponse.json({ error: 'Error al confirmar' }, { status: 500 })
  }
}
