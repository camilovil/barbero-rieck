'use client'

import type { BookingState } from '@/types/booking'

interface Props {
  booking: BookingState
  eventId: string | null
  onReset: () => void
}

function genCode(booking: BookingState): string {
  const ts = booking.date ? booking.date.getTime().toString(36).slice(-4).toUpperCase() : '0000'
  return `SR-${ts}`
}

export default function StepSuccess({ booking, eventId, onReset }: Props) {
  const dateStr = booking.date
    ? booking.date.toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' })
    : '—'

  const lugar = booking.location === 'domicilio'
    ? { main: 'A domicilio', sub: booking.direccion || '' }
    : { main: 'Barbería Rieck', sub: 'CABA · Corrientes 1234' }

  const jerseyNo = booking.service?.name === 'Corte y barba' ? '10' : '7'
  const servicioSub = `${booking.service?.name ?? '—'} · N°${jerseyNo}`

  const code = genCode(booking)

  const calUrl = booking.date && booking.time
    ? (() => {
        const [h, m] = booking.time.split(':').map(Number)
        const start = new Date(booking.date)
        start.setHours(h, m, 0, 0)
        const end = new Date(start.getTime() + (booking.service?.duration ?? 60) * 60000)
        const fmt = (d: Date) => d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')
        const details = encodeURIComponent(`Servicio: ${booking.service?.name ?? ''}\nLugar: ${lugar.main} ${lugar.sub}`)
        return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent('Turno Santi Barber')}&dates=${fmt(start)}/${fmt(end)}&details=${details}`
      })()
    : null

  return (
    <div className="step-enter" style={{ padding: '0 0 6px' }}>

      {/* Status banner */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 11,
        padding: '13px 16px', fontWeight: 800, fontSize: 12.5, letterSpacing: '.3px',
        borderBottom: '2px solid var(--border-soft)', background: 'var(--surface)',
        margin: '0 -4px 20px',
      }}>
        <span style={{ width: 9, height: 9, borderRadius: '50%', flexShrink: 0, background: '#2E9E6B', boxShadow: '0 0 0 4px rgba(46,158,107,.18)', display: 'inline-block' }} />
        <span style={{ color: 'var(--text)' }}>Turno confirmado</span>
        <span style={{ marginLeft: 'auto', fontFamily: 'var(--font-anton,"Anton"),sans-serif', fontWeight: 400, letterSpacing: 1, color: 'var(--text-mut)', fontSize: 12 }}>{code}</span>
      </div>

      {/* Trophy */}
      <div style={{ textAlign: 'center', marginBottom: 20 }}>
        <div style={{
          width: 92, height: 92, margin: '0 auto 16px',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          borderRadius: '50%',
          background: 'linear-gradient(160deg, var(--celeste), var(--celeste-deep))',
          boxShadow: '0 14px 30px rgba(63,134,196,.4)',
          color: 'var(--gold)',
        }}>
          <svg viewBox="0 0 24 24" width={46} height={46} fill="currentColor">
            <path d="M6 4h12v3a6 6 0 0 1-12 0z"/>
            <path d="M6 5H3v1a3 3 0 0 0 3 3M18 5h3v1a3 3 0 0 1-3 3" fill="none" stroke="currentColor" strokeWidth="1.6"/>
            <path d="M10 13h4v3h-4z"/>
            <path d="M8 20h8M9 20l.5-4h5l.5 4" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round"/>
          </svg>
        </div>

        <h2 style={{ fontFamily: 'var(--font-anton,"Anton"),sans-serif', fontSize: 27, margin: '0 0 5px', color: 'var(--text)', letterSpacing: '.3px' }}>
          ¡Turno confirmado!
        </h2>
        <p style={{ fontSize: 13, color: 'var(--text-mut)', fontWeight: 600, lineHeight: 1.5, maxWidth: 300, margin: '0 auto' }}>
          Te esperamos. Te llega el detalle por mail y Santiago te escribe por WhatsApp para coordinar.
        </p>
      </div>

      {/* Detail card */}
      <div style={{ border: '2.5px solid var(--border)', borderRadius: 16, overflow: 'hidden', background: 'var(--surface)', marginBottom: 14 }}>
        {/* Lugar */}
        <Row label="Lugar" value={lugar.main} sub={lugar.sub} />
        {/* Servicio */}
        <Row label="Servicio" value={servicioSub} sub={`${booking.service?.duration ?? 60} min`} />
        {/* Día y hora */}
        <Row label="Día y hora" value={dateStr} sub={booking.time ? `${booking.time} hs` : '—'} />
        {/* A nombre de */}
        <Row label="A nombre de" value={booking.nombre || '—'} sub={booking.whatsapp || ''} />
        {/* Total */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 14,
          padding: '13px 16px',
          background: 'linear-gradient(160deg, var(--celeste), var(--celeste-deep))',
        }}>
          <span style={{ fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.6px', color: 'rgba(255,255,255,.9)' }}>Total</span>
          <span style={{ fontFamily: 'var(--font-anton,"Anton"),sans-serif', fontSize: 22, fontWeight: 400, color: '#fff' }}>
            {booking.service ? `$${booking.service.price.toLocaleString('es-AR')}` : '—'}
          </span>
        </div>
      </div>

      {/* Note */}
      <div style={{ display: 'flex', gap: 9, alignItems: 'flex-start', fontSize: 11.5, fontWeight: 600, color: 'var(--text-mut)', lineHeight: 1.5, marginBottom: 20 }}>
        <svg viewBox="0 0 24 24" width={15} height={15} fill="#F2B63C" style={{ flexShrink: 0, marginTop: 2 }}>
          <path d="M12 2l2.9 6.2 6.8.7-5 4.6 1.4 6.7L12 17.8 5.9 20.2l1.4-6.7-5-4.6 6.8-.7z"/>
        </svg>
        <span>Podés cancelar o reprogramar sin costo hasta 24 hs antes del turno.</span>
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {/* Agregar al calendario */}
        {calUrl ? (
          <a
            href={calUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-cta final"
            style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 9 }}
          >
            <svg viewBox="0 0 24 24" width={17} height={17} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="4.5" width="18" height="16" rx="2"/>
              <path d="M3 9h18M8 2.5v4M16 2.5v4M12 13v4M10 15h4"/>
            </svg>
            AGREGAR AL CALENDARIO
          </a>
        ) : (
          <button className="btn-cta final" disabled style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 9 }}>
            <svg viewBox="0 0 24 24" width={17} height={17} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="4.5" width="18" height="16" rx="2"/>
              <path d="M3 9h18M8 2.5v4M16 2.5v4M12 13v4M10 15h4"/>
            </svg>
            AGREGAR AL CALENDARIO
          </button>
        )}

        {/* Reprogramar */}
        {eventId && booking.email ? (
          <a
            href={`/modificar?id=${encodeURIComponent(eventId)}&email=${encodeURIComponent(booking.email)}`}
            style={{
              background: 'none', border: '2px solid var(--border)',
              color: 'var(--text)', borderRadius: 30, padding: '14px 22px',
              fontFamily: 'var(--font-anton,"Anton"),sans-serif', fontSize: 13,
              letterSpacing: '1.5px', textTransform: 'uppercase',
              textDecoration: 'none', textAlign: 'center', width: '100%',
              display: 'block', boxSizing: 'border-box',
            }}
          >
            Reprogramar
          </a>
        ) : (
          <button
            onClick={onReset}
            style={{
              background: 'none', border: '2px solid var(--border)',
              color: 'var(--text)', borderRadius: 30, padding: '14px 22px',
              fontFamily: 'var(--font-anton,"Anton"),sans-serif', fontSize: 13,
              letterSpacing: '1.5px', textTransform: 'uppercase',
              cursor: 'pointer', transition: '.15s', width: '100%',
            }}
          >
            Reprogramar
          </button>
        )}

        {/* Cancelar turno */}
        {eventId && booking.email ? (
          <a
            href={`/cancelar?id=${encodeURIComponent(eventId)}&email=${encodeURIComponent(booking.email)}`}
            style={{
              background: 'none', border: 'none',
              color: 'var(--text-mut)', fontWeight: 800,
              fontSize: 12.5, letterSpacing: '.3px',
              padding: '6px', textAlign: 'center', width: '100%',
              display: 'block', textDecoration: 'none',
            }}
          >
            Cancelar turno
          </a>
        ) : (
          <button
            onClick={onReset}
            style={{
              background: 'none', border: 'none',
              color: 'var(--text-mut)', fontFamily: 'inherit', fontWeight: 800,
              fontSize: 12.5, letterSpacing: '.3px', cursor: 'pointer',
              padding: '6px', textAlign: 'center', width: '100%',
            }}
          >
            Cancelar turno
          </button>
        )}
      </div>
    </div>
  )
}

function Row({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      gap: 14, padding: '13px 16px',
      borderBottom: '2px dashed var(--border-soft)',
    }}>
      <span style={{ fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.6px', color: 'var(--text-mut)', flexShrink: 0 }}>{label}</span>
      <div style={{ textAlign: 'right', maxWidth: '64%' }}>
        <span style={{ fontSize: 14, fontWeight: 800, color: 'var(--text)', lineHeight: 1.25, display: 'block' }}>{value}</span>
        {sub && <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-mut)', marginTop: 1, display: 'block' }}>{sub}</span>}
      </div>
    </div>
  )
}
