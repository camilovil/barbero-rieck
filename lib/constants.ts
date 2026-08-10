import type { Location, Service } from '@/types/booking'

export const SERVICES: Record<Location, Service[]> = {
  local: [
    { name: 'Corte', duration: 40, price: 16000 },
    { name: 'Corte y barba', duration: 60, price: 19000 },
  ],
  domicilio: [
    { name: 'Corte (incluye barba)', duration: 120, price: 40000 },
  ],
}

export const TIME_SLOTS: Record<Location, string[]> = {
  local: [
    '11:00', '11:30', '12:00', '12:30', '13:00', '13:30',
    '14:00', '14:30', '15:00', '15:30', '16:00', '16:30',
    '17:00', '17:30', '18:00', '18:30',
  ],
  domicilio: ['08:30', '10:00', '11:30', '13:00', '14:30', '16:00', '17:30', '19:00', '20:00'],
}

export const BLOCKED_SLOTS: string[] = []

export const BARBER_NAME = 'Santiago Rieck'
export const BARBER_ADDRESS = 'Congreso 1865, Belgrano, CABA'

export const INSTAGRAM_HANDLE = '@santii_barber07'
export const INSTAGRAM_URL = 'https://www.instagram.com/santii_barber07'

/* Cómo se nombra cada modalidad en TODA la app: interfaz, mails,
   WhatsApp y la descripción del evento de calendario. Antes cada
   archivo inventaba la suya — "Estudio", "En el local", "En local",
   "Barbería Rieck" — y no coincidían entre sí. */
export const LOCATION_LABELS: Record<Location, string> = {
  local: 'Studio Höhle',
  domicilio: 'A domicilio',
}

// Horas mínimas de anticipación para poder cancelar
export const CANCELLATION_MIN_HOURS = 24

/* Seña: la mitad del servicio, y el rato que le guardamos el horario a quien
   todavía no la pagó. Pasado ese rato el turno se cae y el horario vuelve a
   estar libre — si no, cualquiera que abandone la pantalla de pago se queda
   con el turno para siempre. */
export const DEPOSIT_PERCENT = 50
export const DEPOSIT_HOLD_MINUTES = 20

export function depositAmount(price: number): number {
  return Math.round((price * DEPOSIT_PERCENT) / 100)
}
