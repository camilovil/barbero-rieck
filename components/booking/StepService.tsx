'use client'

import { SERVICES } from '@/lib/constants'
import type { Location, Service } from '@/types/booking'

/* Número de camiseta asignado a cada servicio */
const JERSEY_NO: Record<string, string> = {
  'Corte':       '7',
  'Corte y barba': '10',
}

interface Props {
  location: Location
  selected: Service | null
  onSelect: (s: Service) => void
}

export default function StepService({ location, selected, onSelect }: Props) {
  const services = SERVICES[location]

  return (
    <div className="step-enter">
      <div style={{ fontFamily: 'var(--font-anton, "Anton"), sans-serif', fontSize: 25, letterSpacing: '.3px', margin: '0 0 3px', color: 'var(--text)' }}>
        ¿Qué te hacés?
      </div>
      <p style={{ fontSize: 12.5, color: 'var(--text-mut)', fontWeight: 600, margin: '0 0 18px' }}>
        {location === 'domicilio' ? 'A domicilio — incluye traslado de Santiago' : 'Elegí tu jugada'}
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 18 }}>
        {services.map((svc) => {
          const isSelected = selected?.name === svc.name && selected?.price === svc.price
          const jerseyNo = JERSEY_NO[svc.name] ?? '★'
          const priceLabel = svc.priceLabel ?? `$${svc.price.toLocaleString('es-AR')}`

          return (
            <div
              key={svc.name}
              className={`opt-card${isSelected ? ' selected' : ''}`}
              onClick={() => onSelect(svc)}
              style={{ padding: '16px 8px 14px', textAlign: 'center' }}
            >
              {/* Número de camiseta */}
              <div style={{
                fontFamily: 'var(--font-anton, "Anton"), sans-serif',
                fontSize: 30, lineHeight: .9,
                color: isSelected ? 'var(--gold)' : 'var(--celeste)',
                WebkitTextStroke: `1.5px var(--stroke)`,
                marginBottom: 7,
                transition: 'color .18s',
              }}>
                {jerseyNo}
              </div>
              <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--text)' }}>{svc.name}</div>
              <div style={{
                fontFamily: 'var(--font-anton, "Anton"), sans-serif',
                fontSize: 19, color: 'var(--text)', margin: '4px 0 2px',
              }}>{priceLabel}</div>
              <div style={{ fontSize: 10, color: 'var(--text-mut)', fontWeight: 800, letterSpacing: '.5px' }}>
                {svc.duration} MIN
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
