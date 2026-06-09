import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { getCalendarEvent, deleteCalendarEvent, createCalendarEvent } from '@/lib/googleCalendar'
import { sendRescheduleEmails } from '@/lib/email'
import { sendRescheduleNotification } from '@/lib/whatsapp'
import type { BookingState } from '@/types/booking'

function parseDescription(desc: string): Record<string, string> {
  const result: Record<string, string> = {}
  for (const line of desc.split('\n')) {
    const idx = line.indexOf(': ')
    if (idx !== -1) result[line.slice(0, idx).toLowerCase()] = line.slice(idx + 2).trim()
  }
  return result
}

export async function POST(req: NextRequest) {
  // Auth check
  const cookieStore = await cookies()
  if (cookieStore.get('admin-auth')?.value !== 'true') {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

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
    const serviceNameRaw = (desc['servicio'] ?? '').split(' — ')[0].trim()
    const duration = serviceNameRaw.toLowerCase().includes('barba')
      ? (isLocal ? 60 : 90)
      : (isLocal ? 40 : 90)

    const oldStart = new Date(event.start?.dateTime ?? '')
    const oldDateStr = oldStart.toLocaleDateString('es-AR', {
      weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
    })
    const oldTime = oldStart.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })

    const booking: BookingState = {
      step: 5,
      location: isLocal ? 'local' : 'domicilio',
      nombre: desc['cliente'] ?? '',
      email: desc['email'] ?? '',
      whatsapp: (desc['whatsapp'] ?? '').replace(/https:\/\/wa\.me\//, ''),
      direccion: desc['dirección cliente'] ?? '',
      nota: desc['nota'] ?? '',
      date: new Date(newDate),
      time: newTime,
      service: {
        name: serviceNameRaw,
        duration,
        price: 0,
      },
    }

    // Delete old event and create updated one
    await deleteCalendarEvent(eventId)
    const newEventId = await createCalendarEvent(booking)

    // Notify client and Santiago
    const newDateStr = new Date(newDate).toLocaleDateString('es-AR', {
      weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
    })

    await Promise.all([
      desc['email']
        ? sendRescheduleEmails(
            desc['cliente'] ?? 'Cliente',
            desc['email'],
            oldDateStr,
            oldTime,
            newDateStr,
            newTime,
            desc['servicio'] ?? '—',
            newEventId,
          )
        : Promise.resolve(),
      sendRescheduleNotification(
        desc['cliente'] ?? 'Cliente',
        oldDateStr,
        oldTime,
        newDateStr,
        newTime,
        desc['servicio'] ?? '—',
      ),
    ])

    return NextResponse.json({ success: true, newEventId })
  } catch (err) {
    console.error('[api/admin/modificar] error:', err)
    return NextResponse.json({ error: 'Error al modificar el turno' }, { status: 500 })
  }
}
