'use client'

import type { BookingState } from '@/types/booking'
import { CANCELLATION_MIN_HOURS, LOCATION_LABELS, DEPOSIT_PERCENT, depositAmount, viaticoDeBarrio, zonaDeBarrio } from '@/lib/constants'
import { capitalize as upperFirst, diaCorto as shortDate } from '@/lib/format'

interface Props {
  booking: BookingState
  senaActiva?: boolean
}

function Row({ k, v, mono }: { k: string; v: string; mono?: boolean }) {
  return (
    <div className="kv">
      <span className="kv-k">{k}</span>
      <span className={`kv-v${mono ? ' mono' : ''}`}>{v}</span>
    </div>
  )
}

export default function StepResumen({ booking, senaActiva = false }: Props) {
  const dateStr = booking.date
    ? upperFirst(booking.date.toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' }))
    : '—'

  const priceLabel = booking.service?.priceLabel ?? `$${booking.service?.price?.toLocaleString('es-AR') ?? '—'}`
  const lugar = LOCATION_LABELS[booking.location ?? 'local']

  /* Con seña, el número grande deja de ser el total y pasa a ser lo que se
     paga ahora: es la plata que el cliente está por poner en el próximo
     toque, y tiene que verla antes de que lo mande Mercado Pago. */
  const precio = booking.service?.price ?? 0
  /* El viático no entra en la seña: se paga entero en el turno, junto con el
     saldo del servicio. La seña sigue siendo la mitad del servicio. */
  const viatico = booking.location === 'domicilio' ? viaticoDeBarrio(booking.barrio) : 0
  const aConvenir = booking.location === 'domicilio' && (zonaDeBarrio(booking.barrio)?.aConvenir ?? false)
  const total = precio + viatico
  const sena = depositAmount(precio)
  const saldo = total - sena
  const conSena = senaActiva && precio > 0 && !booking.service?.priceLabel
  const plata = (n: number) => `$${n.toLocaleString('es-AR')}`

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

        {(viatico > 0 || aConvenir) && <Row k="Servicio" v={plata(precio)} mono />}
        {viatico > 0 && <Row k={`Viático · ${booking.barrio}`} v={plata(viatico)} mono />}
        {/* Fuera de cobertura no inventamos un número: se dice que falta. */}
        {aConvenir && <Row k="Viático" v="A convenir con Santiago" />}
        {conSena && <Row k={viatico > 0 ? 'Total' : 'Total del servicio'} v={plata(total)} mono />}

        {/* El renglón con filete de tinta es lo que se paga ahora */}
        <div
          className="kv"
          style={{ borderBottom: 'none', borderTop: '1px solid var(--text)', marginTop: 4, paddingTop: 14 }}
        >
          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>
            {conSena ? `Seña ahora · ${DEPOSIT_PERCENT}%` : 'Total'}
          </span>
          <span className="mono" style={{ fontSize: 20, fontWeight: 500, color: 'var(--text)' }}>
            {conSena ? plata(sena) : viatico > 0 ? plata(total) : priceLabel}
          </span>
        </div>

        {conSena && (
          <div className="kv" style={{ borderBottom: 'none', paddingTop: 8 }}>
            <span className="kv-k">Saldo en el lugar</span>
            <span className="kv-v mono">{plata(saldo)}</span>
          </div>
        )}
      </div>

      {conSena ? (
        <p className="mono" style={{ fontSize: 10.5, lineHeight: 1.7, color: 'var(--text-meta)', margin: 0 }}>
          LA SEÑA SE PAGA POR MERCADO PAGO · EL SALDO EN EL LUGAR
          <br />
          EL HORARIO TE QUEDA GUARDADO MIENTRAS PAGÁS
          <br />
          LA SEÑA NO SE DEVUELVE · SI NO PODÉS VENIR, REPROGRAMÁ
          {aConvenir && <><br />TU BARRIO QUEDA FUERA DE COBERTURA · SANTIAGO TE PASA EL VIÁTICO POR WHATSAPP Y SE PAGA APARTE</>}
        </p>
      ) : (
        <p className="mono" style={{ fontSize: 10.5, lineHeight: 1.7, color: 'var(--text-meta)', margin: 0 }}>
          SE PAGA EN EL LUGAR · CONFIRMACIÓN POR MAIL Y WHATSAPP
          <br />
          CANCELÁS HASTA {CANCELLATION_MIN_HOURS} H ANTES
          {aConvenir && <><br />TU BARRIO QUEDA FUERA DE COBERTURA · SANTIAGO TE PASA EL VIÁTICO POR WHATSAPP Y SE PAGA APARTE</>}
        </p>
      )}
    </div>
  )
}
