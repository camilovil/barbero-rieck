'use client'

import type { BookingState } from '@/types/booking'

interface Props {
  booking: BookingState
  onConfirm: () => void
  loading: boolean
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-start py-3.5 border-b border-[#2e2e2e] last:border-0">
      <span className="text-[#f5f0e8]/40 text-xs uppercase tracking-widest">{label}</span>
      <span className="text-[#f5f0e8] text-sm text-right max-w-[60%]">{value}</span>
    </div>
  )
}

export default function StepResumen({ booking, onConfirm, loading }: Props) {
  const dateStr = booking.date
    ? booking.date.toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' })
    : '—'

  return (
    <div>
      <h2 className="font-playfair text-2xl sm:text-3xl text-[#f5f0e8] mb-2">Confirmá tu turno</h2>
      <p className="text-[#f5f0e8]/50 text-sm mb-8">Revisá los datos antes de confirmar</p>

      <div className="max-w-md bg-[#222222] border border-[#3a3a3a] rounded-xl p-6 mb-8">
        <Row label="Modalidad" value={booking.location === 'domicilio' ? 'A domicilio' : 'En el local'} />
        <Row label="Servicio" value={`${booking.service?.name} — $${booking.service?.price?.toLocaleString('es-AR')}`} />
        <Row label="Duración" value={`${booking.service?.duration} min`} />
        <Row label="Fecha" value={dateStr} />
        <Row label="Horario" value={booking.time ?? '—'} />
        <Row label="Nombre" value={booking.nombre} />
        <Row label="Email" value={booking.email} />
        <Row label="WhatsApp" value={booking.whatsapp} />
        {booking.location === 'domicilio' && booking.direccion && (
          <Row label="Dirección" value={booking.direccion} />
        )}
        {booking.nota && <Row label="Nota" value={booking.nota} />}
      </div>

      <button
        onClick={onConfirm}
        disabled={loading}
        className={`
          w-full max-w-md py-4 rounded-xl font-semibold text-sm tracking-wide uppercase transition-all
          ${loading
            ? 'bg-[#2e2e2e] text-[#f5f0e8]/30 cursor-not-allowed'
            : 'bg-[#f5f0e8] text-[#1a1a1a] hover:bg-white active:scale-[0.99]'
          }
        `}
      >
        {loading ? 'Confirmando...' : 'Confirmar turno'}
      </button>
    </div>
  )
}
