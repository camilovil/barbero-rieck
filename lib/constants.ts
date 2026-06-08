import type { Location, Service } from '@/types/booking'

export const SERVICES: Record<Location, Service[]> = {
  local: [
    { name: 'Corte', duration: 40, price: 15000 },
    { name: 'Corte y barba', duration: 60, price: 17000 },
  ],
  domicilio: [
    { name: 'Corte', duration: 90, price: 30000 },
    { name: 'Corte y barba', duration: 90, price: 0, priceLabel: 'A consultar' },
  ],
}

export const TIME_SLOTS: Record<Location, string[]> = {
  local: [
    '10:00', '10:30', '11:00', '11:30', '12:00', '12:30',
    '13:00', '14:00', '14:30', '15:00', '15:30', '16:00',
    '16:30', '17:00', '17:30', '18:00', '18:30',
  ],
  domicilio: ['10:00', '11:30', '13:00', '15:00', '17:00'],
}

export const BLOCKED_SLOTS: string[] = []

export const BARBER_NAME = 'Santiago Rieck'
export const BARBER_ADDRESS = 'Congreso 1865, Belgrano, CABA'

// Horas mínimas de anticipación para poder cancelar
export const CANCELLATION_MIN_HOURS = 24

// Máximo de turnos por día (evita sobrecarga)
export const MAX_DAILY_BOOKINGS = 8
