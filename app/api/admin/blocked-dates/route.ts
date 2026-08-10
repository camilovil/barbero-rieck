import { NextRequest, NextResponse } from 'next/server'
import { getBlockedDates, getBlockedRanges, blockDate, blockRange, unblockDate } from '@/lib/googleCalendar'

// Auth handled by middleware

export async function GET() {
  try {
    const [blocked, ranges] = await Promise.all([getBlockedDates(90), getBlockedRanges(90)])
    return NextResponse.json({ blocked, ranges })
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

    /* Con horas se bloquea la franja y el resto del día se sigue vendiendo;
       sin horas, el día entero como siempre. Si vienen las dos, la franja se
       repite en cada día del rango. */
    const timeFrom: string | undefined = body.timeFrom || undefined
    const timeTo: string | undefined = body.timeTo || undefined
    const esFranja = Boolean(timeFrom && timeTo)
    if (Boolean(timeFrom) !== Boolean(timeTo)) {
      return NextResponse.json({ error: 'Faltó una de las dos horas' }, { status: 400 })
    }
    if (esFranja && timeFrom! >= timeTo!) {
      return NextResponse.json({ error: 'La hora de inicio tiene que ser menor que la de fin' }, { status: 400 })
    }

    const blocked: { id: string; date: string }[] = []
    const cur = new Date(fromDate)
    while (cur <= toDate) {
      const id = esFranja
        ? await blockRange(new Date(cur), timeFrom!, timeTo!)
        : await blockDate(new Date(cur))
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
