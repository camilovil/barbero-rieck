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

// GET  → dry run: lista los eventos que se corregirían
// POST → ejecuta la migración
// Acepta ?secret=ADMIN_SECRET como alternativa a la cookie (para uso remoto)
function isAuthorized(req: NextRequest): boolean {
  const secret = process.env.ADMIN_SECRET
  if (!secret) return false
  const cookie = req.cookies.get('admin_token')?.value
  const param = req.nextUrl.searchParams.get('secret')
  return cookie === secret || param === secret
}

async function getStaleEvents() {
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

  // Eventos con horario UTC (Z al final) = creados con la lógica vieja
  return (res.data.items ?? []).filter(
    e => e.id && e.start?.dateTime && e.summary?.includes('✂️') && e.start.dateTime.endsWith('Z')
  )
}

// Convierte "2026-06-15T11:00:00.000Z" → "2026-06-15T11:00:00-03:00"
// (mantiene el clock time que eligió el usuario, ahora con offset BA correcto)
function fixDateTime(utcStr: string): string {
  return utcStr.slice(0, 19) + '-03:00'
}

export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  if (!process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || !process.env.GOOGLE_CALENDAR_ID) {
    return NextResponse.json({ error: 'Credenciales no configuradas' }, { status: 500 })
  }

  const run = req.nextUrl.searchParams.get('run') === 'true'

  try {
    const stale = await getStaleEvents()

    if (!run) {
      return NextResponse.json({
        total: stale.length,
        message: 'Dry run. Agregá &run=true a la URL para ejecutar.',
        events: stale.map(e => ({
          id: e.id,
          summary: e.summary,
          startActual: e.start!.dateTime,
          startFixed: fixDateTime(e.start!.dateTime!),
        })),
      })
    }

    // run=true → ejecutar migración
    const calendar = google.calendar({ version: 'v3', auth: getAuth() })
    const results: { summary: string; before: string; after: string }[] = []

    for (const ev of stale) {
      const newStart = fixDateTime(ev.start!.dateTime!)
      const newEnd = ev.end?.dateTime ? fixDateTime(ev.end.dateTime) : undefined
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

export async function POST(req: NextRequest) {
  if (!isAuthorized(req)) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  if (!process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || !process.env.GOOGLE_CALENDAR_ID) {
    return NextResponse.json({ error: 'Credenciales no configuradas' }, { status: 500 })
  }

  try {
    const calendar = google.calendar({ version: 'v3', auth: getAuth() })
    const stale = await getStaleEvents()

    const results: { id: string; summary: string; before: string; after: string }[] = []

    for (const ev of stale) {
      const newStart = fixDateTime(ev.start!.dateTime!)
      const newEnd = ev.end?.dateTime ? fixDateTime(ev.end.dateTime) : undefined

      await calendar.events.patch({
        calendarId: process.env.GOOGLE_CALENDAR_ID!,
        eventId: ev.id!,
        requestBody: {
          start: { dateTime: newStart, timeZone: 'America/Argentina/Buenos_Aires' },
          ...(newEnd ? { end: { dateTime: newEnd, timeZone: 'America/Argentina/Buenos_Aires' } } : {}),
        },
      })

      results.push({
        id: ev.id!,
        summary: ev.summary ?? '',
        before: ev.start!.dateTime!,
        after: newStart,
      })
    }

    return NextResponse.json({ migrated: results.length, results })
  } catch (err) {
    console.error('[migrate-times] POST error:', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
