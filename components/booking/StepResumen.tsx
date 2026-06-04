'use client'

import type { BookingState } from '@/types/booking'

interface Props {
  booking: BookingState
  onConfirm: () => void
  loading: boolean
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-start py-3.5 border-b last:border-0" style={{borderColor:'var(--border)'}}>
      <span className="text-xs uppercase tracking-widest" style={{color:'var(--text-faint)'}}>{label}</span>
      <span className="text-sm text-right max-w-[60%]" style={{color:'var(--text)'}}>{value}</span>
    </div>
  )
}

export default function StepResumen({ booking, onConfirm, loading }: Props) {
  const dateStr = booking.date
    ? booking.date.toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' })
    : '—'

  return (
    <div>
      <h2 className="font-playfair text-2xl sm:text-3xl mb-2" style={{color:'var(--text)'}}>Confirmá tu turno</h2>
      <p className="text-sm mb-8" style={{color:'var(--text-muted)'}}>Revisá los datos antes de confirmar</p>

      <div className="max-w-md rounded-xl p-6 mb-8 border" style={{background:'var(--bg-card)', borderColor:'var(--border-2)'}}>
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
        className="w-full max-w-md py-4 rounded-xl font-semibold text-sm tracking-wide uppercase transition-all active:scale-[0.99]"
        style={loading
          ? { background: 'var(--bg-active)', color: 'var(--text-xfaint)', cursor: 'not-allowed' }
          : { background: 'var(--text)', color: 'var(--bg)' }
        }
      >
        {loading ? 'Confirmando...' : 'Confirmar turno'}
      </button>
    </div>
  )
}
