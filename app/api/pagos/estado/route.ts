import { NextRequest, NextResponse } from 'next/server'
import { getPaymentState } from '@/lib/googleCalendar'

/* La pantalla que le explica al cliente cómo transferir pregunta acá dos
   cosas: cuánto es la seña y si Santiago ya la dio por recibida.

   Sigue preguntando cada tanto porque la confirmación no llega sola como
   llegaba el webhook: la hace Santiago desde el panel cuando ve el
   comprobante. Si el cliente todavía tiene la pantalla abierta, la ve pasar
   a confirmado sin tocar nada. */
export async function GET(req: NextRequest) {
  const eventId = req.nextUrl.searchParams.get('turno')
  if (!eventId) {
    return NextResponse.json({ error: 'Falta el turno' }, { status: 400 })
  }

  try {
    const { estado, sena } = await getPaymentState(eventId)
    return NextResponse.json({ estado, sena })
  } catch (err) {
    console.error('[api/pagos/estado] error:', err)
    return NextResponse.json({ error: 'No se pudo consultar el turno' }, { status: 500 })
  }
}
