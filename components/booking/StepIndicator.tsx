'use client'

const STEPS = ['Ubicación', 'Servicio', 'Horario', 'Datos', 'Resumen']

export default function StepIndicator({ current }: { current: number }) {
  return (
    <div className="flex items-center justify-center gap-0 mb-8">
      {STEPS.map((label, i) => {
        const idx = i + 1
        const isCompleted = idx < current
        const isActive = idx === current

        return (
          <div key={label} className="flex items-center">
            <div className="flex flex-col items-center">
              <div
                className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold transition-all"
                style={
                  isCompleted
                    ? { background: 'var(--text)', color: 'var(--bg)' }
                    : isActive
                    ? { background: 'var(--bg-active)', color: 'var(--text)', boxShadow: '0 0 0 2px var(--border-2)' }
                    : { background: 'var(--bg-active)', color: 'var(--text-faint)', opacity: 0.5 }
                }
              >
                {isCompleted ? (
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                ) : idx}
              </div>
              <span
                className="mt-1 text-[10px] tracking-wide uppercase hidden sm:block transition-all"
                style={{ color: isActive ? 'var(--text)' : 'var(--text-faint)' }}
              >
                {label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div
                className="w-8 sm:w-12 h-px mx-1 mb-4 sm:mb-5 transition-all"
                style={{ background: isCompleted ? 'var(--text-muted)' : 'var(--border-2)' }}
              />
            )}
          </div>
        )
      })}
    </div>
  )
}
