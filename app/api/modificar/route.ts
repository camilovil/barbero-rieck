import { NextRequest, NextResponse } from 'next/server'
import { getCalendarEvent, deleteCalendarEvent, createCalendarEvent } from '@/lib/googleCalendar'
import { sendRescheduleEmails } from '@/lib/email'
import { CANCELLATION_MIN_HOURS } from '@/lib/constants'
import type { BookingState } from '@/types/booking'

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
    fecha: startTime.toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }),
    hora: startTime.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' }),
    horasRestantes: Math.round(hoursUntil),
    puedeMod: hoursUntil >= CANCELLATION_MIN_HOURS,
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

    const startTime = new Date(event.start?.dateTime ?? '')
    const hoursUntil = (startTime.getTime() - Date.now()) / (1000 * 60 * 60)
    if (hoursUntil < CANCELLATION_MIN_HOURS) {
      return NextResponse.json({ error: 'No se puede modificar con menos de 24 horas de anticipación' }, { status: 400 })
    }

    // Rebuild booking state from calendar event description
    const isLocal = !desc['modalidad']?.toLowerCase().includes('domicilio')
    const serviceNameRaw = (desc['servicio'] ?? '').split(' — ')[0].trim()
    const durationMatch = event.end?.dateTime
      ? Math.round((new Date(event.end.dateTime).getTime() - new Date(event.start!.dateTime!).getTime()) / 60000)
      : (isLocal ? 40 : 120)

    const booking: BookingState = {
      step: 5,
      location: isLocal ? 'local' : 'domicilio',
      nombre: desc['cliente'] ?? '',
      email: desc['email'] ?? email,
      whatsapp: (desc['whatsapp'] ?? '').replace(/https:\/\/wa\.me\//,''),
      direccion: desc['dirección cliente'] ?? '',
      nota: desc['nota'] ?? '',
      date: new Date(newDate),
      time: newTime,
      service: {
        name: serviceNameRaw,
        duration: durationMatch,
        price: 0,
      },
    }

    // Capture old date/time for the reschedule email
    const oldDateStr = startTime.toLocaleDateString('es-AR', {
      weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
    })
    const oldTime = startTime.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })

    // Delete old event and create updated one
    await deleteCalendarEvent(eventId)
    const newEventId = await createCalendarEvent(booking)

    // Send reschedule email (shows old date crossed out + new date)
    const newDateStr = new Date(newDate).toLocaleDateString('es-AR', {
      weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
    })
    await sendRescheduleEmails(
      booking.nombre,
      booking.email,
      oldDateStr,
      oldTime,
      newDateStr,
      newTime,
      booking.service?.name ?? serviceNameRaw,
      newEventId,
    )

    return NextResponse.json({ success: true, eventId: newEventId })
  } catch (err) {
    console.error('[api/modificar] error:', err)
    return NextResponse.json({ error: 'Error al modificar el turno' }, { status: 500 })
  }
}
