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

// POST — block a date or range
// Single: { date: 'YYYY-MM-DD' }
// Range:  { dateFrom: 'YYYY-MM-DD', dateTo: 'YYYY-MM-DD' }
export async function POST(req: NextRequest) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }
  try {
    const body = await req.json()

    // Normalize to always work with a range
    const from = body.dateFrom ?? body.date
    const to   = body.dateTo   ?? body.date
    if (!from) return NextResponse.json({ error: 'Falta date / dateFrom' }, { status: 400 })

    const parseDate = (s: string) => { const [y,m,d] = s.split('-').map(Number); return new Date(y, m-1, d) }
    const fromDate = parseDate(from)
    const toDate   = parseDate(to)
    if (fromDate > toDate) return NextResponse.json({ error: 'dateFrom debe ser <= dateTo' }, { status: 400 })

    // Block each day in range
    const blocked: { id: string; date: string }[] = []
    const cur = new Date(fromDate)
    while (cur <= toDate) {
      const id = await blockDate(new Date(cur))
      const dateStr = `${cur.getFullYear()}-${String(cur.getMonth()+1).padStart(2,'0')}-${String(cur.getDate()).padStart(2,'0')}`
      blocked.push({ id, date: dateStr })
      cur.setDate(cur.getDate() + 1)
    }

    return NextResponse.json({ success: true, blocked })
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
