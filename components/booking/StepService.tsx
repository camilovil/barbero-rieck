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
    <div>
      <h2 className="font-playfair text-2xl sm:text-3xl mb-2" style={{color:'var(--text)'}}>¿Qué servicio querés?</h2>
      <p className="text-sm mb-8" style={{color:'var(--text-muted)'}}>
        {location === 'domicilio' ? 'Precios a domicilio' : 'Precios en el local'}
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {services.map((svc) => {
          const isSelected = selected?.name === svc.name && selected?.price === svc.price
          return (
            <button
              key={svc.name}
              onClick={() => onSelect(svc)}
              className="relative text-left p-5 rounded-xl border transition-all duration-200 cursor-pointer"
              style={{
                background: isSelected ? 'var(--bg-active)' : 'var(--bg-card)',
                borderColor: isSelected ? 'var(--text-muted)' : 'var(--border-2)',
              }}
            >
              {isSelected && (
                <span className="absolute top-3 right-3 w-5 h-5 rounded-full flex items-center justify-center"
                  style={{background:'var(--text)'}}>
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}
                    style={{color:'var(--bg)'}}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </span>
              )}
              <p className="font-playfair text-xl mb-3" style={{color:'var(--text)'}}>{svc.name}</p>
              <p className="text-2xl font-semibold" style={{color:'var(--text)'}}>
                {svc.priceLabel ?? `$${svc.price.toLocaleString('es-AR')}`}
              </p>
              <p className="text-xs mt-1" style={{color:'var(--text-faint)'}}>{svc.duration} min</p>
            </button>
          )
        })}
      </div>
    </div>
  )
}
