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
      <h2 className="font-playfair text-2xl sm:text-3xl text-[#f5f0e8] mb-2">¿Qué servicio querés?</h2>
      <p className="text-[#f5f0e8]/50 text-sm mb-8">
        {location === 'domicilio' ? 'Precios a domicilio' : 'Precios en el local'}
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {services.map((svc) => {
          const isSelected = selected?.name === svc.name && selected?.price === svc.price
          return (
            <button
              key={svc.name}
              onClick={() => onSelect(svc)}
              className={`
                relative text-left p-5 rounded-xl border transition-all duration-200
                ${isSelected
                  ? 'border-[#f5f0e8]/40 bg-[#2e2e2e]'
                  : 'border-[#3a3a3a] bg-[#222222] hover:border-[#f5f0e8]/20 hover:bg-[#272727]'
                }
              `}
            >
              {isSelected && (
                <span className="absolute top-3 right-3 w-5 h-5 rounded-full bg-[#f5f0e8] flex items-center justify-center">
                  <svg className="w-3 h-3 text-[#1a1a1a]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </span>
              )}
              <p className="font-playfair text-xl text-[#f5f0e8] mb-3">{svc.name}</p>
              <p className="text-2xl font-semibold text-[#f5f0e8]">
                ${svc.price.toLocaleString('es-AR')}
              </p>
              <p className="text-[#f5f0e8]/40 text-xs mt-1">{svc.duration} min</p>
            </button>
          )
        })}
      </div>
    </div>
  )
}
