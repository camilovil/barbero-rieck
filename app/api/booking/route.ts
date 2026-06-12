import { NextRequest, NextResponse } from 'next/server'
import { createCalendarEvent, getDayBookingCount, isDateBlocked, getSettings } from '@/lib/googleCalendar'
import { sendBookingNotification } from '@/lib/whatsapp'
import { sendBookingEmails } from '@/lib/email'
import type { BookingState } from '@/types/booking'

export async function POST(req: NextRequest) {
  try {
    const raw = await req.json()

    // JSON serializa Date como string — restaurar el objeto Date
    const booking: BookingState = {
      ...raw,
      date: raw.date ? new Date(raw.date) : null,
    }

    if (!booking.nombre || !booking.email || !booking.whatsapp || !booking.date || !booking.time || !booking.service) {
      return NextResponse.json({ error: 'Faltan campos requeridos' }, { status: 400 })
    }

    // Verificar que el día no esté bloqueado
    const dayBlocked = await isDateBlocked(booking.date)
    if (dayBlocked) {
      return NextResponse.json({ error: 'Este día no tiene turnos disponibles' }, { status: 409 })
    }

    // Verificar límite diario (configurable desde el admin)
    const { maxDailyBookings } = await getSettings()
    const count = await getDayBookingCount(booking.date)
    if (count >= maxDailyBookings) {
      return NextResponse.json({ error: 'No hay más turnos disponibles para este día' }, { status: 409 })
    }

    // Primero creamos el evento para tener el eventId y generar el link de cancelación
    const eventId = await createCalendarEvent(booking)

    // Luego enviamos emails con el link de cancelación incluido
    try {
      await Promise.all([
        sendBookingEmails(booking, eventId),
        sendBookingNotification(booking),
      ])
    } catch (emailErr) {
      console.error('[api/booking] email error (non-fatal):', emailErr)
    }

    return NextResponse.json({ success: true, eventId })
  } catch (err) {
    console.error('[api/booking] error:', err)
    return NextResponse.json({ error: 'Error al confirmar el turno' }, { status: 500 })
  }
}
