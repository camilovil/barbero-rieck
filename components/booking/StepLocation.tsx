'use client'

import type { Location } from '@/types/booking'

const OPTIONS: { value: Location; label: string; sublabel: string }[] = [
  { value: 'local',     label: 'Barbería Rieck', sublabel: 'Congreso 1865, Belgrano' },
  { value: 'domicilio', label: 'A domicilio',    sublabel: 'Santiago va hasta vos' },
]

/* SVG inline para cada opción */
function IconShop() {
  return (
    <svg viewBox="0 0 24 24" width={26} height={26} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9l1-5h16l1 5"/><path d="M4 9v11h16V9"/><path d="M9 20v-6h6v6"/>
    </svg>
  )
}
function IconScooter() {
  return (
    <svg viewBox="0 0 24 24" width={26} height={26} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="6" cy="17" r="2.5"/><circle cx="17" cy="17" r="2.5"/>
      <path d="M8.5 17h6M17 14.5V9h-3"/><path d="M5 13l1.5-5H11l2 4"/>
    </svg>
  )
}

interface Props {
  selected: Location | null
  onSelect: (loc: Location) => void
}

export default function StepLocation({ selected, onSelect }: Props) {
  return (
    <div className="step-enter">
      <div style={{ fontFamily: 'var(--font-anton, "Anton"), sans-serif', fontSize: 25, letterSpacing: '.3px', margin: '0 0 3px', color: 'var(--text)' }}>
        ¿Dónde te atendés?
      </div>
      <p style={{ fontSize: 12.5, color: 'var(--text-mut)', fontWeight: 600, margin: '0 0 18px' }}>
        Elegí la modalidad que más te convenga
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 18 }}>
        {OPTIONS.map((opt) => {
          const isSelected = selected === opt.value
          return (
            <div
              key={opt.value}
              className={`opt-card${isSelected ? ' selected' : ''}`}
              onClick={() => onSelect(opt.value)}
              style={{ padding: '15px 14px' }}
            >
              {/* Chip de ícono */}
              <div style={{
                width: 46, height: 46, borderRadius: 13,
                background: 'var(--chip-bg)', border: '2px solid var(--celeste)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                marginBottom: 11, color: 'var(--celeste-deep)',
              }}>
                {opt.value === 'local' ? <IconShop /> : <IconScooter />}
              </div>
              <b style={{ display: 'block', fontSize: 15, color: 'var(--text)', marginBottom: 2, fontWeight: 800 }}>
                {opt.label}
              </b>
              <span style={{ fontSize: 11.5, color: 'var(--text-mut)', fontWeight: 600, lineHeight: 1.3 }}>
                {opt.sublabel}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
