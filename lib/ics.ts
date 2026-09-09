/* El .ics: la copia del turno que se queda en el calendario del cliente.
 *
 * Se rompía en dos puntos y los dos se veían en la misma captura: el mail
 * decía «Jue 1 oct · 18:30» y la tarjeta de Gmail, abajo, «15:30 – 16:10».
 *
 *  1. La hora se escribía en UTC (`toISOString`) pero con los números de
 *     Buenos Aires: 18:30 salía como 18:30Z, que leído en Argentina son las
 *     15:30. Tres horas menos, siempre. Acá el horario va con TZID y el
 *     VTIMEZONE al lado, así el que lo lee no tiene que adivinar.
 *
 *  2. Sin ORGANIZER ni ATTENDEE, un .ics es un archivo suelto: Google lo
 *     dibuja pero no tiene a quién agregárselo, así que el turno nunca
 *     entraba en el calendario. Con METHOD:REQUEST y el mail del cliente
 *     como asistente, es una invitación de verdad —y por eso los botones
 *     de responder hacen algo—.
 *
 * El UID es lo que hace que reprogramar MUEVA el turno en vez de dejar dos.
 * Viaja en el evento de Google (`extendedProperties.private.icsUid`) para
 * sobrevivir a que reprogramar borre y vuelva a crear; cuando no está —los
 * turnos tomados antes de esto— se deriva del horario y del mail, que es
 * como se armó la primera vez. */

import { TZ } from './format.ts'

/** Argentina no tiene horario de verano: −03:00 todo el año. */
const BA_OFFSET = '-03:00'

const CRLF = '\r\n'

/* El bloque de zona horaria. Una sola regla, sin cambios de estación,
   porque el país no los tiene desde 2009. Va igual: un cliente de
   calendario que no conozca el TZID cae acá y no en el mediodía de Londres. */
const VTIMEZONE = [
  'BEGIN:VTIMEZONE',
  `TZID:${TZ}`,
  'BEGIN:STANDARD',
  'DTSTART:19700101T000000',
  'TZOFFSETFROM:-0300',
  'TZOFFSETTO:-0300',
  'TZNAME:-03',
  'END:STANDARD',
  'END:VTIMEZONE',
]

/** El instante real de un turno, a partir del día y del "HH:MM" porteño. */
export function instanteDeTurno(date: Date, time: string): Date {
  return new Date(`${diaDeTurno(date)}T${time}:00${BA_OFFSET}`)
}

/* El día del turno, "AAAA-MM-DD".
 *
 * `date` llega de dos lugares y no significan lo mismo: del formulario viene
 * como medianoche UTC —así parsea `new Date('2026-10-01')`— y del evento ya
 * tomado viene como el instante de inicio, que en un turno de tarde cae al día
 * siguiente en UTC. Leer los dos igual corría el turno un día.
 *
 * Medianoche UTC exacta es la fecha suelta: ningún turno empieza a las 21:00
 * en punto de Buenos Aires, que es lo que sería si fuera un instante. */
function diaDeTurno(date: Date): string {
  const esFechaSuelta =
    date.getUTCHours() === 0 && date.getUTCMinutes() === 0 &&
    date.getUTCSeconds() === 0 && date.getUTCMilliseconds() === 0
  if (esFechaSuelta) {
    return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}`
  }
  const sello = selloLocal(date)
  return `${sello.slice(0, 4)}-${sello.slice(4, 6)}-${sello.slice(6, 8)}`
}

function pad(n: number): string {
  return String(n).padStart(2, '0')
}

/** "20261001T183000" — el reloj de pared de Buenos Aires, que es el que
 *  acompaña al TZID. */
export function selloLocal(d: Date): string {
  const p = Object.fromEntries(
    new Intl.DateTimeFormat('en-CA', {
      timeZone: TZ,
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit',
      hourCycle: 'h23',
    })
      .formatToParts(d)
      .map(x => [x.type, x.value]),
  ) as Record<string, string>
  return `${p.year}${p.month}${p.day}T${p.hour}${p.minute}${p.second}`
}

/** "20261001T213000Z" — para DTSTAMP, que sí va en UTC. */
function selloUTC(d: Date): string {
  return `${d.toISOString().slice(0, 19).replace(/[-:]/g, '')}Z`
}

/* FNV-1a: no hace falta criptografía, hace falta que dos clientes distintos
   con el mismo horario no compartan UID. Sin el mail en el medio, el .ics
   de uno pisaba el turno del otro en su propio calendario. */
function hash(s: string): string {
  let h = 0x811c9dc5
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 0x01000193) >>> 0
  }
  return h.toString(16).padStart(8, '0')
}

/** El identificador del turno para los calendarios. Determinístico: el mismo
 *  turno da el mismo UID sin necesidad de haberlo guardado. */
export function icsUid(start: Date, email: string): string {
  return `${selloLocal(start)}-${hash(email.trim().toLowerCase())}@barberhohle`
}

/* Texto adentro de un .ics: la coma y el punto y coma son separadores del
   formato. «Congreso 1865, Belgrano, CABA» sin escapar es una dirección
   partida en tres. */
function esc(s: string): string {
  return String(s)
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r?\n/g, '\\n')
}

/* RFC 5545: 75 octetos por línea. Se cuenta en bytes, no en caracteres —
   «Höhle» y los emojis del título ocupan más de lo que miden—. */
function fold(line: string): string {
  const bytes = Buffer.from(line, 'utf8')
  if (bytes.length <= 75) return line
  const out: string[] = []
  let i = 0
  let limit = 75
  while (i < bytes.length) {
    let end = Math.min(i + limit, bytes.length)
    // No cortar un carácter multibyte por la mitad
    while (end > i && end < bytes.length && (bytes[end] & 0xc0) === 0x80) end--
    out.push((out.length ? ' ' : '') + bytes.subarray(i, end).toString('utf8'))
    i = end
    limit = 74 // las continuaciones arrancan con un espacio
  }
  return out.join(CRLF)
}

export type TurnoICS = {
  /** REQUEST invita o actualiza; CANCEL borra el turno del calendario. */
  method: 'REQUEST' | 'CANCEL'
  uid: string
  /** Instante de inicio. */
  start: Date
  durationMin: number
  summary: string
  description?: string
  location: string
  nombre: string
  email: string
  /** Aviso previo, en minutos. Sin esto no hay alarma. */
  alarmaMin?: number
}

export function buildICS(ev: TurnoICS): string {
  const end = new Date(ev.start.getTime() + ev.durationMin * 60000)
  const organizador = process.env.GMAIL_USER ?? 'turnos@barberhohle.com'

  /* SEQUENCE tiene que crecer en cada envío o el calendario descarta la
     actualización por vieja. Los segundos desde 1970 crecen solos y entran
     holgados en el entero de 32 bits que pide el formato. */
  const seq = Math.floor(Date.now() / 1000)

  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Barber Höhle//Turnos//ES',
    'CALSCALE:GREGORIAN',
    `METHOD:${ev.method}`,
    ...VTIMEZONE,
    'BEGIN:VEVENT',
    `UID:${ev.uid}`,
    `DTSTAMP:${selloUTC(new Date())}`,
    `SEQUENCE:${seq}`,
    `DTSTART;TZID=${TZ}:${selloLocal(ev.start)}`,
    `DTEND;TZID=${TZ}:${selloLocal(end)}`,
    `SUMMARY:${esc(ev.summary)}`,
    ev.description ? `DESCRIPTION:${esc(ev.description)}` : null,
    `LOCATION:${esc(ev.location)}`,
    `ORGANIZER;CN=Barber Höhle:mailto:${organizador}`,
    `ATTENDEE;CUTYPE=INDIVIDUAL;ROLE=REQ-PARTICIPANT;PARTSTAT=${ev.method === 'CANCEL' ? 'DECLINED' : 'NEEDS-ACTION'};RSVP=${ev.method === 'CANCEL' ? 'FALSE' : 'TRUE'};CN=${esc(ev.nombre)}:mailto:${ev.email}`,
    `STATUS:${ev.method === 'CANCEL' ? 'CANCELLED' : 'CONFIRMED'}`,
    'TRANSP:OPAQUE',
    ...(ev.method === 'REQUEST' && ev.alarmaMin
      ? [
          'BEGIN:VALARM',
          `TRIGGER:-PT${ev.alarmaMin}M`,
          'ACTION:DISPLAY',
          'DESCRIPTION:Recordatorio de turno',
          'END:VALARM',
        ]
      : []),
    'END:VEVENT',
    'END:VCALENDAR',
  ].filter((l): l is string => l !== null)

  return lines.map(fold).join(CRLF) + CRLF
}
