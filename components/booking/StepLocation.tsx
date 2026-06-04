'use client'

import type { Location } from '@/types/booking'

const OPTIONS: { value: Location; label: string; sublabel: string; icon: string }[] = [
  {
    value: 'local',
    label: 'Barbería Rieck',
    sublabel: 'Av. Corrientes 1234, CABA',
    icon: '✂️',
  },
  {
    value: 'domicilio',
    label: 'A domicilio',
    sublabel: 'Santiago va hasta vos',
    icon: '🏠',
  },
]

interface Props {
  selected: Location | null
  onSelect: (loc: Location) => void
}

export default function StepLocation({ selected, onSelect }: Props) {
  return (
    <div>
      <h2 className="font-playfair text-2xl sm:text-3xl text-[#f5f0e8] mb-2">¿Dónde querés el turno?</h2>
      <p className="text-[#f5f0e8]/50 text-sm mb-8">Elegí la modalidad que más te convenga</p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {OPTIONS.map((opt) => {
          const isSelected = selected === opt.value
          return (
            <button
              key={opt.value}
              onClick={() => onSelect(opt.value)}
              className={`
                relative text-left p-6 rounded-xl border transition-all duration-200 cursor-pointer
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
              <span className="text-3xl mb-4 block">{opt.icon}</span>
              <p className="font-semibold text-[#f5f0e8] text-lg leading-tight">{opt.label}</p>
              <p className="text-[#f5f0e8]/50 text-sm mt-1">{opt.sublabel}</p>
            </button>
          )
        })}
      </div>
    </div>
  )
}
