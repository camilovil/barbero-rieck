/* Los tres estados por los que pasa un turno con seña, dibujados como los
   pasos del flujo: rótulo en mono, segmentos de 2px, sin círculos numerados
   ni íconos. El sistema no usa emoji y el oro nunca es lo único que informa,
   así que el estado va escrito además de marcado.

   Sirve igual para un turno sin seña: ahí nace confirmado y el recorrido se
   muestra completo de una. */

export type EstadoTurno = 'reservado' | 'pendiente' | 'confirmado'

const PASOS: { key: EstadoTurno; label: string }[] = [
  { key: 'reservado', label: 'Reservado' },
  { key: 'pendiente', label: 'Pago pendiente' },
  { key: 'confirmado', label: 'Confirmado' },
]

const DICHO: Record<EstadoTurno, string> = {
  reservado: 'Te guardamos el horario',
  pendiente: 'Falta que entre la seña',
  confirmado: 'El turno está cerrado',
}

export default function TurnoTracker({ estado }: { estado: EstadoTurno }) {
  const actual = PASOS.findIndex(p => p.key === estado)

  return (
    <div style={{ margin: '22px 0 0' }}>
      <div
        style={{
          display: 'flex', alignItems: 'baseline', justifyContent: 'space-between',
          gap: 12, marginBottom: 10,
        }}
      >
        <span className="rotulo" style={{ letterSpacing: '.14em', color: 'var(--text)' }}>
          {PASOS[actual]?.label ?? '—'}
        </span>
        <span className="rotulo" style={{ letterSpacing: '.14em', flexShrink: 0 }}>
          {actual + 1} / {PASOS.length}
        </span>
      </div>

      <div
        className="stepbar"
        role="progressbar"
        aria-valuenow={actual + 1}
        aria-valuemin={1}
        aria-valuemax={PASOS.length}
        aria-valuetext={`${PASOS[actual]?.label}: ${DICHO[estado]}`}
      >
        {PASOS.map((p, i) => (
          <i key={p.key} className={i <= actual ? 'on' : undefined} />
        ))}
      </div>

      <p
        className="mono"
        style={{ fontSize: 10.5, letterSpacing: '.06em', color: 'var(--text-meta)', margin: '10px 0 0' }}
      >
        {DICHO[estado].toUpperCase()}
      </p>
    </div>
  )
}
