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
    <div className="step-enter" style={{ textAlign: 'center', padding: '30px 10px 10px' }}>
      {/* Trofeo */}
      <div style={{
        width: 88, height: 88, margin: '0 auto 16px',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        borderRadius: '50%',
        background: 'linear-gradient(160deg, var(--celeste), var(--celeste-deep))',
        boxShadow: '0 14px 30px rgba(63,134,196,.4)',
      }}>
        <svg width={46} height={46} viewBox="0 0 24 24" fill="none" stroke="var(--gold)" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
          <path d="M6 9H4.5a2.5 2.5 0 0 0 0 5H6"/>
          <path d="M18 9h1.5a2.5 2.5 0 0 1 0 5H18"/>
          <path d="M4 22h16"/>
          <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/>
          <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/>
          <path d="M18 2H6v7a6 6 0 0 0 12 0V2z"/>
        </svg>
      </div>

      {/* Título */}
      <h2 style={{
        fontFamily: 'var(--font-anton, "Anton"), sans-serif',
        fontSize: 27, margin: '0 0 6px', color: 'var(--text)',
      }}>
        ¡Turno confirmado!
      </h2>
      <p style={{ fontSize: 13, color: 'var(--text-mut)', fontWeight: 600, lineHeight: 1.55, maxWidth: 280, margin: '0 auto 6px' }}>
        Te enviamos un email de confirmación con todos los detalles.
      </p>
      <p style={{ fontSize: 12, color: 'var(--text-mut)', fontWeight: 600, lineHeight: 1.4, maxWidth: 280, margin: '0 auto 16px' }}>
        Si no lo ves en tu bandeja, revisá la carpeta de{' '}
        <span style={{ color: 'var(--text)' }}>spam o correo no deseado</span>.
      </p>

      {/* Detalle del turno */}
      <div style={{
        border: '2.5px solid var(--border)', borderRadius: 16,
        overflow: 'hidden', background: 'var(--surface)',
        margin: '0 0 14px', textAlign: 'left',
      }}>
        {[
          { k: 'Servicio', v: booking.service?.name ?? '—' },
          { k: 'Fecha', v: dateStr },
          { k: 'Horario', v: booking.time ?? '—' },
          { k: 'Lugar', v: booking.location === 'domicilio' ? `A domicilio — ${booking.direccion}` : 'Barbería Rieck' },
        ].map(({ k, v }, i, arr) => (
          <div key={k} style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            gap: 14, padding: '12px 16px',
            borderBottom: i < arr.length - 1 ? '2px dashed var(--border-soft)' : 'none',
          }}>
            <span style={{ fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.6px', color: 'var(--text-mut)' }}>{k}</span>
            <span style={{ fontSize: 13, fontWeight: 800, color: 'var(--text)', textAlign: 'right', maxWidth: '62%' }}>{v}</span>
          </div>
        ))}
      </div>

      {/* Google Calendar notice */}
      <div style={{
        display: 'flex', gap: 9, alignItems: 'flex-start', justifyContent: 'center',
        fontSize: 11.5, fontWeight: 600, color: 'var(--text-mut)', lineHeight: 1.5,
        marginBottom: 18,
      }}>
        <svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: 1 }}>
          <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
          <line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/>
          <line x1="3" y1="10" x2="21" y2="10"/>
        </svg>
        <span>Agregado al Google Calendar de Santiago Rieck.</span>
      </div>

      {/* Restart */}
      <button
        onClick={onReset}
        style={{
          background: 'none', border: '2px solid var(--border)',
          color: 'var(--text)', borderRadius: 30, padding: '10px 22px',
          fontWeight: 800, fontSize: 12, fontFamily: 'inherit',
          cursor: 'pointer', letterSpacing: '.5px', transition: '.15s',
        }}
      >
        Reservar otro turno
      </button>
    </div>
  )
}
