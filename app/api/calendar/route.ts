import { NextRequest, NextResponse } from 'next/server'
import { createCalendarEvent } from '@/lib/googleCalendar'
import type { BookingState } from '@/types/booking'

// Standalone endpoint for calendar-only event creation
export async function POST(req: NextRequest) {
  try {
    const booking: BookingState = await req.json()
    const eventId = await createCalendarEvent(booking)
    return NextResponse.json({ success: true, eventId })
  } catch (err) {
    console.error('[api/calendar] error:', err)
    return NextResponse.json({ error: 'Error al crear evento en Calendar' }, { status: 500 })
  }
}
