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
  return `${capitalize(dow)} ${d.getDate()} ${mon}`
}

/** "Mié 5" — sin mes. El titular de los pasos, donde el mes se sobreentiende. */
export function diaCorto(date: Date): string {
  const dow = date.toLocaleDateString('es-AR', { weekday: 'short' }).replace('.', '')
  return `${capitalize(dow)} ${date.getDate()}`
}

/** "2026-08-08" — el formato que hablan las APIs, no la interfaz. */
export function toDateParam(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
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
