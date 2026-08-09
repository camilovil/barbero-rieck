'use client'

import type { BookingState } from '@/types/booking'
import { CANCELLATION_MIN_HOURS, LOCATION_LABELS } from '@/lib/constants'
import { capitalize as upperFirst, diaCorto as shortDate } from '@/lib/format'

interface Props {
  booking: BookingState
}

function Row({ k, v, mono }: { k: string; v: string; mono?: boolean }) {
  return (
    <div className="kv">
      <span className="kv-k">{k}</span>
      <span className={`kv-v${mono ? ' mono' : ''}`}>{v}</span>
    </div>
  )
}

export default function StepResumen({ booking }: Props) {
  const dateStr = booking.date
    ? upperFirst(booking.date.toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' }))
    : '—'

  const priceLabel = booking.service?.priceLabel ?? `$${booking.service?.price?.toLocaleString('es-AR') ?? '—'}`
  const lugar = LOCATION_LABELS[booking.location ?? 'local']

  return (
    <div className="step-enter">
      <div className="h-step lineas"><span>Revisá y</span><span>confirmá</span></div>

      {/* El turno, en display. Es el dato que importa. */}
      <div
        className="font-display lineas"
        style={{
          fontSize: 'clamp(34px, 10vw, 42px)',
          fontWeight: 800,
          lineHeight: .95,
          letterSpacing: '-.045em',
          color: 'var(--text)',
          paddingBottom: 14,
          borderBottom: '1px solid var(--text)',
          marginTop: 4,
        }}
      >
        <span>{booking.date ? shortDate(booking.date) : '—'}</span>
        <span className="mono" style={{ fontWeight: 500, letterSpacing: '-.02em' }}>
          {booking.time ?? '—'}
        </span>
      </div>

      <div style={{ marginBottom: 20 }}>
        <Row k="Lugar" v={lugar} />
        {booking.location === 'domicilio' && booking.direccion
          ? <Row k="Dirección" v={booking.direccion} />
          : <Row k="Dirección" v="Congreso 1865, Belgrano" />}
        <Row k="Fecha" v={dateStr} />
        <Row k="Servicio" v={`${booking.service?.name ?? '—'} · ${booking.service?.duration ?? 60}'`} />
        <Row k="A nombre de" v={booking.nombre || '—'} />
        <Row k="WhatsApp" v={booking.whatsapp || '—'} mono />
        <Row k="Email" v={booking.email || '—'} />
        {booking.nota && <Row k="Nota" v={booking.nota} />}

        {/* Total — el único renglón con filete de tinta */}
        <div
          className="kv"
          style={{ borderBottom: 'none', borderTop: '1px solid var(--text)', marginTop: 4, paddingTop: 14 }}
        >
          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>Total</span>
          <span className="mono" style={{ fontSize: 20, fontWeight: 500, color: 'var(--text)' }}>
            {priceLabel}
          </span>
        </div>
      </div>

      <p className="mono" style={{ fontSize: 10.5, lineHeight: 1.7, color: 'var(--text-meta)', margin: 0 }}>
        SE PAGA EN EL LUGAR · CONFIRMACIÓN POR MAIL Y WHATSAPP
        <br />
        CANCELÁS HASTA {CANCELLATION_MIN_HOURS} H ANTES
      </p>
    </div>
  )
}
