import { google } from 'googleapis'
import type { calendar_v3 } from 'googleapis'
import type { BookingState } from '@/types/booking'
import { TIME_SLOTS, LOCATION_LABELS, DEPOSIT_HOLD_MINUTES, depositAmount, viaticoDeBarrio, zonaDeBarrio } from './constants'
import { hhmm, nombreServicio, precioServicio } from './format'
import { sendExpiredHoldEmail } from './email'
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

/* Un turno sin la seña pagada existe igual en el calendario: tiene que ocupar
   el horario para que nadie más lo tome mientras el cliente está pagando. Lo
   que cambia es que entra como «tentativo» y con reloj en el título, para que
   Santiago no lo lea como un turno cerrado. El estado del pago va en
   extendedProperties —metadatos que sólo lee el código— y no en la
   descripción, que es texto que además leen los mails y el panel. */
const PENDING_PREFIX = '⏳'

export async function createCalendarEvent(
  booking: BookingState,
  opts: { pending?: boolean } = {},
): Promise<string> {
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
  const sena = booking.service.price ? depositAmount(booking.service.price) : 0
  const viatico = booking.location === 'domicilio' ? viaticoDeBarrio(booking.barrio) : 0
  const viaticoAConvenir = booking.location === 'domicilio' && (zonaDeBarrio(booking.barrio)?.aConvenir ?? false)

  const description = [
    `Cliente: ${booking.nombre}`,
    `WhatsApp: https://wa.me/${waNumber}`,
    `Email: ${booking.email}`,
    /* Esta línea es la que después leen los mails y el panel para
       saber cuánto se cobra. Sin precio se omite el tramo en vez de
       escribir "$0", que se lee como un turno gratis. */
    booking.service.price
      ? `Servicio: ${booking.service.name} — $${booking.service.price.toLocaleString('es-AR')}`
      : `Servicio: ${booking.service.name}`,
    `Modalidad: ${LOCATION_LABELS[booking.location ?? 'local']}`,
    /* El viático queda escrito con su barrio porque es plata que Santiago
       cobra en el turno, y la tabla de zonas puede cambiar después: lo
       cotizado al reservar es lo que vale. */
    booking.location === 'domicilio' && booking.barrio ? `Barrio: ${booking.barrio}` : null,
    viatico ? `Viático: $${viatico.toLocaleString('es-AR')}` : null,
    /* Fuera de cobertura Santiago tiene que acordar el traslado por WhatsApp:
       si no queda escrito acá, se entera cuando llega. */
    viaticoAConvenir ? 'Viático: A CONVENIR — el barrio quedó fuera de la grilla' : null,
    opts.pending && sena ? `Seña: pendiente de pago — $${sena.toLocaleString('es-AR')}` : null,
    booking.location === 'domicilio' && booking.direccion ? `Dirección cliente: ${booking.direccion}` : null,
    booking.location === 'domicilio' && booking.direccion ? `Cómo llegar: https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(booking.direccion)}` : null,
    booking.nota ? `Nota: ${booking.nota}` : null,
  ]
    .filter(Boolean)
    .join('\n')

  /* El ✂️ queda en el título aunque el turno esté sin pagar: es la marca por
     la que el resto del archivo distingue un turno de un bloqueo, y hasta que
     venza el plazo este horario está tan tomado como cualquier otro. */
  const event = await calendar.events.insert({
    calendarId: process.env.GOOGLE_CALENDAR_ID,
    requestBody: {
      summary: opts.pending
        ? `${PENDING_PREFIX} ✂️ ${booking.service.name} — ${booking.nombre}`
        : `✂️ ${booking.service.name} — ${booking.nombre}`,
      description,
      location: locationLabel,
      start: { dateTime: startStr, timeZone: 'America/Argentina/Buenos_Aires' },
      end: { dateTime: endStr, timeZone: 'America/Argentina/Buenos_Aires' },
      ...(opts.pending && {
        status: 'tentative',
        extendedProperties: {
          private: {
            pago: 'pendiente',
            sena: String(sena),
            reservadoEn: new Date().toISOString(),
          },
        },
      }),
    },
  })

  return event.data.id ?? 'unknown'
}

/* Que Google diga «este evento no existe» y que Google no conteste no son lo
   mismo, y tratarlos igual sale caro: el 404 es una respuesta —el turno se
   venció y lo borramos, o lo cancelaron— y cualquier otro golpe es un no sé.
   El 410 es el mismo no está con otro número. */
function eventoInexistente(err: unknown): boolean {
  const e = err as { status?: number; code?: number | string; response?: { status?: number } }
  const status = e?.status ?? e?.response?.status ?? Number(e?.code)
  return status === 404 || status === 410
}

/* Devuelve null sólo cuando el evento realmente no está. Un hipo de red o un
   500 de Google suben como error: el que llama tiene que poder contestar «no
   sé» en vez de dar por muerto un turno que está vivo. */
export async function getCalendarEvent(eventId: string) {
  if (!process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || !process.env.GOOGLE_CALENDAR_ID) return null
  const calendar = google.calendar({ version: 'v3', auth: getAuth() })
  try {
    const res = await calendar.events.get({
      calendarId: process.env.GOOGLE_CALENDAR_ID,
      eventId,
    })
    return res.data
  } catch (err) {
    if (eventoInexistente(err)) return null
    throw err
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

/* Reconstruye el turno a partir del evento, que es donde vive: sin base de
   datos, para mandar los mails después del pago hay que volver a armar lo que
   el cliente cargó en el formulario. El precio sale de la descripción y no del
   catálogo porque el catálogo cambia y el turno ya cotizado, no. */
function bookingFromEvent(desc: Record<string, string>, start: string, end: string): BookingState {
  const location: Location = desc['modalidad'] === LOCATION_LABELS.domicilio ? 'domicilio' : 'local'
  const servicio = desc['servicio'] ?? ''
  const inicio = new Date(start)

  return {
    step: 0,
    location,
    service: {
      name: nombreServicio(servicio),
      price: precioServicio(servicio),
      duration: Math.round((new Date(end).getTime() - inicio.getTime()) / 60000),
    },
    date: inicio,
    time: hhmm(inicio),
    nombre: desc['cliente'] ?? '',
    email: desc['email'] ?? '',
    whatsapp: desc['whatsapp'] ?? '',
    direccion: desc['dirección cliente'] ?? '',
    barrio: desc['barrio'] ?? null,
    nota: desc['nota'] ?? '',
  }
}

/* La llama el webhook de Mercado Pago cuando la seña entró: saca al turno del
   limbo y lo deja como cualquier otro. Devuelve el turno confirmado, o null si
   no había nada que confirmar —ya estaba pago, o se venció y no existe más—,
   porque Mercado Pago manda la misma notificación varias veces y los mails
   tienen que salir una sola. */
export async function confirmCalendarEvent(
  eventId: string,
  paymentId: string,
): Promise<BookingState | null> {
  if (!process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || !process.env.GOOGLE_CALENDAR_ID) return null
  const calendar = google.calendar({ version: 'v3', auth: getAuth() })

  const existing = await getCalendarEvent(eventId)
  const props = existing?.extendedProperties?.private
  if (!existing || props?.pago !== 'pendiente') return null

  const sena = Number(props.sena)
  const cobrado = sena ? ` — $${sena.toLocaleString('es-AR')}` : ''
  const description = (existing.description ?? '')
    .split('\n')
    .map(line =>
      line.startsWith('Seña:') ? `Seña: pagada${cobrado} (Mercado Pago ${paymentId})` : line,
    )
    .join('\n')

  await calendar.events.patch({
    calendarId: process.env.GOOGLE_CALENDAR_ID,
    eventId,
    requestBody: {
      summary: (existing.summary ?? '').replace(`${PENDING_PREFIX} `, ''),
      description,
      status: 'confirmed',
      extendedProperties: { private: { ...props, pago: 'pagado', pagoId: paymentId } },
    },
  })

  return bookingFromEvent(
    parseDesc(description),
    existing.start?.dateTime ?? '',
    existing.end?.dateTime ?? '',
  )
}

/* El estado de la seña de un turno, para la pantalla de vuelta del pago.
   Si Google no contesta, esto tira y la pantalla sigue preguntando: al que
   acaba de pagar no se le puede decir «tu reserva venció» por un hipo de red,
   porque de ese cartel no vuelve. */
export async function getPaymentState(eventId: string): Promise<'pendiente' | 'pagado' | 'vencido'> {
  const event = await getCalendarEvent(eventId)
  // Si el evento ya no está, el plazo se venció y el horario volvió a la calle.
  if (!event) return 'vencido'
  return event.extendedProperties?.private?.pago === 'pagado' ? 'pagado' : 'pendiente'
}

/* Borra los turnos que reservaron y nunca pagaron, y devuelve cuántos
   horarios liberó. La corre el cron, pero también la reserva y la consulta de
   disponibilidad: así el horario vuelve a aparecer libre en cuanto alguien lo
   mira, sin esperar a que pase el cron. */
export async function expirePendingEvents(): Promise<number> {
  if (!process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || !process.env.GOOGLE_CALENDAR_ID) return 0
  const calendar = google.calendar({ version: 'v3', auth: getAuth() })

  /* Google contesta de a 250 y avisa que hay más con un nextPageToken. Sin
     pedir esas páginas, los pendientes del fondo de la lista no se liberaban
     nunca: quedaban ocupando un horario que nadie pagó. */
  const pendientes: calendar_v3.Schema$Event[] = []
  let pageToken: string | undefined
  do {
    const res = await calendar.events.list({
      calendarId: process.env.GOOGLE_CALENDAR_ID,
      privateExtendedProperty: ['pago=pendiente'],
      singleEvents: true,
      showDeleted: false,
      pageToken,
    })
    pendientes.push(...(res.data.items ?? []))
    pageToken = res.data.nextPageToken ?? undefined
  } while (pageToken)

  const limit = Date.now() - DEPOSIT_HOLD_MINUTES * 60 * 1000
  const vencidos = pendientes.filter(e => {
    if (!e.id) return false
    // Sin marca de tiempo no hay forma de saber si está en plazo: es un
    // huérfano de alguna reserva a medio escribir y no tiene por qué ocupar.
    const desde = Date.parse(e.extendedProperties?.private?.reservadoEn ?? '')
    return isNaN(desde) || desde < limit
  })

  await Promise.all(
    vencidos.map(async e => {
      /* Los datos del cliente se leen antes de borrar —el evento es el único
         lugar donde viven— pero el mail sale después: liberar el horario es
         lo urgente y el correo puede tardar segundos. */
      const desc = parseDesc(e.description ?? '')
      const inicio = e.start?.dateTime

      await calendar.events
        .delete({ calendarId: process.env.GOOGLE_CALENDAR_ID!, eventId: e.id! })
        .catch(err => console.error('[googleCalendar] no se pudo liberar', e.id, err))

      if (desc['email'] && inicio) {
        try {
          await sendExpiredHoldEmail({
            nombre: desc['cliente'] ?? '',
            email: desc['email'],
            start: new Date(inicio),
            servicio: desc['servicio'] ?? '',
            eventId: e.id!,
            location: desc['modalidad'] === LOCATION_LABELS.domicilio ? 'domicilio' : 'local',
            direccion: desc['dirección cliente'] ?? '',
          })
        } catch (err) {
          console.error('[googleCalendar] no se pudo avisar el vencimiento', e.id, err)
        }
      }
    }),
  )

  return vencidos.length
}

export interface BookingEvent {
  id: string
  nombre: string
  email: string
  whatsapp: string
  servicio: string
  modalidad: string
  /** Sólo en los turnos a domicilio. Es a dónde tiene que ir Santiago. */
  direccion: string
  nota: string
  start: string // ISO string
  end: string
  /* Lo que se cobra por el traslado, ya cotizado al reservar. Cero cuando no
     corresponde y también cuando quedó a convenir: en ese caso el monto no
     existe todavía y ponerle un número sería inventarlo. */
  viatico: number
  /* Sólo en los turnos que pasaron por la seña. Sin seña no existe, y por eso
     el panel tiene que distinguir «no hay dato» de «no pagó»: un turno viejo
     no es un turno impago. */
  pago?: 'pendiente' | 'pagado'
}

/** Los campos que salen igual de la descripción en las tres consultas. */
function toBookingEvent(
  id: string,
  desc: Record<string, string>,
  fallbackServicio: string,
  start: string,
  end: string,
  pago?: string,
): BookingEvent {
  return {
    id,
    nombre: desc['cliente'] ?? '—',
    email: desc['email'] ?? '',
    whatsapp: desc['whatsapp'] ?? '',
    servicio: desc['servicio'] ?? fallbackServicio,
    modalidad: desc['modalidad'] ?? '—',
    direccion: desc['dirección cliente'] ?? '',
    nota: desc['nota'] ?? '',
    start,
    end,
    // "Viático: $10.000" — el mismo parser del precio del servicio.
    viatico: precioServicio(desc['viático'] ?? ''),
    pago: pago === 'pendiente' || pago === 'pagado' ? pago : undefined,
  }
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
    .map(e => toBookingEvent(e.id!, parseDesc(e.description ?? ''), e.summary ?? '—', e.start!.dateTime!, e.end?.dateTime ?? '', e.extendedProperties?.private?.pago))
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
    .map(e => toBookingEvent(e.id!, parseDesc(e.description ?? ''), e.summary ?? '—', e.start!.dateTime!, e.end?.dateTime ?? '', e.extendedProperties?.private?.pago))
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

/* Bloquear un rato suelto, no el día entero: Santiago tiene que hacer un
   trámite de tres a cinco y el resto del día sigue vendiéndose. Es el mismo
   'BLOQUEADO' de siempre, pero con hora; lo que separa a los dos es que el
   día completo va como evento de jornada (`start.date`) y la franja va con
   horario (`start.dateTime`), así cada lector se queda con el suyo. */
export async function blockRange(date: Date, from: string, to: string): Promise<string> {
  const calendar = google.calendar({ version: 'v3', auth: getAuth() })
  const ds = `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`
  const res = await calendar.events.insert({
    calendarId: process.env.GOOGLE_CALENDAR_ID!,
    requestBody: {
      summary: 'BLOQUEADO',
      start: { dateTime: `${ds}T${from}:00${BA_OFFSET}`, timeZone: 'America/Argentina/Buenos_Aires' },
      end: { dateTime: `${ds}T${to}:00${BA_OFFSET}`, timeZone: 'America/Argentina/Buenos_Aires' },
    },
  })
  return res.data.id!
}

export interface BlockedRange {
  id: string
  /** ISO con hora, para poder ordenarlas y mostrarlas en la zona de acá. */
  start: string
  end: string
}

export async function getBlockedRanges(days = 60): Promise<BlockedRange[]> {
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
    .filter(e => e.id && e.summary === 'BLOQUEADO' && e.start?.dateTime)
    .map(e => ({ id: e.id!, start: e.start!.dateTime!, end: e.end?.dateTime ?? e.start!.dateTime! }))
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
  /* Para saber si un día está cerrado alcanza con mirar ese día. Antes se
     traían noventa días enteros de agenda y se buscaba uno adentro. */
  return (await eventosDelDia(date)).some(e => e.summary === 'BLOQUEADO' && e.start?.date)
}

/* Una sola consulta por día, que es de donde sale todo lo que la grilla
   necesita: los turnos tomados, las franjas bloqueadas y si el día entero
   está cerrado. Antes cada una de esas tres preguntas era su propio viaje a
   Google, y las tres salían en cada toque a una fecha del calendario. */
async function eventosDelDia(date: Date) {
  const calendar = google.calendar({ version: 'v3', auth: getAuth() })
  const ds = toUTCDateStr(date)
  const res = await calendar.events.list({
    calendarId: process.env.GOOGLE_CALENDAR_ID!,
    timeMin: new Date(`${ds}T00:00:00${BA_OFFSET}`).toISOString(),
    timeMax: new Date(`${ds}T23:59:59${BA_OFFSET}`).toISOString(),
    singleEvents: true,
    orderBy: 'startTime',
  })
  return res.data.items ?? []
}

export interface DisponibilidadDia {
  dayBlocked: boolean
  /** Los TIME_SLOTS que ya no se pueden tomar. */
  blocked: string[]
}

/** Todo lo que la pantalla de horarios necesita, en un solo viaje. */
export async function getDayAvailability(date: Date, location: Location): Promise<DisponibilidadDia> {
  if (!process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || !process.env.GOOGLE_CALENDAR_ID) {
    return { dayBlocked: false, blocked: [] }
  }

  const items = await eventosDelDia(date)

  if (items.some(e => e.summary === 'BLOQUEADO' && e.start?.date)) {
    return { dayBlocked: true, blocked: TIME_SLOTS[location] }
  }

  /* Un turno y una franja bloqueada tapan un horario por el mismo motivo:
     Santiago no está libre. Para la grilla son lo mismo. */
  const ocupado = items
    .filter(e => e.start?.dateTime && (e.summary?.includes('✂️') || e.summary === 'BLOQUEADO'))
    .map(e => ({ start: e.start!.dateTime!, end: e.end?.dateTime ?? e.start!.dateTime! }))

  return { dayBlocked: false, blocked: slotsPisados(date, location, ocupado) }
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
    .map(e => toBookingEvent(e.id!, parseDesc(e.description ?? ''), e.summary ?? '—', e.start!.dateTime!, e.end?.dateTime ?? '', e.extendedProperties?.private?.pago))
}

/* Qué horarios de la grilla pisa lo que ya está ocupado. Puro cálculo: no
   habla con Google, así que se puede reusar sobre cualquier lista. */
function slotsPisados(
  date: Date,
  location: Location,
  ocupado: { start: string; end: string }[],
): string[] {
  if (ocupado.length === 0) return []

  const slotDurationMs = (location === 'local' ? 60 : 120) * 60 * 1000
  const ds = toUTCDateStr(date)

  return TIME_SLOTS[location].filter((time) => {
    const [h, m] = time.split(':').map(Number)
    const pad = (n: number) => String(n).padStart(2, '0')
    const slotStart = new Date(`${ds}T${pad(h)}:${pad(m)}:00${BA_OFFSET}`)
    const slotEnd = new Date(slotStart.getTime() + slotDurationMs)

    return ocupado.some((ev) => {
      const evStart = new Date(ev.start)
      const evEnd = new Date(ev.end)
      return slotStart < evEnd && slotEnd > evStart
    })
  })
}
