'use client'

import { LOCATION_LABELS } from '@/lib/constants'
import type { Location } from '@/types/booking'

const OPTIONS: { value: Location; label: string; sublabel: string; note: string }[] = [
  {
    value: 'local',
    label: LOCATION_LABELS.local,
    sublabel: 'Congreso 1865, Belgrano',
    note: 'CABA',
  },
  {
    value: 'domicilio',
    label: 'A domicilio',
    sublabel: 'Santiago va hasta vos',
    note: 'CABA Y GBA',
  },
]

interface Props {
  selected: Location | null
  onSelect: (loc: Location) => void
}

export default function StepLocation({ selected, onSelect }: Props) {
  return (
    <div className="step-enter">
      <div className="h-step lineas"><span>Reservá</span><span>tu turno</span></div>
      <p className="sub-step">Elegí dónde te atendés.</p>

      {/* Lista a sangre: la fila elegida se invierte en tinta plena */}
      <div className="opt-list">
        {OPTIONS.map((opt) => {
          const on = selected === opt.value
          return (
            <button
              key={opt.value}
              type="button"
              aria-pressed={on}
              aria-label={`${opt.label} — ${opt.sublabel}`}
              className={`opt-row${on ? ' selected' : ''}`}
              onClick={() => onSelect(opt.value)}
            >
              <span className="opt-mark" aria-hidden>
                <svg viewBox="0 0 24 24" width={11} height={11} fill="none" stroke="currentColor"
                  strokeWidth={3.4} strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </span>
              <span style={{ flex: 1, minWidth: 0 }}>
                <span className="opt-row-title" style={{ display: 'block' }}>{opt.label}</span>
                <span className="opt-row-sub" style={{ display: 'block' }}>{opt.sublabel}</span>
              </span>
              <span className="opt-row-price" style={{ fontSize: 11 }}>{opt.note}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
