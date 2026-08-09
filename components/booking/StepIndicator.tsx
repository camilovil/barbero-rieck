'use client'

/* Cinco segmentos de 2px y el contador en mono. Sin círculos
   numerados: el paso se lee en el titular, no en el indicador.

   El «volver» NO vive acá. Antes había uno arriba y otro en el pie,
   los dos como texto suelto: dos controles para la misma acción y
   ninguno con cara de botón. Quedó uno solo, abajo, junto al CTA. */

const STEPS = ['Lugar', 'Servicio', 'Horario', 'Datos', 'Resumen']

export default function StepIndicator({ current }: { current: number }) {
  const total = STEPS.length

  return (
    <div className="flow-head" style={{ marginBottom: 26 }}>
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        gap: 12, marginBottom: 14,
      }}>
        <span className="rotulo" style={{ letterSpacing: '.14em', color: 'var(--text)' }}>
          {STEPS[current - 1]}
        </span>
        <span className="rotulo" style={{ letterSpacing: '.14em', flexShrink: 0 }}>
          Paso {current} / {total}
        </span>
      </div>

      <div
        className="stepbar"
        role="progressbar"
        aria-valuenow={current}
        aria-valuemin={1}
        aria-valuemax={total}
        aria-valuetext={`Paso ${current} de ${total}: ${STEPS[current - 1]}`}
      >
        {STEPS.map((label, i) => (
          <i key={label} className={i < current ? 'on' : undefined} />
        ))}
      </div>
    </div>
  )
}
