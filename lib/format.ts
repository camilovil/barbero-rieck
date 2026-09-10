/* Formato de fecha y hora, en un solo lugar.
 *
 * Estaba repetido en nueve archivos y ninguno forzaba `hour12: false`.
 * Según los datos de ICU del runtime, `es-AR` puede devolver
 * "03:00 p. m." en vez de "15:00" — y ahí no sólo se ve mal: la
 * agenda del día se ordena comparando esas cadenas y los turnos de
 * la tarde saltan arriba de los de la mañana. */

export const TZ = 'America/Argentina/Buenos_Aires'

export function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1)
}

/** "18:30" — siempre 24 h, siempre hora de Buenos Aires. */
export function hhmm(date: Date | string): string {
  return new Date(date).toLocaleTimeString('es-AR', {
    hour: '2-digit', minute: '2-digit', hour12: false, timeZone: TZ,
  })
}

/** "sábado, 8 de agosto" */
export function fechaLarga(date: Date | string): string {
  return new Date(date).toLocaleDateString('es-AR', {
    weekday: 'long', day: 'numeric', month: 'long', timeZone: TZ,
  })
}

/** "Sáb 8 ago" — el día como titular */
export function fechaCorta(date: Date | string): string {
  const d = new Date(date)
  const dow = d.toLocaleDateString('es-AR', { weekday: 'short', timeZone: TZ }).replace('.', '')
  const mon = d.toLocaleDateString('es-AR', { month: 'short', timeZone: TZ }).replace('.', '')
  /* El número del día sale de la misma zona que el nombre y el mes. Con
     `getDate()` salía del reloj del servidor, y como los otros dos ya venían
     en hora de Buenos Aires, un turno de la noche podía titular «Jue 2 oct»:
     el jueves de Buenos Aires con el número del viernes de Londres. */
  return `${capitalize(dow)} ${Number(diaBA(d).slice(8))} ${mon}`
}

/** "Mié 5" — sin mes. El titular de los pasos, donde el mes se sobreentiende. */
export function diaCorto(date: Date): string {
  const dow = date.toLocaleDateString('es-AR', { weekday: 'short' }).replace('.', '')
  return `${capitalize(dow)} ${date.getDate()}`
}

/** "2026-08-08" — el formato que hablan las APIs, no la interfaz.
 *  Lee el día del reloj de quien llama, que en el navegador es el día que la
 *  persona tocó en el calendario. Es la forma de mandar un día por la red sin
 *  que se corra: una fecha con hora viaja como instante y del otro lado, en
 *  otro huso, puede ser el día anterior. */
export function toDateParam(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/* ─── Un día de la agenda ──────────────────────────────────────────
 *
 * En este proyecto «el 1 de octubre» se representa SIEMPRE como la
 * medianoche de Buenos Aires —2026-10-01T00:00:00-03:00— y no como
 * medianoche UTC. No es un capricho: la fecha del turno se lee de dos
 * maneras incompatibles según el archivo. Unos sacan el día con los
 * getters UTC (`toUTCDateStr`, para armar el evento) y otros lo muestran
 * con `timeZone: 'America/Argentina/Buenos_Aires'` (los mails). La
 * medianoche UTC es el único valor que los dos leen distinto: el mail de
 * reprogramación decía «miércoles, 30 de septiembre» para un turno del
 * jueves 1 de octubre, porque en Buenos Aires esa medianoche todavía es
 * el día anterior a las nueve de la noche.
 *
 * La medianoche de Buenos Aires cae a las 03:00 UTC del mismo día, así que
 * las dos lecturas coinciden. Todo lo que entra por la red pasa por acá. */

/** El día que dice una fecha "AAAA-MM-DD", como medianoche de Buenos Aires.
 *  Cualquier otra cosa —un ISO con hora, de una versión anterior del
 *  formulario— se toma como el instante que es. */
export function diaDeAgenda(v: string | Date): Date {
  if (v instanceof Date) return v
  return /^\d{4}-\d{2}-\d{2}$/.test(v.trim())
    ? new Date(`${v.trim()}T00:00:00-03:00`)
    : new Date(v)
}

/** "2026-10-01" — el día de Buenos Aires que le toca a un instante. */
export function diaBA(d: Date): string {
  // en-CA ya escribe la fecha en el orden que hablan las APIs.
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(d)
}

/** Hoy en Buenos Aires, como día de agenda. */
export function hoyEnBA(ahora: Date = new Date()): Date {
  return diaDeAgenda(diaBA(ahora))
}

/** El mismo día de la agenda, corrido n días. */
export function sumarDias(dia: Date, n: number): Date {
  return new Date(dia.getTime() + n * 86400000)
}

/* ─── El servicio, tal como queda guardado en el calendario ────────
 *
 * `createCalendarEvent` escribe "Corte y barba — $19.000" en la
 * descripción del evento, y esa línea es la única fuente de verdad
 * del precio de un turno ya tomado: el catálogo cambia con el tiempo
 * y reprogramar no puede re-cotizar el turno solo. Los dos lectores
 * —los mails y las rutas de modificación— parsean lo mismo, así que
 * el parser vive acá y no duplicado en cada uno. */

/** "Corte y barba — $19.000" → "Corte y barba" */
export function nombreServicio(servicio: string): string {
  return (servicio ?? '').split(' — ')[0].trim()
}

/** "Corte y barba — $19.000" → 19000. Sin precio en la línea, 0. */
export function precioServicio(servicio: string): number {
  const m = (servicio ?? '').match(/\$\s?([\d.]+)/)
  return m ? Number(m[1].replace(/\./g, '')) : 0
}
