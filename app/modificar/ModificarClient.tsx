'use client'

import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import StepCalendar from '@/components/booking/StepCalendar'
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
}

function toDateParam(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
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
    <div className="min-h-screen flex flex-col" style={{background:'var(--bg)'}}>
      <header className="border-b px-6 h-16 flex items-center gap-3" style={{borderColor:'var(--border)', background:'var(--bg-2)'}}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo.png" alt="Barbería Rieck" width={32} height={32} className="rounded-full object-cover" />
        <span className="font-playfair text-lg tracking-wide" style={{color:'var(--text)'}}>Santiago Rieck</span>
      </header>

      <main className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-2xl">

          {estado === 'cargando' && (
            <div className="text-center text-sm" style={{color:'var(--text-faint)'}}>Verificando turno...</div>
          )}

          {estado === 'notfound' && (
            <div className="text-center">
              <div className="text-4xl mb-4">🔍</div>
              <h2 className="font-playfair text-2xl mb-3" style={{color:'var(--text)'}}>Turno no encontrado</h2>
              <p className="text-sm" style={{color:'var(--text-muted)'}}>Este turno ya fue cancelado o no existe.</p>
            </div>
          )}

          {estado === 'error' && (
            <div className="text-center">
              <div className="text-4xl mb-4">⚠️</div>
              <h2 className="font-playfair text-2xl mb-3" style={{color:'var(--text)'}}>Algo salió mal</h2>
              <p className="text-sm" style={{color:'var(--text-muted)'}}>{error}</p>
            </div>
          )}

          {estado === 'nopuede' && turno && (
            <div className="text-center">
              <div className="text-4xl mb-4">⏰</div>
              <h2 className="font-playfair text-2xl mb-3" style={{color:'var(--text)'}}>Ya no es posible modificar</h2>
              <p className="text-sm mb-6" style={{color:'var(--text-muted)'}}>
                Solo se puede modificar con al menos 24 horas de anticipación.<br />
                Tu turno es el <strong style={{color:'var(--text)'}}>{turno.fecha} a las {turno.hora}</strong>.
              </p>
              <p className="text-sm" style={{color:'var(--text-faint)'}}>
                Para cambiar el turno, contactá a Santiago directamente por WhatsApp.
              </p>
            </div>
          )}

          {(estado === 'listo' || estado === 'guardando') && turno && (
            <div>
              <h2 className="font-playfair text-2xl sm:text-3xl mb-2" style={{color:'var(--text)'}}>Modificar turno</h2>
              <p className="text-sm mb-6" style={{color:'var(--text-muted)'}}>
                Turno actual: <strong style={{color:'var(--text)'}}>{turno.fecha} a las {turno.hora}</strong>
              </p>

              {error && (
                <div className="mb-6 px-4 py-3 rounded-xl border text-sm" style={{borderColor:'var(--border)', color:'var(--text-muted)', background:'var(--bg-card)'}}>
                  ⚠️ {error}
                </div>
              )}

              <div className="mb-8">
                <StepCalendar
                  location={location}
                  selectedDate={newDate}
                  selectedTime={newTime}
                  onSelect={(date, time) => { setNewDate(date); setNewTime(time) }}
                />
              </div>

              {newDate && newTime && (
                <div className="border rounded-xl p-4 mb-6 text-sm" style={{background:'var(--bg-card)', borderColor:'var(--border-2)'}}>
                  <p style={{color:'var(--text-faint)'}}>Nuevo horario seleccionado</p>
                  <p className="font-semibold mt-1 capitalize" style={{color:'var(--text)'}}>
                    {newDate.toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' })} — {newTime}
                  </p>
                </div>
              )}

              <button
                onClick={handleModificar}
                disabled={!newDate || !newTime || estado === 'guardando'}
                className="w-full max-w-md py-4 rounded-xl text-sm font-semibold tracking-wide uppercase transition-all active:scale-[0.99]"
                style={!newDate || !newTime || estado === 'guardando'
                  ? {background:'var(--bg-active)', color:'var(--text-xfaint)', cursor:'not-allowed'}
                  : {background:'var(--text)', color:'var(--bg)'}}
              >
                {estado === 'guardando' ? 'Guardando...' : 'Confirmar cambio'}
              </button>
            </div>
          )}

          {estado === 'modificado' && (
            <div className="text-center">
              <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6 border" style={{background:'var(--bg-active)', borderColor:'var(--border)'}}>
                <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} style={{color:'var(--text-muted)'}}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="font-playfair text-2xl mb-3" style={{color:'var(--text)'}}>¡Turno modificado!</h2>
              <p className="text-sm" style={{color:'var(--text-muted)'}}>
                Te mandamos un nuevo email de confirmación con el horario actualizado.
              </p>
            </div>
          )}

        </div>
      </main>
    </div>
  )
}
