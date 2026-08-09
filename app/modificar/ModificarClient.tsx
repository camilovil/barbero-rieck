'use client'

import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import StepCalendar from '@/components/booking/StepCalendar'
import AppHeader from '@/components/AppHeader'
import { CANCELLATION_MIN_HOURS } from '@/lib/constants'
import type { Location } from '@/types/booking'
import { toDateParam } from '@/lib/format'

type Estado = 'cargando' | 'listo' | 'guardando' | 'modificado' | 'error' | 'nopuede' | 'notfound'

interface TurnoInfo {
  nombre: string
  servicio: string
  modalidad: string
  fecha: string
  hora: string
  horasRestantes: number
  puedeMod: boolean
  santiWa: string
}

const HEADER_H = 72

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

export default function ModificarClient() {
  const params = useSearchParams()
  const eventId = params.get('id')
  const email = params.get('email')

  const [estado, setEstado] = useState<Estado>('cargando')
  const [turno, setTurno] = useState<TurnoInfo | null>(null)
  const [error, setError] = useState('')
  const [newDate, setNewDate] = useState<Date | null>(null)
  const [newTime, setNewTime] = useState<string | null>(null)

  useEffect(() => {
    if (!eventId || !email) { setEstado('error'); setError('Link inválido'); return }
    fetch(`/api/modificar?id=${eventId}&email=${encodeURIComponent(email)}`)
      .then(r => r.json())
      .then(data => {
        if (data.error) {
          if (data.error.includes('no encontrado')) setEstado('notfound')
          else { setEstado('error'); setError(data.error) }
          return
        }
        setTurno(data)
        setEstado(data.puedeMod ? 'listo' : 'nopuede')
      })
      .catch(() => { setEstado('error'); setError('No pudimos verificar el turno') })
  }, [eventId, email])

  async function handleModificar() {
    if (!newDate || !newTime) return
    setEstado('guardando')
    const res = await fetch('/api/modificar', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ eventId, email, newDate: toDateParam(newDate), newTime }),
    })
    const data = await res.json()
    if (data.success) setEstado('modificado')
    else { setEstado('listo'); setError(data.error ?? 'Error al modificar') }
  }

  const location: Location = turno?.modalidad?.toLowerCase().includes('domicilio') ? 'domicilio' : 'local'

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--app-bg)' }}>
      <AppHeader />

      <main className="flex-1 px-4 sm:px-6 pb-14" style={{ paddingTop: `calc(env(safe-area-inset-top) + ${HEADER_H + 32}px)` }}>
        <div className="max-w-2xl mx-auto">

          <div style={{
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            padding: '26px 16px 24px',
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
              <>
                <Estado_ rotulo="Fuera de plazo" titulo="Ya no se puede modificar">
                  Se puede reprogramar con al menos {CANCELLATION_MIN_HOURS} horas de anticipación.
                  Tu turno es el{' '}
                  <strong style={{ color: 'var(--text)', fontWeight: 600 }}>
                    {turno.fecha} a las {turno.hora}
                  </strong>.
                </Estado_>
                {turno.santiWa && (
                  <a
                    href={`https://wa.me/${turno.santiWa.replace(/\D/g, '')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn-cta"
                    style={{ textDecoration: 'none', width: '100%', marginTop: 26 }}
                  >
                    Escribirle a Santiago
                  </a>
                )}
              </>
            )}

            {(estado === 'listo' || estado === 'guardando') && turno && (
              <div>
                <Estado_ rotulo="Reprogramar" titulo="Modificar turno" />

                <div className="kv" style={{ margin: '20px 0 0' }}>
                  <span className="kv-k">Turno actual</span>
                  <span className="kv-v mono">{turno.fecha} · {turno.hora}</span>
                </div>

                {error && (
                  <p className="mono" style={{
                    fontSize: 11, lineHeight: 1.6, color: 'var(--text)',
                    border: '1px solid var(--text)', padding: '12px 14px', margin: '18px 0 0',
                  }}>
                    {error}
                  </p>
                )}

                <div style={{ marginTop: 30 }}>
                  <StepCalendar
                    location={location}
                    selectedDate={newDate}
                    selectedTime={newTime}
                    onSelect={(date, time) => { setNewDate(date); setNewTime(time) }}
                  />
                </div>

                {newDate && newTime && (
                  <div className="kv" style={{ borderTop: '1px solid var(--text)', borderBottom: 'none', marginTop: 22, paddingTop: 14 }}>
                    <span className="kv-k">Nuevo horario</span>
                    <span className="kv-v mono">
                      {(() => {
                        const s = newDate.toLocaleDateString('es-AR', { weekday: 'short', day: 'numeric', month: 'short' })
                        return s.charAt(0).toUpperCase() + s.slice(1)
                      })()} · {newTime}
                    </span>
                  </div>
                )}

                <button
                  onClick={handleModificar}
                  disabled={!newDate || !newTime || estado === 'guardando'}
                  className="btn-cta"
                  style={{ width: '100%', marginTop: 22 }}
                >
                  {estado === 'guardando' ? 'Guardando…' : 'Confirmar cambio'}
                </button>
              </div>
            )}

            {estado === 'modificado' && (
              <div>
                <Estado_ rotulo="Listo" titulo="Turno modificado">
                  Te mandamos un nuevo mail de confirmación con el horario actualizado.
                </Estado_>
                <a href="/" className="btn-outline" style={{ textDecoration: 'none', width: '100%', marginTop: 26 }}>
                  Volver al inicio
                </a>
              </div>
            )}

          </div>
        </div>
      </main>
    </div>
  )
}
