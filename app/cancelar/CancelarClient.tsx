'use client'

import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'

type Estado = 'cargando' | 'listo' | 'confirmando' | 'cancelado' | 'error' | 'nopuede' | 'notfound'

interface TurnoInfo {
  nombre: string
  servicio: string
  fecha: string
  hora: string
  horasRestantes: number
  puedeCancel: boolean
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
    <div className="min-h-screen flex flex-col" style={{background:'var(--bg)'}}>
      {/* Header */}
      <header className="border-b px-6 h-16 flex items-center gap-3" style={{borderColor:'var(--border)', background:'var(--bg-2)'}}>
        <span className="text-lg">✂️</span>
        <span className="font-playfair text-lg tracking-wide" style={{color:'var(--text)'}}>Santiago Rieck</span>
      </header>

      <main className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-md">

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
              <h2 className="font-playfair text-2xl mb-3" style={{color:'var(--text)'}}>Ya no es posible cancelar</h2>
              <p className="text-sm mb-6" style={{color:'var(--text-muted)'}}>
                Solo se puede cancelar con al menos 24 horas de anticipación.<br />
                Tu turno es el <strong style={{color:'var(--text)'}}>{turno.fecha} a las {turno.hora}</strong>.
              </p>
              <p className="text-sm" style={{color:'var(--text-faint)'}}>
                Para cancelar, contactá a Santiago directamente por WhatsApp.
              </p>
            </div>
          )}

          {(estado === 'listo' || estado === 'confirmando') && turno && (
            <div>
              <h2 className="font-playfair text-2xl mb-2" style={{color:'var(--text)'}}>Cancelar turno</h2>
              <p className="text-sm mb-8" style={{color:'var(--text-muted)'}}>
                Vas a cancelar el siguiente turno. Esta acción no se puede deshacer.
              </p>

              <div className="border rounded-xl p-5 mb-8" style={{background:'var(--bg-card)', borderColor:'var(--border-2)'}}>
                {[
                  ['Nombre', turno.nombre],
                  ['Servicio', turno.servicio],
                  ['Fecha', turno.fecha],
                  ['Horario', turno.hora],
                ].map(([label, value]) => (
                  <div key={label} className="flex justify-between items-center py-3 border-b last:border-0" style={{borderColor:'var(--border)'}}>
                    <span className="text-[10px] uppercase tracking-widest" style={{color:'var(--text-faint)'}}>{label}</span>
                    <span className="text-sm" style={{color:'var(--text)'}}>{value}</span>
                  </div>
                ))}
              </div>

              <button
                onClick={handleCancel}
                disabled={estado === 'confirmando'}
                className="w-full py-4 rounded-xl text-sm font-semibold tracking-wide uppercase transition-all border border-red-900"
                style={estado === 'confirmando'
                  ? {background:'var(--bg-active)', color:'var(--text-xfaint)', cursor:'not-allowed'}
                  : {background:'rgba(127,29,29,0.4)', color:'#fca5a5'}}
              >
                {estado === 'confirmando' ? 'Cancelando...' : 'Confirmar cancelación'}
              </button>

              <p className="text-center text-xs mt-4" style={{color:'var(--text-faint)'}}>
                Te llega un email de confirmación al cancelar
              </p>
            </div>
          )}

          {estado === 'cancelado' && (
            <div className="text-center">
              <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6 border" style={{background:'var(--bg-active)', borderColor:'var(--border)'}}>
                <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} style={{color:'var(--text-muted)'}}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="font-playfair text-2xl mb-3" style={{color:'var(--text)'}}>Turno cancelado</h2>
              <p className="text-sm" style={{color:'var(--text-muted)'}}>
                Te mandamos un email de confirmación.<br />
                El horario quedó libre para otros clientes.
              </p>
            </div>
          )}

        </div>
      </main>
    </div>
  )
}
