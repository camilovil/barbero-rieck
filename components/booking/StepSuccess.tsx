'use client'

import Image from 'next/image'
import type { BookingState } from '@/types/booking'
import { BARBER_ADDRESS, CANCELLATION_MIN_HOURS, LOCATION_LABELS } from '@/lib/constants'
import { capitalize as upperFirst, diaCorto as shortDate } from '@/lib/format'

interface Props {
  booking: BookingState
  eventId: string | null
  onReset: () => void
}

function genCode(booking: BookingState): string {
  const ts = booking.date ? booking.date.getTime().toString(36).slice(-4).toUpperCase() : '0000'
  return `HO-${ts}`
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 14 }}>
      <span style={{ fontSize: 12.5, fontWeight: 400, color: 'var(--text-mut)' }}>{k}</span>
      <span style={{ fontSize: 12.5, fontWeight: 500, color: 'var(--text)', textAlign: 'right', minWidth: 0 }}>{v}</span>
    </div>
  )
}

export default function StepSuccess({ booking, eventId, onReset }: Props) {
  const dateStr = booking.date
    ? upperFirst(booking.date.toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' }))
    : '—'

  const lugar = booking.location === 'domicilio'
    ? { main: LOCATION_LABELS.domicilio, sub: booking.direccion || '' }
    : { main: LOCATION_LABELS.local, sub: BARBER_ADDRESS }

  const priceLabel = booking.service?.priceLabel
    ?? (booking.service ? `$${booking.service.price.toLocaleString('es-AR')}` : '—')

  const code = genCode(booking)

  const calUrl = booking.date && booking.time
    ? (() => {
        const [h, m] = booking.time.split(':').map(Number)
        const start = new Date(booking.date)
        start.setHours(h, m, 0, 0)
        const end = new Date(start.getTime() + (booking.service?.duration ?? 60) * 60000)
        const fmt = (d: Date) => d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')
        const details = encodeURIComponent(`Servicio: ${booking.service?.name ?? ''}\nLugar: ${lugar.main} ${lugar.sub}`)
        return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent('Turno Barber Höhle')}&dates=${fmt(start)}/${fmt(end)}&details=${details}`
      })()
    : null

  /* Reemplaza al flujo entero, así que también hereda su alto:
     el comprobante scrollea adentro, la pantalla no se estira. */
  return (
    <div className="step-enter flow-body">

      {/* El sello del turno: se apoya en la superficie de panel para
          despegarse del flujo, que ya es la cueva. */}
      <div className="comprobante">

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
          <span className="sr-only">barber Höhle</span>
          <Image
            src="/logo-white.png"
            alt=""
            width={1522}
            height={253}
            sizes="130px"
            style={{ width: 130, height: 'auto', display: 'block' }}
          />
          <span className="monograma" style={{ fontSize: 20, color: 'var(--text)' }}>Hö</span>
        </div>

        <div className="trama" style={{ height: 56, margin: '26px 0 0' }} aria-hidden />

        {/* Lo único en oro del comprobante: el estado. Es lo que se
            busca al abrirlo y lo que la regla 03 manda marcar. */}
        <div className="rotulo" style={{ marginTop: 28, color: 'var(--acento-txt)' }}>Turno confirmado</div>

        <div
          className="font-display lineas"
          style={{
            fontSize: 'clamp(40px, 13vw, 50px)', fontWeight: 800, lineHeight: .95,
            letterSpacing: '-.045em', color: 'var(--text)', marginTop: 14,
          }}
        >
          <span>{booking.date ? shortDate(booking.date) : '—'}</span>
          <span className="mono" style={{ fontWeight: 500, letterSpacing: '-.02em' }}>
            {booking.time ?? '—'}
          </span>
        </div>

        <div style={{
          marginTop: 20, paddingTop: 14, borderTop: '1px solid var(--text)',
          display: 'flex', flexDirection: 'column', gap: 10,
        }}>
          <Row k={lugar.main} v={booking.service?.name ?? '—'} />
          <Row k="Fecha" v={dateStr} />
          {lugar.sub && <Row k="Dirección" v={lugar.sub} />}
          <Row k="A nombre de" v={booking.nombre || '—'} />
          <Row k="A pagar en el lugar" v={priceLabel} />
        </div>

        <div style={{
          marginTop: 22, paddingTop: 14, borderTop: '1px solid var(--border)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
        }}>
          <span className="rotulo">Comprobante</span>
          <span className="mono" style={{ fontSize: 12, color: 'var(--text)', letterSpacing: '.1em' }}>{code}</span>
        </div>

        {/* Acciones dentro del panel, en papel sobre tinta */}
        <div style={{ display: 'flex', gap: 10, marginTop: 22 }}>
          {calUrl ? (
            <a href={calUrl} target="_blank" rel="noopener noreferrer" className="btn-outline" style={{ flex: 1 }}>
              Agregar al calendario
            </a>
          ) : (
            <button className="btn-outline" disabled style={{ flex: 1 }}>
              Agregar al calendario
            </button>
          )}
        </div>
      </div>

      <p className="mono" style={{ fontSize: 10.5, lineHeight: 1.7, color: 'var(--text-meta)', margin: '20px 0 0' }}>
        TE LLEGA EL DETALLE POR MAIL
        <br />
        CANCELÁS O REPROGRAMÁS SIN COSTO HASTA {CANCELLATION_MIN_HOURS} H ANTES
      </p>

      <div style={{ display: 'flex', alignItems: 'center', gap: 18, marginTop: 22, flexWrap: 'wrap' }}>
        {eventId && booking.email ? (
          <>
            <a
              href={`/modificar?id=${encodeURIComponent(eventId)}&email=${encodeURIComponent(booking.email)}`}
              className="btn-outline"
              style={{ flex: '1 1 200px' }}
            >
              Reprogramar
            </a>
            <a
              href={`/cancelar?id=${encodeURIComponent(eventId)}&email=${encodeURIComponent(booking.email)}`}
              className="btn-ghost"
            >
              Cancelar turno
            </a>
          </>
        ) : (
          <>
            <button onClick={onReset} className="btn-outline" style={{ flex: '1 1 200px' }}>
              Reservar otro turno
            </button>
            <button onClick={onReset} className="btn-ghost">
              Cancelar turno
            </button>
          </>
        )}
      </div>
    </div>
  )
}
