import { NextRequest, NextResponse } from 'next/server'
import { getCalendarEvent, deleteCalendarEvent } from '@/lib/googleCalendar'
import { sendCancellationEmails } from '@/lib/email'
import { CANCELLATION_MIN_HOURS } from '@/lib/constants'

function parseDescription(desc: string): Record<string, string> {
  const result: Record<string, string> = {}
  for (const line of desc.split('\n')) {
    const idx = line.indexOf(': ')
    if (idx !== -1) {
      result[line.slice(0, idx).toLowerCase()] = line.slice(idx + 2).trim()
    }
  }
  return result
}

export async function POST(req: NextRequest) {
  try {
    const { eventId, email } = await req.json()

    if (!eventId || !email) {
      return NextResponse.json({ error: 'Faltan parámetros' }, { status: 400 })
    }

    const event = await getCalendarEvent(eventId)

    if (!event) {
      return NextResponse.json({ error: 'Turno no encontrado o ya cancelado' }, { status: 404 })
    }

    // Verificar que el email coincide con el del evento
    const desc = parseDescription(event.description ?? '')
    if (desc['email']?.toLowerCase() !== email.toLowerCase()) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
    }

    // Verificar anticipación mínima
    const startTime = new Date(event.start?.dateTime ?? '')
    const hoursUntil = (startTime.getTime() - Date.now()) / (1000 * 60 * 60)

    if (hoursUntil < CANCELLATION_MIN_HOURS) {
      return NextResponse.json({
        error: `Solo se puede cancelar con al menos ${CANCELLATION_MIN_HOURS} horas de anticipación`,
        hoursUntil: Math.round(hoursUntil),
      }, { status: 400 })
    }

    const dateStr = startTime.toLocaleDateString('es-AR', {
      weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
    })
    const time = startTime.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })
    const nombre = desc['cliente'] ?? 'Cliente'
    const servicio = desc['servicio'] ?? '—'
    const location = desc['modalidad']?.toLowerCase().includes('domicilio') ? 'domicilio' : 'local'
    const direccion = desc['dirección cliente'] ?? ''
    const serviceNameRaw = servicio.split(' — ')[0].trim()
    const durationMins = serviceNameRaw.toLowerCase().includes('barba')
      ? (location === 'domicilio' ? 90 : 60)
      : (location === 'domicilio' ? 90 : 40)

    // Borrar el evento — el slot queda libre automáticamente en la app
    await deleteCalendarEvent(eventId)

    // Enviar emails de aviso (no bloquea la cancelación si falla)
    try {
      await sendCancellationEmails(nombre, email, dateStr, time, servicio, eventId, location, direccion, String(durationMins))
    } catch (emailErr) {
      console.error('[api/cancelar] email error (non-fatal):', emailErr)
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[api/cancelar] error:', err)
    return NextResponse.json({ error: 'Error al cancelar el turno' }, { status: 500 })
  }
}

// GET — verifica el turno antes de mostrar la página de confirmación
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const eventId = searchParams.get('id')
  const email = searchParams.get('email')

  if (!eventId || !email) {
    return NextResponse.json({ error: 'Faltan parámetros' }, { status: 400 })
  }

  const event = await getCalendarEvent(eventId)
  if (!event) {
    return NextResponse.json({ error: 'Turno no encontrado o ya cancelado' }, { status: 404 })
  }

  const desc = parseDescription(event.description ?? '')
  if (desc['email']?.toLowerCase() !== email.toLowerCase()) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  }

  const startTime = new Date(event.start?.dateTime ?? '')
  const hoursUntil = (startTime.getTime() - Date.now()) / (1000 * 60 * 60)

  return NextResponse.json({
    nombre: desc['cliente'] ?? 'Cliente',
    servicio: desc['servicio'] ?? '—',
    fecha: startTime.toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }),
    hora: startTime.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' }),
    horasRestantes: Math.round(hoursUntil),
    puedeCancel: hoursUntil >= CANCELLATION_MIN_HOURS,
  })
}
