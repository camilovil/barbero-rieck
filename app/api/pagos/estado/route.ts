import { NextRequest, NextResponse } from 'next/server'
import { getPaymentState } from '@/lib/googleCalendar'

/* La pantalla de vuelta pregunta acá si la seña llegó. No alcanza con el
   parámetro que trae Mercado Pago en la URL: el aviso bueno viaja por el
   webhook y puede tardar unos segundos más que el navegador del cliente. */
export async function GET(req: NextRequest) {
  const eventId = req.nextUrl.searchParams.get('turno')
  if (!eventId) {
    return NextResponse.json({ error: 'Falta el turno' }, { status: 400 })
  }

  try {
    return NextResponse.json({ estado: await getPaymentState(eventId) })
  } catch (err) {
    console.error('[api/pagos/estado] error:', err)
    return NextResponse.json({ error: 'No se pudo consultar el turno' }, { status: 500 })
  }
}
