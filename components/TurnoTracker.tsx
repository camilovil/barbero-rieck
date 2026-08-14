/* Los tres estados por los que pasa un turno con seña, dibujados como los
   pasos del flujo: rótulo en mono, segmentos de 2px, sin círculos numerados
   ni íconos. El sistema no usa emoji y el oro nunca es lo único que informa,
   así que el estado va escrito además de marcado.

   Sirve igual para un turno sin seña: ahí nace confirmado y el recorrido se
   muestra completo de una.

   Va en los tres lugares donde se mira un turno: la vuelta del pago, la vista
   del cliente y el detalle del panel. Ese último lo pide compacto. */

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

interface Props {
  estado: EstadoTurno
  /* La frase de abajo, cuando el lugar donde se muestra necesita decir
     otra cosa. Al cliente le importa qué le falta hacer; a Santiago, el
     dato operativo —que el horario se suelta solo—. Sin esto, el panel
     tendría que repetir el mismo renglón en otro lado. */
  nota?: string
  /* Misma pieza con menos aire, para cuando vive dentro de una columna
     de trabajo y no en una pantalla propia. Cambia el espaciado, nunca
     la tipografía ni la grilla (regla 04). */
  compacto?: boolean
}

export default function TurnoTracker({ estado, nota, compacto = false }: Props) {
  const actual = PASOS.findIndex(p => p.key === estado)
  const dicho = nota ?? DICHO[estado]

  return (
    <div style={{ margin: compacto ? '0 0 18px' : '22px 0 0' }}>
      <div
        style={{
          display: 'flex', alignItems: 'baseline', justifyContent: 'space-between',
          gap: 12, marginBottom: compacto ? 8 : 10,
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
        aria-valuetext={`${PASOS[actual]?.label}: ${dicho}`}
      >
        {PASOS.map((p, i) => (
          <i key={p.key} className={i <= actual ? 'on' : undefined} />
        ))}
      </div>

      <p
        className="mono"
        style={{
          fontSize: 10.5, letterSpacing: '.06em', color: 'var(--text-meta)',
          margin: compacto ? '8px 0 0' : '10px 0 0',
        }}
      >
        {dicho.toUpperCase()}
      </p>
    </div>
  )
}
