'use client'

import { SERVICES } from '@/lib/constants'
import type { Location, Service } from '@/types/booking'

interface Props {
  location: Location
  selected: Service | null
  onSelect: (s: Service) => void
}

export default function StepService({ location, selected, onSelect }: Props) {
  const services = SERVICES[location]

  return (
    <div className="step-enter">
      <div className="h-step lineas"><span>Elegí el</span><span>servicio</span></div>
      <p className="sub-step">Elegí uno.</p>

      <div className="opt-list">
        {services.map((svc) => {
          const isSelected = selected?.name === svc.name && selected?.price === svc.price
          const priceLabel = svc.priceLabel ?? `$${svc.price.toLocaleString('es-AR')}`

          return (
            <button
              type="button"
              key={svc.name}
              aria-pressed={isSelected}
              aria-label={`${svc.name} — ${svc.duration} minutos — ${priceLabel}`}
              className={`opt-row${isSelected ? ' selected' : ''}`}
              onClick={() => onSelect(svc)}
            >
              <span className="opt-mark" aria-hidden>
                <svg viewBox="0 0 24 24" width={11} height={11} fill="none" stroke="currentColor"
                  strokeWidth={3.4} strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </span>
              <span style={{ flex: 1, minWidth: 0 }}>
                <span className="opt-row-title" style={{ display: 'block' }}>{svc.name}</span>
                <span className="opt-row-sub" style={{ display: 'block', letterSpacing: '.06em' }}>
                  {svc.duration} MIN
                </span>
              </span>
              <span className="opt-row-price">{priceLabel}</span>
            </button>
          )
        })}
      </div>

      {location === 'domicilio' && (
        <p
          className="mono"
          style={{
            fontSize: 11.5, lineHeight: 1.6, color: 'var(--text-mut)',
            margin: '18px 0 0',
          }}
        >
          Incluye el traslado de Santiago hasta tu dirección.
        </p>
      )}
    </div>
  )
}
