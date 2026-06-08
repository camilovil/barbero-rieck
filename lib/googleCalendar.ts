import { google } from 'googleapis'
import type { BookingState } from '@/types/booking'
import { TIME_SLOTS } from './constants'
import type { Location } from '@/types/booking'

function getAuth() {
  return new google.auth.GoogleAuth({
    credentials: {
      client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      // Vercel stores the key as a single line with literal \n — restore real newlines
      private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    },
    scopes: ['https://www.googleapis.com/auth/calendar'],
  })
}

export async function createCalendarEvent(booking: BookingState): Promise<string> {
  if (!process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || !process.env.GOOGLE_CALENDAR_ID) {
    console.log('[googleCalendar] stub — GOOGLE_SERVICE_ACCOUNT_EMAIL o GOOGLE_CALENDAR_ID no configurado')
    return 'stub-event-id'
  }

  if (!booking.date || !booking.time || !booking.service) {
    throw new Error('Booking missing required fields')
  }

  const calendar = google.calendar({ version: 'v3', auth: getAuth() })

  const [hours, minutes] = booking.time.split(':').map(Number)
  const start = new Date(booking.date)
  start.setHours(hours, minutes, 0, 0)

  const end = new Date(start)
  end.setMinutes(end.getMinutes() + booking.service.duration)

  const locationLabel =
    booking.location === 'domicilio'
      ? `A domicilio — ${booking.direccion}`
      : 'Barbería Rieck — Av. Corrientes 1234, CABA'

  const description = [
    `Cliente: ${booking.nombre}`,
    `Email: ${booking.email}`,
    `WhatsApp: ${booking.whatsapp}`,
    `Servicio: ${booking.service.name} ($${booking.service.price})`,
    `Modalidad: ${booking.location === 'domicilio' ? 'A domicilio' : 'En local'}`,
    booking.nota ? `Nota: ${booking.nota}` : null,
  ]
    .filter(Boolean)
    .join('\n')

  const event = await calendar.events.insert({
    calendarId: process.env.GOOGLE_CALENDAR_ID,
    requestBody: {
      summary: `✂️ ${booking.service.name} — ${booking.nombre}`,
      description,
      location: locationLabel,
      start: { dateTime: start.toISOString(), timeZone: 'America/Argentina/Buenos_Aires' },
      end: { dateTime: end.toISOString(), timeZone: 'America/Argentina/Buenos_Aires' },
    },
  })

  return event.data.id ?? 'unknown'
}

export async function getCalendarEvent(eventId: string) {
  if (!process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || !process.env.GOOGLE_CALENDAR_ID) return null
  const calendar = google.calendar({ version: 'v3', auth: getAuth() })
  try {
    const res = await calendar.events.get({
      calendarId: process.env.GOOGLE_CALENDAR_ID,
      eventId,
    })
    return res.data
  } catch {
    return null
  }
}

export async function deleteCalendarEvent(eventId: string): Promise<void> {
  if (!process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || !process.env.GOOGLE_CALENDAR_ID) return
  const calendar = google.calendar({ version: 'v3', auth: getAuth() })
  await calendar.events.delete({
    calendarId: process.env.GOOGLE_CALENDAR_ID,
    eventId,
  })
}

export interface BookingEvent {
  id: string
  nombre: string
  email: string
  whatsapp: string
  servicio: string
  modalidad: string
  nota: string
  start: string // ISO string
  end: string
}

function parseDesc(desc: string): Record<string, string> {
  const result: Record<string, string> = {}
  for (const line of (desc ?? '').split('\n')) {
    const idx = line.indexOf(': ')
    if (idx !== -1) result[line.slice(0, idx).toLowerCase()] = line.slice(idx + 2).trim()
  }
  return result
}

export async function getUpcomingEvents(days = 30): Promise<BookingEvent[]> {
  if (!process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || !process.env.GOOGLE_CALENDAR_ID) return []

  const calendar = google.calendar({ version: 'v3', auth: getAuth() })
  const now = new Date()
  const future = new Date(now.getTime() + days * 24 * 60 * 60 * 1000)

  const res = await calendar.events.list({
    calendarId: process.env.GOOGLE_CALENDAR_ID,
    timeMin: now.toISOString(),
    timeMax: future.toISOString(),
    singleEvents: true,
    orderBy: 'startTime',
  })

  return (res.data.items ?? [])
    .filter(e => e.id && e.start?.dateTime)
    .map(e => {
      const d = parseDesc(e.description ?? '')
      return {
        id: e.id!,
        nombre: d['cliente'] ?? '—',
        email: d['email'] ?? '',
        whatsapp: d['whatsapp'] ?? '',
        servicio: d['servicio'] ?? e.summary ?? '—',
        modalidad: d['modalidad'] ?? '—',
        nota: d['nota'] ?? '',
        start: e.start!.dateTime!,
        end: e.end?.dateTime ?? '',
      }
    })
}

// ─── Blocked dates ────────────────────────────────────────────────────────────

export async function blockDate(date: Date): Promise<string> {
  const calendar = google.calendar({ version: 'v3', auth: getAuth() })
  const dateStr = `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`
  const nextDay = new Date(date)
  nextDay.setDate(nextDay.getDate() + 1)
  const nextStr = `${nextDay.getFullYear()}-${String(nextDay.getMonth()+1).padStart(2,'0')}-${String(nextDay.getDate()).padStart(2,'0')}`
  const res = await calendar.events.insert({
    calendarId: process.env.GOOGLE_CALENDAR_ID!,
    requestBody: {
      summary: 'BLOQUEADO',
      start: { date: dateStr },
      end: { date: nextStr },
    },
  })
  return res.data.id!
}

export async function unblockDate(eventId: string): Promise<void> {
  const calendar = google.calendar({ version: 'v3', auth: getAuth() })
  await calendar.events.delete({
    calendarId: process.env.GOOGLE_CALENDAR_ID!,
    eventId,
  })
}

export async function getBlockedDates(days = 60): Promise<{ id: string; date: string }[]> {
  if (!process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || !process.env.GOOGLE_CALENDAR_ID) return []
  const calendar = google.calendar({ version: 'v3', auth: getAuth() })
  const now = new Date()
  const future = new Date(now.getTime() + days * 24 * 60 * 60 * 1000)
  const res = await calendar.events.list({
    calendarId: process.env.GOOGLE_CALENDAR_ID!,
    timeMin: now.toISOString(),
    timeMax: future.toISOString(),
    singleEvents: true,
    orderBy: 'startTime',
  })
  return (res.data.items ?? [])
    .filter(e => e.summary === 'BLOQUEADO' && e.start?.date)
    .map(e => ({ id: e.id!, date: e.start!.date! }))
}

export async function isDateBlocked(date: Date): Promise<boolean> {
  if (!process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || !process.env.GOOGLE_CALENDAR_ID) return false
  const blocked = await getBlockedDates(90)
  const dateStr = `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`
  return blocked.some(b => b.date === dateStr)
}

export async function getDayBookingCount(date: Date): Promise<number> {
  if (!process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || !process.env.GOOGLE_CALENDAR_ID) return 0
  const calendar = google.calendar({ version: 'v3', auth: getAuth() })
  const dayStart = new Date(date); dayStart.setHours(0, 0, 0, 0)
  const dayEnd = new Date(date); dayEnd.setHours(23, 59, 59, 999)
  const res = await calendar.events.list({
    calendarId: process.env.GOOGLE_CALENDAR_ID!,
    timeMin: dayStart.toISOString(),
    timeMax: dayEnd.toISOString(),
    singleEvents: true,
  })
  return (res.data.items ?? []).filter(e => e.summary?.includes('✂️')).length
}

export async function getEventsForDate(date: Date): Promise<BookingEvent[]> {
  if (!process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || !process.env.GOOGLE_CALENDAR_ID) return []
  const calendar = google.calendar({ version: 'v3', auth: getAuth() })
  const dayStart = new Date(date); dayStart.setHours(0, 0, 0, 0)
  const dayEnd = new Date(date); dayEnd.setHours(23, 59, 59, 999)
  const res = await calendar.events.list({
    calendarId: process.env.GOOGLE_CALENDAR_ID!,
    timeMin: dayStart.toISOString(),
    timeMax: dayEnd.toISOString(),
    singleEvents: true,
    orderBy: 'startTime',
  })
  return (res.data.items ?? [])
    .filter(e => e.id && e.start?.dateTime && e.summary?.includes('✂️'))
    .map(e => {
      const d = parseDesc(e.description ?? '')
      return {
        id: e.id!,
        nombre: d['cliente'] ?? '—',
        email: d['email'] ?? '',
        whatsapp: d['whatsapp'] ?? '',
        servicio: d['servicio'] ?? e.summary ?? '—',
        modalidad: d['modalidad'] ?? '—',
        nota: d['nota'] ?? '',
        start: e.start!.dateTime!,
        end: e.end?.dateTime ?? '',
      }
    })
}

// ─── Returns the list of TIME_SLOTS that are already booked for a given date ──
export async function getBookedSlots(date: Date, location: Location): Promise<string[]> {
  if (!process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || !process.env.GOOGLE_CALENDAR_ID) {
    return [] // no Calendar configurado — BLOCKED_SLOTS de constants.ts como fallback
  }

  const calendar = google.calendar({ version: 'v3', auth: getAuth() })

  const dayStart = new Date(date)
  dayStart.setHours(0, 0, 0, 0)
  const dayEnd = new Date(date)
  dayEnd.setHours(23, 59, 59, 999)

  const freebusyRes = await calendar.freebusy.query({
    requestBody: {
      timeMin: dayStart.toISOString(),
      timeMax: dayEnd.toISOString(),
      timeZone: 'America/Argentina/Buenos_Aires',
      items: [{ id: process.env.GOOGLE_CALENDAR_ID }],
    },
  })

  const busyPeriods =
    freebusyRes.data.calendars?.[process.env.GOOGLE_CALENDAR_ID!]?.busy ?? []

  const slots = TIME_SLOTS[location]

  return slots.filter((time) => {
    const [h, m] = time.split(':').map(Number)
    const slotStart = new Date(date)
    slotStart.setHours(h, m, 0, 0)
    const slotEnd = new Date(slotStart)
    slotEnd.setMinutes(slotEnd.getMinutes() + 30) // buffer: block slot if any event overlaps 30 min window

    return busyPeriods.some(({ start, end }) => {
      const busyStart = new Date(start!)
      const busyEnd = new Date(end!)
      return busyStart < slotEnd && busyEnd > slotStart
    })
  })
}
