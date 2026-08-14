'use client'

import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import AppHeader from '@/components/AppHeader'
import { CANCELLATION_MIN_HOURS } from '@/lib/constants'
import Link from 'next/link'

type Estado = 'cargando' | 'listo' | 'confirmando' | 'cancelado' | 'error' | 'nopuede' | 'notfound'

interface TurnoInfo {
  nombre: string
  servicio: string
  fecha: string
  hora: string
  horasRestantes: number
  puedeCancel: boolean
}

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

export default function CancelarClient() {
  const params = useSearchParams()
  const eventId = params.get('id')
  const email = params.get('email')

  const [estado, setEstado] = useState<Estado>('cargando')
  const [turno, setTurno] = useState<TurnoInfo | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!eventId || !email) { setEstado('error'); setError('Link inválido'); return }
    fetch(`/api/cancelar?id=${eventId}&email=${encodeURIComponent(email)}`)
      .then(r => r.json())
      .then(data => {
        if (data.error) {
          if (data.error.includes('no encontrado')) setEstado('notfound')
          else { setEstado('error'); setError(data.error) }
          return
        }
        setTurno(data)
        setEstado(data.puedeCancel ? 'listo' : 'nopuede')
      })
      .catch(() => { setEstado('error'); setError('No pudimos verificar el turno') })
  }, [eventId, email])

  async function handleCancel() {
    setEstado('confirmando')
    const res = await fetch('/api/cancelar', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ eventId, email }),
    })
    const data = await res.json()
    if (data.success) setEstado('cancelado')
    else { setEstado('error'); setError(data.error ?? 'Error al cancelar') }
  }

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

            {estado === 'cargando' && (
              <div className="rotulo" style={{ padding: '40px 0', textAlign: 'center', lineHeight: 1.8 }}>
                Verificando turno…
              </div>
            )}

            {estado === 'notfound' && (
              <Estado_ rotulo="Sin resultado" titulo="Turno no encontrado">
                Este turno ya fue cancelado o no existe.
              </Estado_>
            )}

            {estado === 'error' && (
              <Estado_ rotulo="Error" titulo="Algo salió mal">
                {error}
              </Estado_>
            )}

            {estado === 'nopuede' && turno && (
              <Estado_ rotulo="Fuera de plazo" titulo="Ya no se puede cancelar">
                Se puede cancelar con al menos {CANCELLATION_MIN_HOURS} horas de anticipación.
                Tu turno es el{' '}
                <strong style={{ color: 'var(--text)', fontWeight: 600 }}>
                  {turno.fecha} a las {turno.hora}
                </strong>.
                <br /><br />
                Para cancelar igual, escribile a Santiago por WhatsApp.
              </Estado_>
            )}

            {(estado === 'listo' || estado === 'confirmando') && turno && (
              <div>
                <Estado_ rotulo="Cancelación" titulo="Cancelar turno">
                  Vas a cancelar el siguiente turno. La acción no se puede deshacer.
                </Estado_>

                <div style={{ margin: '24px 0 22px' }}>
                  {([
                    ['Nombre', turno.nombre, false],
                    ['Servicio', turno.servicio, false],
                    ['Fecha', turno.fecha, false],
                    ['Horario', turno.hora, true],
                  ] as [string, string, boolean][]).map(([label, value, mono]) => (
                    <div key={label} className="kv">
                      <span className="kv-k">{label}</span>
                      <span className={`kv-v${mono ? ' mono' : ''}`}>{value}</span>
                    </div>
                  ))}
                </div>

                <button
                  onClick={handleCancel}
                  disabled={estado === 'confirmando'}
                  className="btn-cta"
                  style={{ width: '100%', marginBottom: 14 }}
                >
                  {estado === 'confirmando' ? 'Cancelando…' : 'Confirmar cancelación'}
                </button>

                <p className="mono" style={{ fontSize: 10.5, letterSpacing: '.06em', color: 'var(--text-meta)', textAlign: 'center', margin: 0 }}>
                  TE LLEGA UN MAIL DE CONFIRMACIÓN
                </p>
              </div>
            )}

            {estado === 'cancelado' && (
              <div>
                <Estado_ rotulo="Listo" titulo="Turno cancelado">
                  Te mandamos un mail de confirmación. El horario quedó libre para otros clientes.
                </Estado_>
                <Link href="/reservar" className="btn-cta" style={{ textDecoration: 'none', width: '100%', marginTop: 26 }}>
                  Reservar otro turno
                </Link>
              </div>
            )}

          </div>
        </div>
      </main>
    </div>
  )
}
