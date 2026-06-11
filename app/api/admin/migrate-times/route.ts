import { NextRequest, NextResponse } from 'next/server'
import { google } from 'googleapis'

function getAuth() {
  return new google.auth.GoogleAuth({
    credentials: {
      client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    },
    scopes: ['https://www.googleapis.com/auth/calendar'],
  })
}

function isAuthorized(req: NextRequest): boolean {
  const secret = process.env.ADMIN_SECRET
  if (!secret) return false
  const cookie = req.cookies.get('admin_token')?.value
  const param = req.nextUrl.searchParams.get('secret')
  return cookie === secret || param === secret
}

async function getAllBookings() {
  const calendar = google.calendar({ version: 'v3', auth: getAuth() })
  const now = new Date()
  const future = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000)
  const res = await calendar.events.list({
    calendarId: process.env.GOOGLE_CALENDAR_ID!,
    timeMin: now.toISOString(),
    timeMax: future.toISOString(),
    singleEvents: true,
    orderBy: 'startTime',
  })
  return (res.data.items ?? []).filter(e => e.id && e.start?.dateTime && e.summary?.includes('✂️'))
}

// Hora en Buenos Aires (UTC-3, sin DST)
function hourBA(dateTimeStr: string): number {
  const d = new Date(dateTimeStr)
  return (d.getUTCHours() - 3 + 24) % 24
}

// Evento sospechoso: fuera del horario laboral BA (antes de 9 o después de 20)
function isStale(dateTimeStr: string): boolean {
  const h = hourBA(dateTimeStr)
  return h < 9 || h >= 21
}

// Suma 3 horas manteniendo el offset -03:00
function addThreeHours(dateTimeStr: string): string {
  const d = new Date(dateTimeStr)
  d.setTime(d.getTime() + 3 * 60 * 60 * 1000)
  const pad = (n: number) => String(n).padStart(2, '0')
  // Convertir UTC resultante a BA local
  const baMs = d.getTime() - 3 * 60 * 60 * 1000
  const ba = new Date(baMs)
  return `${ba.getUTCFullYear()}-${pad(ba.getUTCMonth()+1)}-${pad(ba.getUTCDate())}T${pad(ba.getUTCHours())}:${pad(ba.getUTCMinutes())}:00-03:00`
}

export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  if (!process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || !process.env.GOOGLE_CALENDAR_ID) {
    return NextResponse.json({ error: 'Credenciales no configuradas' }, { status: 500 })
  }

  const run = req.nextUrl.searchParams.get('run') === 'true'

  try {
    const all = await getAllBookings()
    const stale = all.filter(e => isStale(e.start!.dateTime!))

    if (!run) {
      return NextResponse.json({
        totalEvents: all.length,
        staleEvents: stale.length,
        message: stale.length > 0
          ? 'Hay eventos con hora incorrecta. Agregá &run=true para corregirlos.'
          : 'Todo OK — no hay eventos con hora incorrecta.',
        all: all.map(e => ({
          summary: e.summary,
          start: e.start!.dateTime,
          hourBA: hourBA(e.start!.dateTime!),
          stale: isStale(e.start!.dateTime!),
        })),
      })
    }

    // run=true → corregir eventos sospechosos
    const calendar = google.calendar({ version: 'v3', auth: getAuth() })
    const results: { summary: string; before: string; after: string }[] = []

    for (const ev of stale) {
      const newStart = addThreeHours(ev.start!.dateTime!)
      const newEnd = ev.end?.dateTime ? addThreeHours(ev.end.dateTime) : undefined
      await calendar.events.patch({
        calendarId: process.env.GOOGLE_CALENDAR_ID!,
        eventId: ev.id!,
        requestBody: {
          start: { dateTime: newStart, timeZone: 'America/Argentina/Buenos_Aires' },
          ...(newEnd ? { end: { dateTime: newEnd, timeZone: 'America/Argentina/Buenos_Aires' } } : {}),
        },
      })
      results.push({ summary: ev.summary ?? '', before: ev.start!.dateTime!, after: newStart })
    }

    return NextResponse.json({ migrated: results.length, results })
  } catch (err) {
    console.error('[migrate-times] error:', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
