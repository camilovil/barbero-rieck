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
  if (!process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL) {
    console.log('[googleCalendar] stub — GOOGLE_SERVICE_ACCOUNT_EMAIL not set')
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

// Returns the list of TIME_SLOTS that are already booked for a given date
export async function getBookedSlots(date: Date, location: Location): Promise<string[]> {
  if (!process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL) {
    return [] // no Calendar configured — let constants.ts BLOCKED_SLOTS handle it
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
