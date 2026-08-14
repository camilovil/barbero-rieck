import { NextRequest, NextResponse } from 'next/server'
import { getCalendarEvent, deleteCalendarEvent, createCalendarEvent } from '@/lib/googleCalendar'
import { sendRescheduleEmails } from '@/lib/email'
import type { BookingState } from '@/types/booking'
import { hhmm, nombreServicio, precioServicio } from '@/lib/format'

function parseDescription(desc: string): Record<string, string> {
  const result: Record<string, string> = {}
  for (const line of desc.split('\n')) {
    const idx = line.indexOf(': ')
    if (idx !== -1) result[line.slice(0, idx).toLowerCase()] = line.slice(idx + 2).trim()
  }
  return result
}

export async function POST(req: NextRequest) {
  // La autenticación la resuelve proxy.ts: todo /api/admin/* está protegido
  try {
    const { eventId, newDate, newTime } = await req.json()

    if (!eventId || !newDate || !newTime) {
      return NextResponse.json({ error: 'Faltan parámetros' }, { status: 400 })
    }

    const event = await getCalendarEvent(eventId)
    if (!event) return NextResponse.json({ error: 'Turno no encontrado' }, { status: 404 })

    const desc = parseDescription(event.description ?? '')

    // Rebuild booking state from calendar event description
    const isLocal = !desc['modalidad']?.toLowerCase().includes('domicilio')
    const servicioRaw = desc['servicio'] ?? ''
    const duration = event.end?.dateTime
      ? Math.round((new Date(event.end.dateTime).getTime() - new Date(event.start!.dateTime!).getTime()) / 60000)
      : (isLocal ? 40 : 120)

    const oldStart = new Date(event.start?.dateTime ?? '')
    const oldTime = hhmm(oldStart)
    const direccion = desc['dirección cliente'] ?? ''

    const booking: BookingState = {
      step: 5,
      location: isLocal ? 'local' : 'domicilio',
      nombre: desc['cliente'] ?? '',
      email: desc['email'] ?? '',
      whatsapp: (desc['whatsapp'] ?? '').replace(/https:\/\/wa\.me\//, ''),
      direccion,
      barrio: desc['barrio'] ?? null,
      nota: desc['nota'] ?? '',
      date: new Date(newDate),
      time: newTime,
      service: {
        name: nombreServicio(servicioRaw),
        duration,
        /* Se arrastra el precio del turno original. Estaba en 0, y
           como reprogramar borra el evento y crea uno nuevo, el turno
           quedaba guardado como "Corte y barba — $0": el panel, el
           resumen del día y los mails posteriores lo daban por gratis. */
        price: precioServicio(servicioRaw),
      },
    }

    // Delete old event and create updated one
    /* A diferencia de /api/modificar —la ruta del cliente, que rechaza
       reprogramar un turno sin seña—, acá NO se bloquea. Es a propósito y
       es decisión de la casa: Santiago tiene clientes que pagan en
       efectivo, y si él mueve un turno impago es porque ya lo arregló.
       Recrearlo sin `pending` lo deja confirmado, que es justo lo que se
       busca.

       Si lo que querés es confirmarlo sin moverlo de horario, la acción es
       POST /api/admin/confirmar, que además deja escrito en el evento que
       se cobró a mano. Esta ruta no lo escribe: acá el turno se recrea
       desde cero y la línea de la seña no sobrevive. */
    await deleteCalendarEvent(eventId)
    const newEventId = await createCalendarEvent(booking)

    // Notify client and Santiago

    await Promise.all([
      desc['email']
        ? sendRescheduleEmails({
            nombre: desc['cliente'] ?? 'Cliente',
            email: desc['email'],
            oldDate: oldStart,
            oldTime,
            newDate: new Date(newDate),
            newTime,
            servicio: servicioRaw || '—',
            newEventId,
            location: isLocal ? 'local' : 'domicilio',
            direccion,
          })
        : Promise.resolve(),
    ])

    return NextResponse.json({ success: true, newEventId })
  } catch (err) {
    console.error('[api/admin/modificar] error:', err)
    return NextResponse.json({ error: 'Error al modificar el turno' }, { status: 500 })
  }
}
