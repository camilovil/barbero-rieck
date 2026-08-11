'use client'

import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import AppHeader from '@/components/AppHeader'
import TurnoTracker from '@/components/TurnoTracker'
import { DEPOSIT_HOLD_MINUTES } from '@/lib/constants'

type Estado = 'consultando' | 'pagado' | 'vencido' | 'demorado' | 'rechazado' | 'error'

const HEADER_H = 72

/* Estado sin ilustración: un rótulo mono, un titular en display
   y el texto. El sistema no usa íconos ni emoji. */
function Estado_({ rotulo, titulo, children }: { rotulo: string; titulo: string; children?: React.ReactNode }) {
  return (
    <div>
      <div className="rotulo">{rotulo}</div>
      <h2
        className="font-display"
        style={{
          fontSize: 'clamp(30px, 9vw, 38px)', fontWeight: 800, lineHeight: 1,
          letterSpacing: '-.04em', color: 'var(--text)', margin: '14px 0 0',
        }}
      >
        {titulo}
      </h2>
      {children && (
        <div style={{ fontSize: 13, lineHeight: 1.6, color: 'var(--text-mut)', marginTop: 14 }}>
          {children}
        </div>
      )}
    </div>
  )
}

export default function PagoClient() {
  const params = useSearchParams()
  const turno = params.get('turno')
  const rechazado = params.get('estado') === 'rechazado'

  const [estado, setEstado] = useState<Estado>(rechazado ? 'rechazado' : 'consultando')

  /* Que Mercado Pago nos devuelva al sitio no significa que la plata haya
     entrado: el aviso bueno llega por el webhook y puede tardar unos segundos
     más que el navegador. Por eso preguntamos por el turno hasta que quede
     resuelto, en vez de creerle al parámetro de la URL. */
  useEffect(() => {
    if (rechazado) return
    if (!turno) { setEstado('error'); return }

    let vivo = true
    let intentos = 0
    let timer: ReturnType<typeof setTimeout>

    async function mirar(): Promise<boolean> {
      try {
        const res = await fetch(`/api/pagos/estado?turno=${encodeURIComponent(turno!)}`)
        const data = await res.json()
        if (!vivo) return true
        if (data.estado === 'pagado' || data.estado === 'vencido') {
          setEstado(data.estado)
          return true
        }
        if (++intentos >= 8) { setEstado('demorado'); return true }
        return false
      } catch {
        if (vivo) setEstado('error')
        return true
      }
    }

    const loop = async () => {
      const listo = await mirar()
      if (!listo && vivo) timer = setTimeout(loop, 2500)
    }
    loop()

    return () => { vivo = false; clearTimeout(timer) }
  }, [turno, rechazado])

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--app-bg)' }}>
      <AppHeader />

      <main className="flex-1 px-4 sm:px-6 pb-14" style={{ paddingTop: `calc(env(safe-area-inset-top) + ${HEADER_H + 32}px)` }}>
        <div className="max-w-md mx-auto">
          <div style={{
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            padding: '26px 20px 24px',
          }}>

            {estado === 'consultando' && (
              <div className="rotulo" style={{ padding: '40px 0', textAlign: 'center', lineHeight: 1.8 }}>
                Confirmando el pago…
              </div>
            )}

            {estado === 'pagado' && (
              <div>
                <Estado_ rotulo="Listo" titulo="Turno confirmado">
                  La seña entró y el turno quedó tomado. Te mandamos el mail con los datos,
                  el link para cancelar y el saldo que se paga en el lugar.
                </Estado_>
                <TurnoTracker estado="confirmado" />
                <a href="/" className="btn-cta" style={{ textDecoration: 'none', width: '100%', marginTop: 26 }}>
                  Volver al inicio
                </a>
              </div>
            )}

            {estado === 'demorado' && (
              <Estado_ rotulo="En camino" titulo="Estamos confirmando">
                Mercado Pago todavía no nos avisó del pago. Si ya lo hiciste, en un rato
                te llega el mail de confirmación — no hace falta pagar de nuevo.
                <TurnoTracker estado="pendiente" />
                <br />
                <button
                  onClick={() => window.location.reload()}
                  className="btn-outline"
                  style={{ width: '100%' }}
                >
                  Volver a consultar
                </button>
              </Estado_>
            )}

            {estado === 'rechazado' && (
              <div>
                <Estado_ rotulo="Sin pago" titulo="No se completó">
                  El pago no se pudo hacer, así que el turno no quedó confirmado.
                  Podés intentarlo de nuevo eligiendo el horario otra vez.
                </Estado_>
                <a href="/" className="btn-cta" style={{ textDecoration: 'none', width: '100%', marginTop: 26 }}>
                  Reservar de nuevo
                </a>
              </div>
            )}

            {estado === 'vencido' && (
              <div>
                <Estado_ rotulo="Sin resultado" titulo="La reserva venció">
                  Pasaron los {DEPOSIT_HOLD_MINUTES} minutos que guardamos el horario sin la seña,
                  y volvió a quedar disponible. Si llegaste a pagar, escribile a Santiago.
                </Estado_>
                <a href="/" className="btn-cta" style={{ textDecoration: 'none', width: '100%', marginTop: 26 }}>
                  Reservar de nuevo
                </a>
              </div>
            )}

            {estado === 'error' && (
              <Estado_ rotulo="Error" titulo="Algo salió mal">
                No pudimos consultar el estado del turno. Si pagaste, revisá tu mail:
                la confirmación llega igual.
              </Estado_>
            )}

          </div>
        </div>
      </main>
    </div>
  )
}
