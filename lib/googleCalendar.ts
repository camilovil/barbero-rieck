import { google } from 'googleapis'
import type { BookingState } from '@/types/booking'
import { TIME_SLOTS } from './constants'
import type { Location } from '@/types/booking'

// Argentina never observes DST — UTC-3 all year
const BA_OFFSET = '-03:00'

function toUTCDateStr(d: Date): string {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`
}

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
  const dateStr = toUTCDateStr(booking.date)
  const pad = (n: number) => String(n).padStart(2, '0')
  const startStr = `${dateStr}T${pad(hours)}:${pad(minutes)}:00${BA_OFFSET}`
  const totalEndMin = hours * 60 + minutes + booking.service.duration
  const endStr = `${dateStr}T${pad(Math.floor(totalEndMin / 60))}:${pad(totalEndMin % 60)}:00${BA_OFFSET}`

  const locationLabel =
    booking.location === 'domicilio'
      ? `${booking.direccion}`
      : 'Congreso 1865, Belgrano, CABA'

  const waNumber = booking.whatsapp.replace(/\D/g, '')

  const description = [
    `Cliente: ${booking.nombre}`,
    `WhatsApp: https://wa.me/${waNumber}`,
    `Email: ${booking.email}`,
    `Servicio: ${booking.service.name} — $${booking.service.price?.toLocaleString('es-AR')}`,
    `Modalidad: ${booking.location === 'domicilio' ? 'A domicilio' : 'Estudio'}`,
    booking.location === 'domicilio' && booking.direccion ? `Dirección cliente: ${booking.direccion}` : null,
    booking.location === 'domicilio' && booking.direccion ? `Cómo llegar: https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(booking.direccion)}` : null,
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
      start: { dateTime: startStr, timeZone: 'America/Argentina/Buenos_Aires' },
      end: { dateTime: endStr, timeZone: 'America/Argentina/Buenos_Aires' },
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

export async function getPastEvents(days = 30): Promise<BookingEvent[]> {
  if (!process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || !process.env.GOOGLE_CALENDAR_ID) return []

  const calendar = google.calendar({ version: 'v3', auth: getAuth() })
  const now = new Date()
  const past = new Date(now.getTime() - days * 24 * 60 * 60 * 1000)

  const res = await calendar.events.list({
    calendarId: process.env.GOOGLE_CALENDAR_ID,
    timeMin: past.toISOString(),
    timeMax: now.toISOString(),
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
    .reverse() // más reciente primero
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

// ─── App settings (stored as a special GCal event) ───────────────────────────

const CONFIG_SUMMARY = '🔧 BARBERIA_CONFIG'

export interface AppSettings {
  maxDailyBookings: number
}

const DEFAULT_SETTINGS: AppSettings = { maxDailyBookings: 8 }

async function getConfigEventId(calendar: ReturnType<typeof google.calendar>): Promise<string | null> {
  const res = await calendar.events.list({
    calendarId: process.env.GOOGLE_CALENDAR_ID!,
    q: CONFIG_SUMMARY,
    maxResults: 1,
    showDeleted: false,
    timeMin: '2000-01-01T00:00:00Z',
    timeMax: '2100-01-01T00:00:00Z',
  })
  return res.data.items?.[0]?.id ?? null
}

export async function getSettings(): Promise<AppSettings> {
  if (!process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || !process.env.GOOGLE_CALENDAR_ID) return DEFAULT_SETTINGS
  try {
    const calendar = google.calendar({ version: 'v3', auth: getAuth() })
    const id = await getConfigEventId(calendar)
    if (!id) return DEFAULT_SETTINGS
    const ev = await calendar.events.get({ calendarId: process.env.GOOGLE_CALENDAR_ID!, eventId: id })
    return { ...DEFAULT_SETTINGS, ...JSON.parse(ev.data.description ?? '{}') }
  } catch {
    return DEFAULT_SETTINGS
  }
}

export async function saveSettings(settings: AppSettings): Promise<void> {
  const calendar = google.calendar({ version: 'v3', auth: getAuth() })
  const description = JSON.stringify(settings)
  const existingId = await getConfigEventId(calendar)
  if (existingId) {
    await calendar.events.patch({
      calendarId: process.env.GOOGLE_CALENDAR_ID!,
      eventId: existingId,
      requestBody: { description },
    })
  } else {
    await calendar.events.insert({
      calendarId: process.env.GOOGLE_CALENDAR_ID!,
      requestBody: {
        summary: CONFIG_SUMMARY,
        description,
        start: { date: '2099-01-01' },
        end: { date: '2099-01-02' },
        visibility: 'private',
      },
    })
  }
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
  const ds = toUTCDateStr(date)
  const dayStart = new Date(`${ds}T00:00:00${BA_OFFSET}`)
  const dayEnd = new Date(`${ds}T23:59:59${BA_OFFSET}`)
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
  const ds = toUTCDateStr(date)
  const dayStart = new Date(`${ds}T00:00:00${BA_OFFSET}`)
  const dayEnd = new Date(`${ds}T23:59:59${BA_OFFSET}`)
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
// Incluye lógica de buffer de viaje: si hay un turno en estudio y el siguiente
// slot es a domicilio (o viceversa), se agrega TRAVEL_BUFFER_MINUTES de margen.
export async function getBookedSlots(date: Date, location: Location): Promise<string[]> {
  if (!process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || !process.env.GOOGLE_CALENDAR_ID) {
    return []
  }

  // Obtenemos los eventos reales del día (con modalidad) en lugar de solo freebusy
  const events = await getEventsForDate(date)
  if (events.length === 0) return []

  const slots = TIME_SLOTS[location]
  const slotDurationMs = (location === 'local' ? 60 : 120) * 60 * 1000

  const ds = toUTCDateStr(date)
  return slots.filter((time) => {
    const [h, m] = time.split(':').map(Number)
    const pad = (n: number) => String(n).padStart(2, '0')
    const slotStart = new Date(`${ds}T${pad(h)}:${pad(m)}:00${BA_OFFSET}`)
    const slotEnd = new Date(slotStart.getTime() + slotDurationMs)

    return events.some((ev) => {
      const evStart = new Date(ev.start)
      const evEnd = new Date(ev.end || ev.start)
      return slotStart < evEnd && slotEnd > evStart
    })
  })
}
