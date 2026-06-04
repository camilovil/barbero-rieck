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
    <div className="flex flex-col items-center text-center py-8 px-2">
      <div className="w-16 h-16 rounded-full border flex items-center justify-center mb-6"
        style={{background:'var(--bg-active)', borderColor:'var(--border-2)'}}>
        <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}
          style={{color:'var(--text)'}}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
      </div>

      <h2 className="font-playfair text-3xl sm:text-4xl mb-3" style={{color:'var(--text)'}}>¡Turno confirmado!</h2>
      <p className="text-sm mb-3 max-w-sm" style={{color:'var(--text-muted)'}}>
        Te enviamos un email de confirmación con todos los detalles.
      </p>
      <p className="text-xs mb-8 max-w-sm" style={{color:'var(--text-faint)'}}>
        Si no lo ves en tu bandeja de entrada, revisá la carpeta de{' '}
        <span style={{color:'var(--text-muted)'}}>spam o correo no deseado</span>.
      </p>

      <div className="rounded-xl p-6 text-left w-full max-w-sm mb-8 border"
        style={{background:'var(--bg-card)', borderColor:'var(--border-2)'}}>
        <div className="space-y-2">
          <p className="font-semibold" style={{color:'var(--text)'}}>{booking.service?.name}</p>
          <p className="text-sm capitalize" style={{color:'var(--text-muted)'}}>{dateStr} · {booking.time}</p>
          <p className="text-sm" style={{color:'var(--text-muted)'}}>
            {booking.location === 'domicilio' ? `A domicilio — ${booking.direccion}` : 'Estudio de Santiago'}
          </p>
        </div>
      </div>

      <button
        onClick={onReset}
        className="text-sm underline underline-offset-4 transition-colors cursor-pointer"
        style={{color:'var(--text-faint)'}}
      >
        Reservar otro turno
      </button>
    </div>
  )
}
