import { BARBER_ADDRESS, BARBER_NAME, INSTAGRAM_HANDLE, INSTAGRAM_URL, TIME_SLOTS } from '@/lib/constants'

/* Los horarios que se muestran salen de la misma fuente que la
   grilla del paso 3: si cambian los turnos, cambia el pie. */
function range(slots: string[]): string {
  return `${slots[0]} – ${slots[slots.length - 1]}`
}

/* Datos de la casa — referencia, no tarea. Vive abajo del pliegue a
   propósito: se consulta, no se usa para reservar. Lo comparten la
   portada y la pantalla de reserva, que son las dos puertas de
   entrada; el `id` es a donde apunta «La casa» de la barra. */
export default function PieDeLaCasa() {
  return (
    <footer id="la-casa" className="px-4 sm:px-6" style={{ paddingTop: 40, paddingBottom: 40 }}>
      <div className="max-w-2xl mx-auto">
        <h2 className="rotulo rotulo-rule">La casa</h2>
        <div className="kv">
          <span className="kv-k">Lun – Sáb · local</span>
          <span className="kv-v mono">{range(TIME_SLOTS.local)}</span>
        </div>
        <div className="kv">
          <span className="kv-k">Lun – Sáb · a domicilio</span>
          <span className="kv-v mono">{range(TIME_SLOTS.domicilio)}</span>
        </div>
        <div className="kv">
          <span className="kv-k">Domingos</span>
          <span className="kv-v mono">CERRADO</span>
        </div>
        <div className="kv">
          <span className="kv-k">Dirección</span>
          <span className="kv-v">{BARBER_ADDRESS}</span>
        </div>
        <div className="kv" style={{ borderBottom: 'none' }}>
          <span className="kv-k">Instagram</span>
          <a
            href={INSTAGRAM_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-ghost mono"
            aria-label={`Instagram de Barber Höhle, ${INSTAGRAM_HANDLE}, se abre en una pestaña nueva`}
            style={{
              fontSize: 12.5, color: 'var(--text)',
              minHeight: 44, display: 'inline-flex', alignItems: 'center',
            }}
          >
            {INSTAGRAM_HANDLE}
          </a>
        </div>

        <div className="trama" style={{ height: 44, marginTop: 30 }} aria-hidden />

        <div
          style={{
            display: 'flex', alignItems: 'baseline', justifyContent: 'space-between',
            gap: 16, flexWrap: 'wrap', marginTop: 26,
          }}
        >
          <span className="rotulo">© {new Date().getFullYear()} {BARBER_NAME}</span>
          <span className="rotulo" style={{ color: 'var(--text-meta)' }}>
            Desarrollado por Camilo Villanueva
          </span>
        </div>
      </div>
    </footer>
  )
}
