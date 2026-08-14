import { NextRequest, NextResponse } from 'next/server'
import { confirmCalendarEvent, getCalendarEvent } from '@/lib/googleCalendar'
import { sendBookingEmails, sendOrphanDepositEmail } from '@/lib/email'
import { getPago, assertWebhookValido, InvalidWebhookSignatureError } from '@/lib/mercadopago'

/* Acá entra el aviso de Mercado Pago de que la seña se pagó, y es lo único
   que confirma un turno. La vuelta del cliente al sitio no sirve para eso:
   puede cerrar el navegador antes de volver, o volver sin haber pagado.

   Todo lo que no sea «pagó y había un turno esperando» se responde 200 igual.
   Un error hace que Mercado Pago reintente durante días una notificación que
   nunca vamos a poder procesar. */
export async function POST(req: NextRequest) {
  const dataId = req.nextUrl.searchParams.get('data.id')
  const body = await req.json().catch(() => null)
  const tipo = body?.type ?? req.nextUrl.searchParams.get('type')

  /* El tipo se mira antes que la firma. Mercado Pago avisa de más cosas que
     los pagos —merchant_order y compañía— y esos avisos no siempre traen el
     data.id en la query, que es justo con lo que la firma cierra: validarlos
     primero los mandaba a un 401 y Mercado Pago reintenta durante días una
     notificación que igual íbamos a ignorar. */
  if (tipo !== 'payment') return NextResponse.json({ ignorado: tipo ?? 'sin tipo' })

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

    const booking = await confirmCalendarEvent(pago.eventId, { via: 'mercadopago', paymentId })
    if (!booking) {
      /* O ya lo habíamos confirmado —Mercado Pago repite el aviso— o el turno
         se venció antes de que entrara la plata. Los separa una sola cosa: si
         el evento sigue ahí hay turno y no pasó nada; si no está, hay una seña
         cobrada sin nada detrás. */
      const turno = await getCalendarEvent(pago.eventId)
      if (turno) {
        console.log(`[pagos/webhook] aviso repetido del pago ${paymentId}, el turno ${pago.eventId} ya estaba confirmado`)
        return NextResponse.json({ ignorado: 'ya confirmado' })
      }

      /* Plata cobrada y ningún turno que la respalde. Esto no se arregla solo:
         hay que devolverla o reubicar al cliente a mano, así que va por mail.
         Un console.error acá no lo lee nadie. */
      console.error(
        `[pagos/webhook] pago ${paymentId} aprobado y el turno ${pago.eventId} ya no existe: seña sin turno`,
      )
      try {
        await sendOrphanDepositEmail({ paymentId, eventId: pago.eventId, amount: pago.amount })
      } catch (emailErr) {
        // Que falle el aviso no puede borrar el dato: queda escrito acá.
        console.error(
          `[pagos/webhook] no se pudo avisar la seña sin turno — pago ${paymentId}, turno ${pago.eventId}, monto ${pago.amount}:`,
          emailErr,
        )
      }
      return NextResponse.json({ ignorado: 'seña sin turno' })
    }

    try {
      await sendBookingEmails(booking, pago.eventId)
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
