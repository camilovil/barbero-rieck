'use client'

import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import StepCalendar from '@/components/booking/StepCalendar'
import AppHeader from '@/components/AppHeader'
import type { Location } from '@/types/booking'

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

function toDateParam(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

const HEADER_H = 135

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

      <main className="flex-1 px-3 sm:px-6 pb-12" style={{ paddingTop: HEADER_H + 16 }}>
        <div className="max-w-2xl mx-auto">

          {/* Card wrapper */}
          <div className="rounded-2xl p-4 sm:p-8" style={{
            background: 'var(--surface)',
            border: '2.5px solid var(--border)',
            boxShadow: '0 20px 50px rgba(11,31,71,.1)',
          }}>

            {estado === 'cargando' && (
              <div className="text-center py-12 text-sm font-semibold" style={{ color: 'var(--text-mut)' }}>
                Verificando turno...
              </div>
            )}

            {estado === 'notfound' && (
              <div className="text-center py-12">
                <div className="text-4xl mb-4">🔍</div>
                <h2 style={{ fontFamily: 'var(--font-anton,"Anton"),sans-serif', fontSize: 24, color: 'var(--text)', margin: '0 0 8px' }}>
                  Turno no encontrado
                </h2>
                <p className="text-sm font-semibold" style={{ color: 'var(--text-mut)' }}>
                  Este turno ya fue cancelado o no existe.
                </p>
              </div>
            )}

            {estado === 'error' && (
              <div className="text-center py-12">
                <div className="text-4xl mb-4">⚠️</div>
                <h2 style={{ fontFamily: 'var(--font-anton,"Anton"),sans-serif', fontSize: 24, color: 'var(--text)', margin: '0 0 8px' }}>
                  Algo salió mal
                </h2>
                <p className="text-sm font-semibold" style={{ color: 'var(--text-mut)' }}>{error}</p>
              </div>
            )}

            {estado === 'nopuede' && turno && (
              <div className="text-center py-8">
                <div className="text-4xl mb-4">⏰</div>
                <h2 style={{ fontFamily: 'var(--font-anton,"Anton"),sans-serif', fontSize: 24, color: 'var(--text)', margin: '0 0 10px' }}>
                  Ya no es posible modificar
                </h2>
                <p className="text-sm font-semibold mb-6" style={{ color: 'var(--text-mut)', lineHeight: 1.6 }}>
                  Solo se puede modificar con al menos 24 horas de anticipación.<br />
                  Tu turno es el <strong style={{ color: 'var(--text)' }}>{turno.fecha} a las {turno.hora}</strong>.
                </p>
                {turno.santiWa && (
                  <a
                    href={`https://wa.me/${turno.santiWa.replace(/\D/g, '')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn-cta final"
                    style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '13px 28px', textDecoration: 'none', background: '#25D366', borderColor: '#25D366' }}
                  >
                    💬 ESCRIBIR A SANTIAGO
                  </a>
                )}
              </div>
            )}

            {(estado === 'listo' || estado === 'guardando') && turno && (
              <div>
                <div style={{ fontFamily: 'var(--font-anton,"Anton"),sans-serif', fontSize: 25, letterSpacing: '.3px', margin: '0 0 3px', color: 'var(--text)' }}>
                  Modificar turno
                </div>
                <p className="text-sm font-semibold mb-6" style={{ color: 'var(--text-mut)' }}>
                  Turno actual: <strong style={{ color: 'var(--text)' }}>{turno.fecha} a las {turno.hora}</strong>
                </p>

                {error && (
                  <div className="mb-5 px-4 py-3 rounded-xl text-sm font-semibold" style={{
                    border: '2px solid var(--border)', color: 'var(--text-mut)', background: 'var(--chip-bg)',
                  }}>
                    ⚠️ {error}
                  </div>
                )}

                <div className="mb-6">
                  <StepCalendar
                    location={location}
                    selectedDate={newDate}
                    selectedTime={newTime}
                    onSelect={(date, time) => { setNewDate(date); setNewTime(time) }}
                  />
                </div>

                {newDate && newTime && (
                  <div className="mb-6 px-4 py-3 rounded-xl" style={{
                    background: 'var(--chip-bg)', border: '2px solid var(--border)',
                  }}>
                    <p className="text-xs font-semibold uppercase tracking-widest mb-1" style={{ color: 'var(--text-mut)' }}>
                      Nuevo horario seleccionado
                    </p>
                    <p className="font-bold capitalize" style={{ color: 'var(--text)', fontSize: 14 }}>
                      {newDate.toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' })} — {newTime}
                    </p>
                  </div>
                )}

                <button
                  onClick={handleModificar}
                  disabled={!newDate || !newTime || estado === 'guardando'}
                  className="btn-cta final"
                  style={{ width: '100%', justifyContent: 'center', padding: '14px 26px' }}
                >
                  {estado === 'guardando' ? 'GUARDANDO...' : 'CONFIRMAR CAMBIO'}
                </button>
              </div>
            )}

            {estado === 'modificado' && (
              <div className="text-center py-8">
                <div style={{
                  width: 88, height: 88, margin: '0 auto 16px',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  borderRadius: '50%',
                  background: 'linear-gradient(160deg, var(--celeste), var(--celeste-deep))',
                  boxShadow: '0 14px 30px rgba(63,134,196,.4)',
                }}>
                  <svg width={40} height={40} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </div>
                <h2 style={{ fontFamily: 'var(--font-anton,"Anton"),sans-serif', fontSize: 26, color: 'var(--text)', margin: '0 0 8px' }}>
                  ¡Turno modificado!
                </h2>
                <p className="text-sm font-semibold" style={{ color: 'var(--text-mut)', lineHeight: 1.6 }}>
                  Te mandamos un nuevo email de confirmación<br />con el horario actualizado.
                </p>
              </div>
            )}

          </div>
        </div>
      </main>
    </div>
  )
}
