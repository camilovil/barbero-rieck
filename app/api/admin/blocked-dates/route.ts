import { NextRequest, NextResponse } from 'next/server'
import { getBlockedDates, blockDate, unblockDate } from '@/lib/googleCalendar'

// Auth handled by middleware

export async function GET() {
  try {
    const blocked = await getBlockedDates(90)
    return NextResponse.json({ blocked })
  } catch (err) {
    console.error('[admin/blocked-dates GET] error:', err)
    return NextResponse.json({ error: 'Error al obtener fechas' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const from = body.dateFrom ?? body.date
    const to   = body.dateTo   ?? body.date
    if (!from) return NextResponse.json({ error: 'Falta date / dateFrom' }, { status: 400 })

    const parseDate = (s: string) => { const [y,m,d] = s.split('-').map(Number); return new Date(y, m-1, d) }
    const fromDate = parseDate(from)
    const toDate   = parseDate(to)
    if (fromDate > toDate) return NextResponse.json({ error: 'dateFrom debe ser <= dateTo' }, { status: 400 })

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

export async function DELETE(req: NextRequest) {
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
