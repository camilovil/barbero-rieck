import { NextRequest, NextResponse } from 'next/server'
import { getCalendarEvent, deleteCalendarEvent, createCalendarEvent } from '@/lib/googleCalendar'
import { sendRescheduleEmails } from '@/lib/email'
import { CANCELLATION_MIN_HOURS } from '@/lib/constants'
import type { BookingState } from '@/types/booking'
import { fechaLarga, hhmm, nombreServicio, precioServicio } from '@/lib/format'

function parseDescription(desc: string): Record<string, string> {
  const result: Record<string, string> = {}
  for (const line of desc.split('\n')) {
    const idx = line.indexOf(': ')
    if (idx !== -1) result[line.slice(0, idx).toLowerCase()] = line.slice(idx + 2).trim()
  }
  return result
}

// GET — verify the booking before showing the modify page
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const eventId = searchParams.get('id')
  const email = searchParams.get('email')

  if (!eventId || !email) return NextResponse.json({ error: 'Faltan parámetros' }, { status: 400 })

  const event = await getCalendarEvent(eventId)
  if (!event) return NextResponse.json({ error: 'Turno no encontrado o ya cancelado' }, { status: 404 })

  const desc = parseDescription(event.description ?? '')
  if (desc['email']?.toLowerCase() !== email.toLowerCase()) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  }

  const startTime = new Date(event.start?.dateTime ?? '')
  const hoursUntil = (startTime.getTime() - Date.now()) / (1000 * 60 * 60)

  return NextResponse.json({
    nombre: desc['cliente'] ?? 'Cliente',
    servicio: desc['servicio'] ?? '—',
    modalidad: desc['modalidad'] ?? '—',
    fecha: fechaLarga(startTime),
    hora: hhmm(startTime),
    horasRestantes: Math.round(hoursUntil),
    puedeMod: hoursUntil >= CANCELLATION_MIN_HOURS,
    santiWa: process.env.SANTIAGO_WHATSAPP ?? '',
  })
}

// POST — { eventId, email, newDate, newTime }
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { eventId, email, newDate, newTime } = body

    if (!eventId || !email || !newDate || !newTime) {
      return NextResponse.json({ error: 'Faltan parámetros' }, { status: 400 })
    }

    const event = await getCalendarEvent(eventId)
    if (!event) return NextResponse.json({ error: 'Turno no encontrado' }, { status: 404 })

    const desc = parseDescription(event.description ?? '')
    if (desc['email']?.toLowerCase() !== email.toLowerCase()) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
    }

    /* Un turno que todavía no pagó la seña NO se reprograma. Más abajo
       esto borra el evento y lo vuelve a crear, y la reserva pendiente se
       crea con `{ pending: true }` — que es lo que le pone el estado, el
       vencimiento y el ⏳—. Al recrearlo sin eso, salía confirmado: se
       reservaba, no se pagaba, se pedía reprogramar al mismo horario y el
       turno quedaba cerrado gratis. Y encima no lo levantaba nadie, porque
       el barrido de vencidos busca `pago=pendiente`.

       Se rechaza en vez de arrastrar el estado: mientras la seña no entró
       no hay turno que mover, hay un horario en préstamo. O se paga o se
       vence. */
    if (event.extendedProperties?.private?.pago === 'pendiente') {
      return NextResponse.json(
        { error: 'Esta reserva todavía no tiene la seña paga. Pagala o esperá a que se libere el horario.' },
        { status: 409 },
      )
    }

    const startTime = new Date(event.start?.dateTime ?? '')
    const hoursUntil = (startTime.getTime() - Date.now()) / (1000 * 60 * 60)
    if (hoursUntil < CANCELLATION_MIN_HOURS) {
      return NextResponse.json({ error: 'No se puede modificar con menos de 24 horas de anticipación' }, { status: 400 })
    }

    // Rebuild booking state from calendar event description
    const isLocal = !desc['modalidad']?.toLowerCase().includes('domicilio')
    const servicioRaw = desc['servicio'] ?? ''
    const durationMatch = event.end?.dateTime
      ? Math.round((new Date(event.end.dateTime).getTime() - new Date(event.start!.dateTime!).getTime()) / 60000)
      : (isLocal ? 40 : 120)
    const direccion = desc['dirección cliente'] ?? ''

    const booking: BookingState = {
      step: 5,
      location: isLocal ? 'local' : 'domicilio',
      nombre: desc['cliente'] ?? '',
      email: desc['email'] ?? email,
      whatsapp: (desc['whatsapp'] ?? '').replace(/https:\/\/wa\.me\//,''),
      direccion,
      barrio: desc['barrio'] ?? null,
      nota: desc['nota'] ?? '',
      date: new Date(newDate),
      time: newTime,
      service: {
        name: nombreServicio(servicioRaw),
        duration: durationMatch,
        // Ver la nota en /api/admin/modificar: el precio se arrastra.
        price: precioServicio(servicioRaw),
      },
    }

    // Capture old date/time for the reschedule email
    const oldTime = hhmm(startTime)

    // Delete old event and create updated one
    await deleteCalendarEvent(eventId)
    const newEventId = await createCalendarEvent(booking)

    // Send reschedule email (shows old date crossed out + new date)
    await sendRescheduleEmails({
      nombre: booking.nombre,
      email: booking.email,
      oldDate: startTime,
      oldTime,
      newDate: new Date(newDate),
      newTime,
      // La línea completa, con precio: el mail muestra cuánto se paga.
      servicio: servicioRaw || '—',
      newEventId,
      location: isLocal ? 'local' : 'domicilio',
      direccion,
    })

    return NextResponse.json({ success: true, eventId: newEventId })
  } catch (err) {
    console.error('[api/modificar] error:', err)
    return NextResponse.json({ error: 'Error al modificar el turno' }, { status: 500 })
  }
}
