import type { Location, Service } from '@/types/booking'

export const SERVICES: Record<Location, Service[]> = {
  local: [
    { name: 'Corte', duration: 40, price: 16000 },
    { name: 'Corte y barba', duration: 60, price: 20000 },
  ],
  domicilio: [
    { name: 'Corte', duration: 120, price: 40000 },
    { name: 'Corte y barba', duration: 120, price: 45000 },
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

// Horas mínimas de anticipación para poder cancelar
export const CANCELLATION_MIN_HOURS = 24

// Máximo de turnos por día (evita sobrecarga)
export const MAX_DAILY_BOOKINGS = 8
