import { NextRequest, NextResponse } from 'next/server'
import { getCalendarEvent } from '@/lib/googleCalendar'
import { CANCELLATION_MIN_HOURS, LOCATION_LABELS } from '@/lib/constants'
import { nombreServicio, precioServicio } from '@/lib/format'

function parseDescription(desc: string): Record<string, string> {
  const result: Record<string, string> = {}
  for (const line of (desc ?? '').split('\n')) {
    const idx = line.indexOf(': ')
    if (idx !== -1) result[line.slice(0, idx).toLowerCase()] = line.slice(idx + 2).trim()
  }
  return result
}

/* El turno visto por su dueño. Pide el mail además del id por la misma razón
   que cancelar y modificar: el id viaja en un link que puede terminar en
   cualquier lado, y sin el mail cualquiera que lo tenga vería los datos de
   otro. No es una sesión, pero alcanza para que el link solo no sirva. */
export async function GET(req: NextRequest) {
  const id = req.nextUrl.searchParams.get('id')
  const email = req.nextUrl.searchParams.get('email')

  if (!id || !email) {
    return NextResponse.json({ error: 'Faltan parámetros' }, { status: 400 })
  }

  try {
    const event = await getCalendarEvent(id)
    /* Un turno que no está puede ser uno cancelado o una reserva que se venció
       sin seña. Desde afuera son lo mismo: ya no existe. */
    if (!event) {
      return NextResponse.json({ error: 'Turno no encontrado' }, { status: 404 })
    }

    const desc = parseDescription(event.description ?? '')
    if (desc['email']?.toLowerCase() !== email.toLowerCase()) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
    }

    const start = event.start?.dateTime ?? ''
    const end = event.end?.dateTime ?? ''
    const horasRestantes = (new Date(start).getTime() - Date.now()) / 3600000
    const servicio = desc['servicio'] ?? ''
    const pago = event.extendedProperties?.private?.pago

    return NextResponse.json({
      nombre: desc['cliente'] ?? '',
      servicio: nombreServicio(servicio),
      precio: precioServicio(servicio),
      viatico: precioServicio(desc['viático'] ?? ''),
      viaticoAConvenir: (desc['viático'] ?? '').toUpperCase().includes('A CONVENIR'),
      esDomicilio: desc['modalidad'] === LOCATION_LABELS.domicilio,
      direccion: desc['dirección cliente'] ?? '',
      start,
      end,
      pago: pago === 'pendiente' || pago === 'pagado' ? pago : null,
      puedeCancel: horasRestantes >= CANCELLATION_MIN_HOURS,
      pasado: horasRestantes < 0,
    })
  } catch (err) {
    console.error('[api/turno] error:', err)
    return NextResponse.json({ error: 'No se pudo consultar el turno' }, { status: 500 })
  }
}
