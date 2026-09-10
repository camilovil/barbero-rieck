/* Qué horarios de la grilla tapa lo que ya está en el calendario.
 *
 * Es puro cálculo: no habla con Google, así que sirve igual para dibujar la
 * grilla y para contestar «ese horario ya está tomado» cuando alguien
 * confirma. Vive acá y no en googleCalendar.ts justo por eso — para poder
 * probarlo sin credenciales, que es la parte que decide si dos personas se
 * llevan el mismo turno. */

import { TIME_SLOTS } from './constants.ts'
import { diaBA } from './format.ts'
import type { Location } from '@/types/booking'

/** Argentina no tiene horario de verano: −03:00 todo el año. */
export const BA_OFFSET = '-03:00'

export type Ocupado = { start: string; end: string }

/** El instante de un horario de la grilla, en el día que se le pase. */
export function inicioDeSlot(date: Date, time: string): Date {
  return new Date(`${diaBA(date)}T${time}:00${BA_OFFSET}`)
}

/* Cuánto ocupa un turno según la modalidad. No es la duración del servicio:
   es lo que la grilla le reserva. A domicilio Santiago viaja, así que un
   turno le come dos horas de agenda aunque el corte dure cuarenta minutos. */
const OCUPA_MIN: Record<Location, number> = { local: 60, domicilio: 120 }

/** Los horarios de la grilla que pisa algo que ya está agendado. */
export function slotsPisados(
  date: Date,
  location: Location,
  ocupado: Ocupado[],
): string[] {
  if (ocupado.length === 0) return []

  const slotDurationMs = OCUPA_MIN[location] * 60 * 1000

  return TIME_SLOTS[location].filter((time) => {
    const slotStart = inicioDeSlot(date, time)
    const slotEnd = new Date(slotStart.getTime() + slotDurationMs)

    return ocupado.some((ev) => {
      const evStart = new Date(ev.start)
      const evEnd = new Date(ev.end)
      return slotStart < evEnd && slotEnd > evStart
    })
  })
}
