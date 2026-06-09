'use client'

const STEPS = ['Lugar', 'Servicio', 'Horario', 'Datos', 'Resumen']

export default function StepIndicator({ current }: { current: number }) {
  return (
    <div
      style={{
        display: 'flex', alignItems: 'flex-start',
        padding: '14px 4px 10px',
        borderBottom: '2px solid var(--border-soft)',
        marginBottom: '20px',
      }}
    >
      {STEPS.map((label, i) => {
        const idx = i + 1
        const isCompleted = idx < current
        const isActive = idx === current

        return (
          <div key={label} style={{ display: 'flex', alignItems: 'flex-start', flex: idx < STEPS.length ? 1 : 'none' }}>
            {/* Step dot + label */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5 }}>
              <div
                style={{
                  width: 30, height: 30, borderRadius: '50%',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontFamily: 'var(--font-anton, "Anton"), sans-serif',
                  fontSize: 14, transition: 'all .25s',
                  ...(isCompleted
                    ? { background: 'var(--celeste-deep)', borderColor: 'var(--celeste-deep)', color: '#fff', border: '2.5px solid var(--celeste-deep)' }
                    : isActive
                    ? { background: 'var(--celeste)', borderColor: 'var(--celeste)', color: '#fff', border: '2.5px solid var(--celeste)', boxShadow: '0 4px 12px rgba(63,134,196,.4)' }
                    : { background: 'var(--surface)', borderColor: 'var(--off)', color: 'var(--off)', border: '2.5px solid var(--off)' }
                  ),
                }}
              >
                {isCompleted ? (
                  <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                ) : idx}
              </div>
              <span
                style={{
                  fontSize: '8.5px', fontWeight: 800, letterSpacing: '.4px',
                  textTransform: 'uppercase', textAlign: 'center',
                  color: isActive ? 'var(--celeste-deep)' : isCompleted ? 'var(--celeste-deep)' : 'var(--text-mut)',
                }}
              >
                {label}
              </span>
            </div>

            {/* Connector */}
            {idx < STEPS.length && (
              <div style={{
                flex: 1, height: 3, margin: '13px 2px 0',
                borderRadius: 2,
                background: isCompleted ? 'var(--celeste-deep)' : 'var(--border-soft)',
                transition: 'background .25s',
              }} />
            )}
          </div>
        )
      })}
    </div>
  )
}
