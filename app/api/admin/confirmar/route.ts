import { NextRequest, NextResponse } from 'next/server'
import { confirmCalendarEvent } from '@/lib/googleCalendar'
import { sendBookingEmails } from '@/lib/email'

/* Santiago confirma un turno a mano, sin que haya pasado por Mercado Pago.
   El caso real: le pagaron en efectivo, o el turno lo arregló él por
   WhatsApp. La seña existe para cubrirse de las ausencias, no para
   impedirle cobrar como quiera — así que su palabra vale lo mismo que la
   del webhook.

   Hace exactamente lo mismo que la confirmación por pago: le saca el ⏳,
   lo pasa a confirmado y lo deja fuera del barrido de vencidos. La única
   diferencia queda escrita en el evento, «cobrada a mano por Santiago»,
   para que después se pueda cuadrar la caja y distinguir lo que entró por
   Mercado Pago de lo que entró en efectivo.

   La protege proxy.ts, como todo /api/admin/*. */
export async function POST(req: NextRequest) {
  try {
    const { eventId } = await req.json()
    if (!eventId) return NextResponse.json({ error: 'Falta eventId' }, { status: 400 })

    const booking = await confirmCalendarEvent(eventId, { via: 'mano' })
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
       tiene que enterarse. Es el mismo mail que sale cuando el pago entra
       por Mercado Pago — no menciona la seña, así que no le promete nada
       que no haya pasado. */
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
