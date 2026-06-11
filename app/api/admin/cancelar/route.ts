import { NextRequest, NextResponse } from 'next/server'
import { getCalendarEvent, deleteCalendarEvent } from '@/lib/googleCalendar'
import { sendCancellationEmails } from '@/lib/email'

function parseDescription(desc: string): Record<string, string> {
  const result: Record<string, string> = {}
  for (const line of desc.split('\n')) {
    const idx = line.indexOf(': ')
    if (idx !== -1) result[line.slice(0, idx).toLowerCase()] = line.slice(idx + 2).trim()
  }
  return result
}

export async function POST(req: NextRequest) {
  try {
    const { eventId, reason } = await req.json()
    if (!eventId) return NextResponse.json({ error: 'Falta eventId' }, { status: 400 })

    const event = await getCalendarEvent(eventId)
    if (!event) return NextResponse.json({ error: 'Evento no encontrado' }, { status: 404 })

    const desc = parseDescription(event.description ?? '')
    const startTime = new Date(event.start?.dateTime ?? '')
    const location = desc['modalidad']?.toLowerCase().includes('domicilio') ? 'domicilio' : 'local'
    const direccion = desc['dirección cliente'] ?? ''

    await deleteCalendarEvent(eventId)

    // Notificar al cliente si tiene email (no bloquea si falla)
    if (desc['email']) {
      const dateStr = startTime.toLocaleDateString('es-AR', {
        weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
      })
      const time = startTime.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })
      try {
        await sendCancellationEmails(desc['cliente'] ?? 'Cliente', desc['email'], dateStr, time, desc['servicio'] ?? '—', eventId, location, direccion, undefined, reason)
      } catch (emailErr) {
        console.error('[api/admin/cancelar] email error (non-fatal):', emailErr)
      }
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[api/admin/cancelar] error:', err)
    return NextResponse.json({ error: 'Error al cancelar' }, { status: 500 })
  }
}
