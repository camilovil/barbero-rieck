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
    if (data.success) {
      setEstado('cancelado')
    } else {
      setEstado('error')
      setError(data.error ?? 'Error al cancelar')
    }
  }

  return (
    <div className="min-h-screen bg-[#1a1a1a] flex flex-col">
      {/* Header */}
      <header className="border-b border-[#2e2e2e] px-6 h-16 flex items-center gap-3">
        <span className="text-lg">✂️</span>
        <span className="font-playfair text-lg text-[#f5f0e8] tracking-wide">Santiago Rieck</span>
      </header>

      <main className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-md">

          {estado === 'cargando' && (
            <div className="text-center text-[#f5f0e8]/40 text-sm">Verificando turno...</div>
          )}

          {estado === 'notfound' && (
            <div className="text-center">
              <div className="text-4xl mb-4">🔍</div>
              <h2 className="font-playfair text-2xl text-[#f5f0e8] mb-3">Turno no encontrado</h2>
              <p className="text-[#f5f0e8]/50 text-sm">Este turno ya fue cancelado o no existe.</p>
            </div>
          )}

          {estado === 'error' && (
            <div className="text-center">
              <div className="text-4xl mb-4">⚠️</div>
              <h2 className="font-playfair text-2xl text-[#f5f0e8] mb-3">Algo salió mal</h2>
              <p className="text-[#f5f0e8]/50 text-sm">{error}</p>
            </div>
          )}

          {estado === 'nopuede' && turno && (
            <div className="text-center">
              <div className="text-4xl mb-4">⏰</div>
              <h2 className="font-playfair text-2xl text-[#f5f0e8] mb-3">Ya no es posible cancelar</h2>
              <p className="text-[#f5f0e8]/50 text-sm mb-6">
                Solo se puede cancelar con al menos 24 horas de anticipación.<br />
                Tu turno es el <strong className="text-[#f5f0e8]">{turno.fecha} a las {turno.hora}</strong>.
              </p>
              <p className="text-[#f5f0e8]/40 text-sm">
                Para cancelar, contactá a Santiago directamente por WhatsApp.
              </p>
            </div>
          )}

          {(estado === 'listo' || estado === 'confirmando') && turno && (
            <div>
              <h2 className="font-playfair text-2xl text-[#f5f0e8] mb-2">Cancelar turno</h2>
              <p className="text-[#f5f0e8]/50 text-sm mb-8">
                Vas a cancelar el siguiente turno. Esta acción no se puede deshacer.
              </p>

              <div className="bg-[#222222] border border-[#2e2e2e] rounded-xl p-5 mb-8">
                {[
                  ['Nombre', turno.nombre],
                  ['Servicio', turno.servicio],
                  ['Fecha', turno.fecha],
                  ['Horario', turno.hora],
                ].map(([label, value]) => (
                  <div key={label} className="flex justify-between items-center py-3 border-b border-[#2a2a2a] last:border-0">
                    <span className="text-[10px] uppercase tracking-widest text-[#f5f0e8]/35">{label}</span>
                    <span className="text-sm text-[#f5f0e8]">{value}</span>
                  </div>
                ))}
              </div>

              <button
                onClick={handleCancel}
                disabled={estado === 'confirmando'}
                className={`w-full py-4 rounded-xl text-sm font-semibold tracking-wide uppercase transition-all
                  ${estado === 'confirmando'
                    ? 'bg-[#2e2e2e] text-[#f5f0e8]/30 cursor-not-allowed'
                    : 'bg-red-900/60 hover:bg-red-900/80 text-red-200 border border-red-900'
                  }`}
              >
                {estado === 'confirmando' ? 'Cancelando...' : 'Confirmar cancelación'}
              </button>

              <p className="text-center text-[#f5f0e8]/25 text-xs mt-4">
                Te llega un email de confirmación al cancelar
              </p>
            </div>
          )}

          {estado === 'cancelado' && (
            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-[#2e2e2e] border border-[#f5f0e8]/10 flex items-center justify-center mx-auto mb-6">
                <svg className="w-8 h-8 text-[#f5f0e8]/60" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="font-playfair text-2xl text-[#f5f0e8] mb-3">Turno cancelado</h2>
              <p className="text-[#f5f0e8]/50 text-sm">
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
