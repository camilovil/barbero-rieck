import { NextRequest, NextResponse } from 'next/server'
import { createCalendarEvent } from '@/lib/googleCalendar'
import { sendBookingNotification } from '@/lib/whatsapp'
import { sendBookingEmails } from '@/lib/email'
import type { BookingState } from '@/types/booking'

export async function POST(req: NextRequest) {
  try {
    const booking: BookingState = await req.json()

    if (!booking.nombre || !booking.email || !booking.whatsapp || !booking.date || !booking.time || !booking.service) {
      return NextResponse.json({ error: 'Faltan campos requeridos' }, { status: 400 })
    }

    const [eventId] = await Promise.all([
      createCalendarEvent(booking),
      sendBookingEmails(booking),
      sendBookingNotification(booking),
    ])

    return NextResponse.json({ success: true, eventId })
  } catch (err) {
    console.error('[api/booking] error:', err)
    return NextResponse.json({ error: 'Error al confirmar el turno' }, { status: 500 })
  }
}
