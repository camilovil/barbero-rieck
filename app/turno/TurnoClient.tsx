'use client'

import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import AppHeader from '@/components/AppHeader'
import TurnoTracker, { type EstadoTurno } from '@/components/TurnoTracker'
import { BARBER_ADDRESS, CANCELLATION_MIN_HOURS, LOCATION_LABELS } from '@/lib/constants'
import { capitalize as upperFirst, fechaLarga, hhmm, diaCorto } from '@/lib/format'

interface Turno {
  nombre: string
  servicio: string
  precio: number
  viatico: number
  viaticoAConvenir: boolean
  esDomicilio: boolean
  direccion: string
  start: string
  end: string
  pago: 'pendiente' | 'pagado' | null
  puedeCancel: boolean
  pasado: boolean
}

const HEADER_H = 72

function Row({ k, v, mono }: { k: string; v: string; mono?: boolean }) {
  return (
    <div className="kv">
      <span className="kv-k">{k}</span>
      <span className={`kv-v${mono ? ' mono' : ''}`}>{v}</span>
    </div>
  )
}

export default function TurnoClient() {
  const params = useSearchParams()
  const id = params.get('id')
  const email = params.get('email')

  const [turno, setTurno] = useState<Turno | null>(null)
  const [error, setError] = useState('')
  const [cargando, setCargando] = useState(true)

  useEffect(() => {
    if (!id || !email) { setError('El link está incompleto.'); setCargando(false); return }
    fetch(`/api/turno?id=${encodeURIComponent(id)}&email=${encodeURIComponent(email)}`)
      .then(r => r.json())
      .then(data => {
        if (data.error) setError(data.error)
        else setTurno(data)
      })
      .catch(() => setError('No pudimos buscar tu turno.'))
      .finally(() => setCargando(false))
  }, [id, email])

  /* Sin seña el turno nace cerrado: no hay recorrido que mostrar a medias. */
  const estado: EstadoTurno =
    turno?.pago === 'pendiente' ? 'pendiente' : 'confirmado'

  const plata = (n: number) => `$${n.toLocaleString('es-AR')}`
  const total = (turno?.precio ?? 0) + (turno?.viatico ?? 0)

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--app-bg)' }}>
      <AppHeader />

      <main className="flex-1 px-4 sm:px-6 pb-14" style={{ paddingTop: `calc(env(safe-area-inset-top) + ${HEADER_H + 32}px)` }}>
        <div className="max-w-md mx-auto">
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', padding: '26px 20px 24px' }}>

            {cargando && (
              <div className="rotulo" style={{ padding: '40px 0', textAlign: 'center', lineHeight: 1.8 }}>
                Buscando tu turno…
              </div>
            )}

            {!cargando && error && (
              <div>
                <div className="rotulo">Sin resultado</div>
                <h2
                  className="font-display"
                  style={{
                    fontSize: 'clamp(30px, 9vw, 38px)', fontWeight: 800, lineHeight: 1,
                    letterSpacing: '-.04em', color: 'var(--text)', margin: '14px 0 0',
                  }}
                >
                  No encontramos tu turno
                </h2>
                <p style={{ fontSize: 13, lineHeight: 1.6, color: 'var(--text-mut)', marginTop: 14 }}>
                  {error} Puede que se haya cancelado, o que la reserva se haya
                  vencido sin la seña.
                </p>
                <a href="/reservar" className="btn-cta" style={{ textDecoration: 'none', width: '100%', marginTop: 26 }}>
                  Reservar un turno
                </a>
              </div>
            )}

            {!cargando && turno && (
              <div>
                <div className="rotulo">{turno.pasado ? 'Turno pasado' : 'Tu turno'}</div>

                {/* El turno, en display: es el dato que se vino a buscar. */}
                <div
                  className="font-display lineas"
                  style={{
                    fontSize: 'clamp(34px, 10vw, 42px)', fontWeight: 800, lineHeight: .95,
                    letterSpacing: '-.045em', color: 'var(--text)',
                    padding: '14px 0', borderBottom: '1px solid var(--text)', marginTop: 4,
                  }}
                >
                  <span>{diaCorto(new Date(turno.start))}</span>
                  <span className="mono" style={{ fontWeight: 500, letterSpacing: '-.02em' }}>
                    {hhmm(turno.start)}
                  </span>
                </div>

                {!turno.pasado && <TurnoTracker estado={estado} />}

                <div style={{ marginTop: 22 }}>
                  <Row k="A nombre de" v={turno.nombre || '—'} />
                  <Row k="Fecha" v={upperFirst(fechaLarga(turno.start))} />
                  <Row k="Servicio" v={turno.servicio || '—'} />
                  <Row
                    k="Dónde"
                    v={turno.esDomicilio
                      ? `${LOCATION_LABELS.domicilio} · ${turno.direccion}`
                      : `${LOCATION_LABELS.local} · ${BARBER_ADDRESS}`}
                  />
                  {turno.viatico > 0 && <Row k="Viático" v={plata(turno.viatico)} mono />}
                  {turno.viaticoAConvenir && <Row k="Viático" v="A convenir con Santiago" />}
                  {turno.precio > 0 && <Row k="Total" v={plata(total)} mono />}
                </div>

                {/* Reprogramar primero: la seña no se devuelve, así que cancelar
                    es la salida cara y no puede ser la que se ve mejor. */}
                {!turno.pasado && (
                  <div style={{ marginTop: 24, display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <a
                      href={`/modificar?id=${encodeURIComponent(id!)}&email=${encodeURIComponent(email!)}`}
                      className="btn-cta"
                      style={{ textDecoration: 'none', width: '100%' }}
                    >
                      Cambiar día u horario
                    </a>
                    {turno.puedeCancel && (
                      <a
                        href={`/cancelar?id=${encodeURIComponent(id!)}&email=${encodeURIComponent(email!)}`}
                        className="btn-outline"
                        style={{ textDecoration: 'none', width: '100%', textAlign: 'center' }}
                      >
                        Cancelar turno
                      </a>
                    )}
                  </div>
                )}

                <p className="mono" style={{ fontSize: 10.5, lineHeight: 1.7, color: 'var(--text-meta)', margin: '20px 0 0' }}>
                  {turno.pasado
                    ? 'ESTE TURNO YA PASÓ'
                    : turno.puedeCancel
                      ? `CANCELÁS HASTA ${CANCELLATION_MIN_HOURS} H ANTES`
                      : `YA NO SE PUEDE CANCELAR · ESCRIBILE A SANTIAGO`}
                  {turno.pago === 'pendiente' && <><br />LA SEÑA TODAVÍA NO ENTRÓ</>}
                </p>
              </div>
            )}

          </div>
        </div>
      </main>
    </div>
  )
}
