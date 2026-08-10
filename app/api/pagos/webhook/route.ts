import { NextRequest, NextResponse } from 'next/server'
import { confirmCalendarEvent } from '@/lib/googleCalendar'
import { sendBookingEmails } from '@/lib/email'
import { sendBookingNotification } from '@/lib/whatsapp'
import { getPago, assertWebhookValido, InvalidWebhookSignatureError } from '@/lib/mercadopago'

/* Acá entra el aviso de Mercado Pago de que la seña se pagó, y es lo único
   que confirma un turno. La vuelta del cliente al sitio no sirve para eso:
   puede cerrar el navegador antes de volver, o volver sin haber pagado.

   Todo lo que no sea «pagó y había un turno esperando» se responde 200 igual.
   Un error hace que Mercado Pago reintente durante días una notificación que
   nunca vamos a poder procesar. */
export async function POST(req: NextRequest) {
  const dataId = req.nextUrl.searchParams.get('data.id')

  try {
    assertWebhookValido({
      xSignature: req.headers.get('x-signature'),
      xRequestId: req.headers.get('x-request-id'),
      dataId,
    })
  } catch (err) {
    if (err instanceof InvalidWebhookSignatureError) {
      console.error('[pagos/webhook] firma inválida:', err.reason, err.requestId)
      return NextResponse.json({ error: 'Firma inválida' }, { status: 401 })
    }
    console.error('[pagos/webhook] no se pudo validar la firma:', err)
    return NextResponse.json({ error: 'No se pudo validar' }, { status: 500 })
  }

  try {
    const body = await req.json().catch(() => null)
    const tipo = body?.type ?? req.nextUrl.searchParams.get('type')
    if (tipo !== 'payment') return NextResponse.json({ ignorado: tipo ?? 'sin tipo' })

    const paymentId = String(body?.data?.id ?? dataId ?? '')
    if (!paymentId) return NextResponse.json({ ignorado: 'sin id de pago' })

    const pago = await getPago(paymentId)
    if (pago.status !== 'approved') {
      return NextResponse.json({ ignorado: pago.status })
    }
    if (!pago.eventId) {
      console.error('[pagos/webhook] pago aprobado sin turno asociado:', paymentId)
      return NextResponse.json({ ignorado: 'sin external_reference' })
    }

    const booking = await confirmCalendarEvent(pago.eventId, paymentId)
    if (!booking) {
      /* O ya lo habíamos confirmado —Mercado Pago repite el aviso— o el turno
         se venció antes de que entrara la plata. Lo segundo hay que mirarlo a
         mano: hay una seña cobrada sin turno que la respalde. */
      console.error(
        `[pagos/webhook] pago ${paymentId} aprobado y el turno ${pago.eventId} no estaba esperando: ya confirmado o vencido`,
      )
      return NextResponse.json({ ignorado: 'nada que confirmar' })
    }

    try {
      await Promise.all([
        sendBookingEmails(booking, pago.eventId),
        sendBookingNotification(booking),
      ])
    } catch (emailErr) {
      // El turno ya está confirmado; que falle un mail no lo desconfirma.
      console.error('[pagos/webhook] email error (non-fatal):', emailErr)
    }

    console.log(`[pagos/webhook] turno ${pago.eventId} confirmado con el pago ${paymentId}`)
    return NextResponse.json({ confirmado: true })
  } catch (err) {
    console.error('[pagos/webhook] error:', err)
    return NextResponse.json({ error: 'Error procesando el pago' }, { status: 500 })
  }
}
