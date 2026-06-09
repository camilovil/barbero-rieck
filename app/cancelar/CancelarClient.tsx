'use client'

import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import AppHeader from '@/components/AppHeader'

type Estado = 'cargando' | 'listo' | 'confirmando' | 'cancelado' | 'error' | 'nopuede' | 'notfound'

interface TurnoInfo {
  nombre: string
  servicio: string
  fecha: string
  hora: string
  horasRestantes: number
  puedeCancel: boolean
}

const HEADER_H = 135

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

      <main className="flex-1 px-3 sm:px-6 pb-12" style={{ paddingTop: HEADER_H + 16 }}>
        <div className="max-w-md mx-auto">

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
                  Ya no es posible cancelar
                </h2>
                <p className="text-sm font-semibold mb-4" style={{ color: 'var(--text-mut)', lineHeight: 1.6 }}>
                  Solo se puede cancelar con al menos 24 horas de anticipación.<br />
                  Tu turno es el <strong style={{ color: 'var(--text)' }}>{turno.fecha} a las {turno.hora}</strong>.
                </p>
                <p className="text-sm font-semibold" style={{ color: 'var(--text-mut)', opacity: .7 }}>
                  Para cancelar, contactá a Santiago directamente por WhatsApp.
                </p>
              </div>
            )}

            {(estado === 'listo' || estado === 'confirmando') && turno && (
              <div>
                <div style={{ fontFamily: 'var(--font-anton,"Anton"),sans-serif', fontSize: 25, letterSpacing: '.3px', margin: '0 0 3px', color: 'var(--text)' }}>
                  Cancelar turno
                </div>
                <p className="text-sm font-semibold mb-6" style={{ color: 'var(--text-mut)' }}>
                  Vas a cancelar el siguiente turno. Esta acción no se puede deshacer.
                </p>

                {/* Detail card */}
                <div style={{
                  border: '2.5px solid var(--border)', borderRadius: 16,
                  overflow: 'hidden', background: 'var(--surface)', marginBottom: 20,
                }}>
                  {([
                    ['Nombre', turno.nombre],
                    ['Servicio', turno.servicio],
                    ['Fecha', turno.fecha],
                    ['Horario', turno.hora],
                  ] as [string, string][]).map(([label, value], i, arr) => (
                    <div key={label} style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      gap: 14, padding: '13px 16px',
                      borderBottom: i < arr.length - 1 ? '2px dashed var(--border-soft)' : 'none',
                    }}>
                      <span style={{ fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.6px', color: 'var(--text-mut)' }}>{label}</span>
                      <span style={{ fontSize: 13, fontWeight: 800, color: 'var(--text)', textAlign: 'right' }}>{value}</span>
                    </div>
                  ))}
                </div>

                {/* Cancel CTA */}
                <button
                  onClick={handleCancel}
                  disabled={estado === 'confirmando'}
                  style={{
                    width: '100%', padding: '14px 22px', borderRadius: 30,
                    border: 'none', cursor: estado === 'confirmando' ? 'not-allowed' : 'pointer',
                    fontFamily: 'var(--font-anton,"Anton"),sans-serif',
                    fontSize: 13, letterSpacing: '1.5px', textTransform: 'uppercase',
                    background: estado === 'confirmando'
                      ? 'var(--border)'
                      : 'linear-gradient(160deg, #DC5B4B, #C0453A)',
                    color: '#fff',
                    boxShadow: estado === 'confirmando' ? 'none' : '0 8px 20px rgba(192,69,58,.4)',
                    transition: '.18s',
                    marginBottom: 10,
                  }}
                >
                  {estado === 'confirmando' ? 'CANCELANDO...' : 'CONFIRMAR CANCELACIÓN'}
                </button>

                <p className="text-center text-xs font-semibold" style={{ color: 'var(--text-mut)' }}>
                  Te llega un email de confirmación al cancelar
                </p>
              </div>
            )}

            {estado === 'cancelado' && (
              <div className="text-center py-8">
                {/* Red circle */}
                <div style={{
                  width: 88, height: 88, margin: '0 auto 16px',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  borderRadius: '50%',
                  background: 'linear-gradient(160deg, #DC5B4B, #C0453A)',
                  boxShadow: '0 14px 30px rgba(192,69,58,.35)',
                }}>
                  <svg width={36} height={36} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={2.5} strokeLinecap="round">
                    <circle cx="12" cy="12" r="9"/>
                    <path d="M8.5 8.5l7 7M15.5 8.5l-7 7"/>
                  </svg>
                </div>
                <h2 style={{ fontFamily: 'var(--font-anton,"Anton"),sans-serif', fontSize: 26, color: 'var(--text)', margin: '0 0 8px' }}>
                  Turno cancelado
                </h2>
                <p className="text-sm font-semibold" style={{ color: 'var(--text-mut)', lineHeight: 1.6 }}>
                  Te mandamos un email de confirmación.<br />
                  El horario quedó libre para otros clientes.
                </p>
                <div style={{ marginTop: 20 }}>
                  <a href="/" className="btn-cta final" style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 8, padding: '12px 24px' }}>
                    Reservar otro turno
                  </a>
                </div>
              </div>
            )}

          </div>
        </div>
      </main>
    </div>
  )
}
