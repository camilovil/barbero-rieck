'use client'

import type { BookingState } from '@/types/booking'

interface Props {
  booking: BookingState
  onConfirm: () => void
  loading: boolean
}

function Row({ label, value, isTot }: { label: string; value: string; isTot?: boolean }) {
  if (isTot) {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        gap: 14, padding: '13px 16px',
        background: 'linear-gradient(160deg, var(--celeste), var(--celeste-deep))',
      }}>
        <span style={{ fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.6px', color: 'rgba(255,255,255,.9)' }}>{label}</span>
        <span style={{ fontFamily: 'var(--font-anton, "Anton"), sans-serif', fontSize: 22, color: '#fff' }}>{value}</span>
      </div>
    )
  }
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      gap: 14, padding: '13px 16px',
      borderBottom: '2px dashed var(--border-soft)',
    }}>
      <span style={{ fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.6px', color: 'var(--text-mut)' }}>{label}</span>
      <span style={{ fontSize: 14, fontWeight: 800, color: 'var(--text)', textAlign: 'right', maxWidth: '62%', lineHeight: 1.25 }}>{value}</span>
    </div>
  )
}

export default function StepResumen({ booking, onConfirm, loading }: Props) {
  const dateStr = booking.date
    ? booking.date.toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' })
    : '—'

  const priceLabel = booking.service?.priceLabel ?? `$${booking.service?.price?.toLocaleString('es-AR') ?? '—'}`

  return (
    <div className="step-enter">
      <div style={{ fontFamily: 'var(--font-anton, "Anton"), sans-serif', fontSize: 25, letterSpacing: '.3px', margin: '0 0 3px', color: 'var(--text)' }}>
        Confirmá tu turno
      </div>
      <p style={{ fontSize: 12.5, color: 'var(--text-mut)', fontWeight: 600, margin: '0 0 18px' }}>
        Revisá que esté todo bien
      </p>

      <div style={{
        border: '2.5px solid var(--border)', borderRadius: 16,
        overflow: 'hidden', background: 'var(--surface)', marginBottom: 14,
      }}>
        <Row label="Modalidad"  value={booking.location === 'domicilio' ? 'A domicilio' : 'Barbería Rieck'} />
        <Row label="Servicio"   value={booking.service?.name ?? '—'} />
        <Row label="Duración"   value={`${booking.service?.duration ?? '—'} min`} />
        <Row label="Fecha"      value={dateStr} />
        <Row label="Horario"    value={booking.time ?? '—'} />
        <Row label="Nombre"     value={booking.nombre} />
        <Row label="Email"      value={booking.email} />
        <Row label="WhatsApp"   value={booking.whatsapp} />
        {booking.location === 'domicilio' && booking.direccion && (
          <Row label="Dirección" value={booking.direccion} />
        )}
        {booking.nota && <Row label="Nota" value={booking.nota} />}
        <Row label="Total" value={priceLabel} isTot />
      </div>

      {/* Nota al pie */}
      <div style={{
        display: 'flex', gap: 9, alignItems: 'flex-start',
        fontSize: 11.5, fontWeight: 600, color: 'var(--text-mut)',
        lineHeight: 1.5, padding: '0 2px', marginBottom: 14,
      }}>
        <svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="var(--gold-deep)" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: 1 }}>
          <polygon points="12 2 15.1 8.3 22 9.3 17 14.1 18.2 21 12 17.8 5.8 21 7 14.1 2 9.3 8.9 8.3 12 2"/>
        </svg>
        <span>Confirmación por mail y WhatsApp. Podés cancelar hasta 2 hs antes.</span>
      </div>

      {/* CTA */}
      <button
        onClick={onConfirm}
        disabled={loading}
        className="btn-cta final"
        style={{ width: '100%', justifyContent: 'center', padding: '14px 26px' }}
      >
        <svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
          <circle cx="12" cy="12" r="10"/>
          <path d="M12 7l3.5 2.5-1.3 4h-4.4l-1.3-4z" fill="currentColor" stroke="none"/>
        </svg>
        {loading ? 'CONFIRMANDO...' : 'CONFIRMAR TURNO'}
      </button>
    </div>
  )
}
