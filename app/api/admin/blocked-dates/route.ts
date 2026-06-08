import { NextRequest, NextResponse } from 'next/server'
import { getBlockedDates, blockDate, unblockDate } from '@/lib/googleCalendar'
import { cookies } from 'next/headers'

async function isAdmin(): Promise<boolean> {
  const cookieStore = await cookies()
  return cookieStore.get('admin_session')?.value === process.env.ADMIN_SECRET
}

// GET — list blocked dates with ids
export async function GET() {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }
  try {
    const blocked = await getBlockedDates(90)
    return NextResponse.json({ blocked })
  } catch (err) {
    console.error('[admin/blocked-dates GET] error:', err)
    return NextResponse.json({ error: 'Error al obtener fechas' }, { status: 500 })
  }
}

// POST — block a date { date: 'YYYY-MM-DD' }
export async function POST(req: NextRequest) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }
  try {
    const { date } = await req.json()
    if (!date) return NextResponse.json({ error: 'Falta date' }, { status: 400 })
    const [year, month, day] = date.split('-').map(Number)
    const d = new Date(year, month - 1, day)
    const id = await blockDate(d)
    return NextResponse.json({ success: true, id, date })
  } catch (err) {
    console.error('[admin/blocked-dates POST] error:', err)
    return NextResponse.json({ error: 'Error al bloquear fecha' }, { status: 500 })
  }
}

// DELETE — unblock { eventId: string }
export async function DELETE(req: NextRequest) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }
  try {
    const { eventId } = await req.json()
    if (!eventId) return NextResponse.json({ error: 'Falta eventId' }, { status: 400 })
    await unblockDate(eventId)
    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[admin/blocked-dates DELETE] error:', err)
    return NextResponse.json({ error: 'Error al desbloquear fecha' }, { status: 500 })
  }
}
