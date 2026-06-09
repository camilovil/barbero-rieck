import { NextResponse } from 'next/server'
import { getPastEvents } from '@/lib/googleCalendar'

export async function GET() {
  try {
    const events = await getPastEvents(60) // últimos 60 días
    return NextResponse.json({ events })
  } catch (err) {
    console.error('[api/admin/bookings/history] error:', err)
    return NextResponse.json({ error: 'Error al obtener historial' }, { status: 500 })
  }
}
