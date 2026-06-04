import { NextResponse } from 'next/server'
import { getUpcomingEvents } from '@/lib/googleCalendar'

export async function GET() {
  try {
    const events = await getUpcomingEvents(30) // próximos 30 días
    return NextResponse.json({ events })
  } catch (err) {
    console.error('[api/admin/bookings] error:', err)
    return NextResponse.json({ error: 'Error al obtener turnos' }, { status: 500 })
  }
}
