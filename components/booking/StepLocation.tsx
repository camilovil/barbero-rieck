'use client'

import Image from 'next/image'
import type { Location } from '@/types/booking'

const OPTIONS: { value: Location; label: string; sublabel: string; img: string }[] = [
  {
    value: 'local',
    label: 'Barbería Rieck',
    sublabel: 'En el local con Santiago',
    img: '/sillon-transparente.png',
  },
  {
    value: 'domicilio',
    label: 'A domicilio',
    sublabel: 'Santiago va hasta vos',
    img: '/pin-tijera-transparente.png',
  },
]

interface Props {
  selected: Location | null
  onSelect: (loc: Location) => void
}

export default function StepLocation({ selected, onSelect }: Props) {
  return (
    <div>
      <h2 className="font-playfair text-2xl sm:text-3xl text-[#f5f0e8] dark:text-[#f5f0e8] mb-2">¿Dónde querés el turno?</h2>
      <p className="text-[#f5f0e8]/50 text-sm mb-8">Elegí la modalidad que más te convenga</p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {OPTIONS.map((opt) => {
          const isSelected = selected === opt.value
          return (
            <button
              key={opt.value}
              onClick={() => onSelect(opt.value)}
              className={`
                relative text-left rounded-xl border transition-all duration-200 cursor-pointer overflow-hidden
                ${isSelected
                  ? 'border-[#f5f0e8]/40 bg-[#2e2e2e]'
                  : 'border-[#3a3a3a] bg-[#222222] hover:border-[#f5f0e8]/20 hover:bg-[#272727]'
                }
              `}
            >
              {isSelected && (
                <span className="absolute top-3 right-3 z-10 w-5 h-5 rounded-full bg-[#f5f0e8] flex items-center justify-center">
                  <svg className="w-3 h-3 text-[#1a1a1a]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </span>
              )}
              {/* Image */}
              <div className="relative w-full h-36 flex items-center justify-center">
                <Image
                  src={opt.img}
                  alt={opt.label}
                  fill
                  className="object-contain p-4"
                />
              </div>
              {/* Text */}
              <div className="px-5 pb-5">
                <p className="font-semibold text-[#f5f0e8] text-lg leading-tight">{opt.label}</p>
                <p className="text-[#f5f0e8]/50 text-sm mt-1">{opt.sublabel}</p>
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
