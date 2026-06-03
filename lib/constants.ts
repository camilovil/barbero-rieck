import type { Location, Service } from '@/types/booking'

export const SERVICES: Record<Location, Service[]> = {
  local: [
    { name: 'Corte', duration: 45, price: 3500 },
    { name: 'Barba', duration: 30, price: 2000 },
    { name: 'Combo', duration: 70, price: 5000 },
  ],
  domicilio: [
    { name: 'Corte', duration: 60, price: 4500 },
    { name: 'Barba', duration: 45, price: 3000 },
    { name: 'Combo', duration: 90, price: 6500 },
  ],
}

export const TIME_SLOTS: Record<Location, string[]> = {
  local: [
    '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
    '14:00', '14:30', '15:00', '15:30', '16:00', '17:00', '17:30',
  ],
  domicilio: ['10:00', '11:00', '14:00', '15:30', '16:30'],
}

export const BLOCKED_SLOTS: string[] = ['09:30', '11:00', '15:00', '16:00']

export const BARBER_NAME = 'Santiago Rieck'
export const BARBER_ADDRESS = 'Barbería Rieck — Av. Corrientes 1234, CABA'
