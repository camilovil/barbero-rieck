'use client'

import type { BookingState } from '@/types/booking'

interface Props {
  booking: BookingState
  onReset: () => void
}

export default function StepSuccess({ booking, onReset }: Props) {
  const dateStr = booking.date
    ? booking.date.toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' })
    : '—'

  return (
    <div className="flex flex-col items-center text-center py-8">
      <div className="w-16 h-16 rounded-full bg-[#2e2e2e] border border-[#f5f0e8]/20 flex items-center justify-center mb-6">
        <svg className="w-8 h-8 text-[#f5f0e8]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
      </div>

      <h2 className="font-playfair text-3xl sm:text-4xl text-[#f5f0e8] mb-3">¡Turno confirmado!</h2>
      <p className="text-[#f5f0e8]/50 text-sm mb-4 max-w-sm">
        Te enviamos un email de confirmación con todos los detalles.
      </p>
      <p className="text-[#f5f0e8]/30 text-xs mb-8 max-w-sm">
        Si no lo ves en tu bandeja de entrada, revisá la carpeta de <span className="text-[#f5f0e8]/50">spam o correo no deseado</span>.
      </p>

      <div className="bg-[#222222] border border-[#3a3a3a] rounded-xl p-6 text-left w-full max-w-sm mb-8">
        <div className="space-y-2">
          <p className="text-[#f5f0e8] font-semibold">{booking.service?.name}</p>
          <p className="text-[#f5f0e8]/50 text-sm">{dateStr} · {booking.time}</p>
          <p className="text-[#f5f0e8]/50 text-sm">
            {booking.location === 'domicilio' ? `A domicilio — ${booking.direccion}` : 'Barbería Rieck'}
          </p>
        </div>
      </div>

      <button
        onClick={onReset}
        className="text-[#f5f0e8]/40 text-sm hover:text-[#f5f0e8]/70 transition-colors underline underline-offset-4"
      >
        Reservar otro turno
      </button>
    </div>
  )
}
