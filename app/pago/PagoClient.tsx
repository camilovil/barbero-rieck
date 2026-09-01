'use client'

import { useCallback, useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import AppHeader from '@/components/AppHeader'
import TurnoTracker from '@/components/TurnoTracker'
import { DEPOSIT_HOLD_LABEL } from '@/lib/constants'
import type { DatosDeTransferencia } from '@/lib/transferencia'

type Estado = 'consultando' | 'pendiente' | 'pagado' | 'vencido' | 'error'

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

/* El dato que hay que copiar sí o sí para poder pagar. Va en mono y grande
   —es un dato, no prosa— con el botón de copiar pegado: en el teléfono,
   transcribir un alias a mano es donde se pierde la gente. */
function DatoCopiable({ label, valor }: { label: string; valor: string }) {
  const [copiado, setCopiado] = useState(false)

  const copiar = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(valor)
      setCopiado(true)
      setTimeout(() => setCopiado(false), 2000)
    } catch {
      /* Sin permiso de portapapeles no pasa nada: el valor está a la vista
         y se puede seleccionar a mano. Un cartel de error acá sería ruido
         sobre algo que el cliente puede resolver solo. */
    }
  }, [valor])

  return (
    <div style={{ borderTop: '1px solid var(--border)', padding: '14px 0' }}>
      <div className="rotulo" style={{ marginBottom: 8 }}>{label}</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <span className="mono" style={{ fontSize: 17, color: 'var(--text)', wordBreak: 'break-all', flex: 1 }}>
          {valor}
        </span>
        <button onClick={copiar} className="btn-outline btn-sm" style={{ flex: '0 0 auto' }}>
          {copiado ? 'Copiado' : 'Copiar'}
        </button>
      </div>
    </div>
  )
}

export default function PagoClient({ datos }: { datos: DatosDeTransferencia }) {
  const params = useSearchParams()
  const turno = params.get('turno')

  const [estado, setEstado] = useState<Estado>('consultando')
  const [sena, setSena] = useState(0)

  /* Quién reservó y para cuándo, para que el mensaje de WhatsApp le llegue a
     Santiago ya escrito. Lo deja el paso anterior en la sesión del navegador y
     no viaja por la URL ni sale del servidor: son datos del cliente y no
     hacen falta para nada más que redactar ese mensaje. Si no está —porque
     entró desde el mail, o cambió de teléfono— el mensaje sale igual, más
     genérico. */
  const [quien, setQuien] = useState<{ nombre?: string; cuando?: string }>({})
  useEffect(() => {
    try {
      const guardado = sessionStorage.getItem('bh_pago')
      if (guardado) setQuien(JSON.parse(guardado))
    } catch { /* sesión sin storage: el mensaje genérico alcanza */ }
  }, [])

  /* La confirmación ya no llega sola: la hace Santiago cuando ve el
     comprobante. Preguntamos cada diez segundos por si está mirando la
     pantalla en ese momento —es lindo verlo pasar a confirmado sin tocar
     nada— pero no es el camino principal: el camino principal es el mail.
     Por eso, después de diez minutos, deja de preguntar en vez de tener el
     teléfono golpeando el servidor toda la tarde. */
  useEffect(() => {
    if (!turno) { setEstado('error'); return }

    let vivo = true
    let intentos = 0
    let timer: ReturnType<typeof setTimeout>

    async function mirar(): Promise<boolean> {
      try {
        const res = await fetch(`/api/pagos/estado?turno=${encodeURIComponent(turno!)}`)
        const data = await res.json()
        if (!vivo) return true
        if (typeof data.sena === 'number' && data.sena > 0) setSena(data.sena)
        if (data.estado === 'pagado' || data.estado === 'vencido') {
          setEstado(data.estado)
          return true
        }
        setEstado('pendiente')
        return ++intentos >= 60
      } catch {
        /* Un error de red no puede tapar las instrucciones: si ya las
           mostramos, se quedan. El cartel de error es sólo para el que nunca
           llegó a verlas. */
        if (vivo) setEstado(previo => (previo === 'consultando' ? 'error' : previo))
        return true
      }
    }

    const loop = async () => {
      const listo = await mirar()
      if (!listo && vivo) timer = setTimeout(loop, 10000)
    }
    loop()

    return () => { vivo = false; clearTimeout(timer) }
  }, [turno])

  const montoTxt = sena ? `$${sena.toLocaleString('es-AR')}` : 'la seña'
  const mensaje = [
    `Hola Santi!${quien.nombre ? ` Soy ${quien.nombre}.` : ''}`,
    quien.cuando
      ? `Reservé el turno del ${quien.cuando} y te transferí la seña de ${montoTxt}.`
      : `Te transferí la seña de ${montoTxt} del turno que reservé.`,
    'Te paso el comprobante.',
  ].join(' ')
  const waLink = datos.whatsapp
    ? `https://wa.me/${datos.whatsapp}?text=${encodeURIComponent(mensaje)}`
    : null

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
                Buscando tu reserva…
              </div>
            )}

            {estado === 'pendiente' && (
              <div>
                <Estado_ rotulo="Falta la seña" titulo="Transferí la seña">
                  Te guardamos el horario {DEPOSIT_HOLD_LABEL}. Transferí{sena ? ` ${montoTxt}` : ' la seña'} y
                  mandale el comprobante a Santiago: cuando lo vea, tu turno queda
                  confirmado y te llega el mail. El resto se paga en el lugar.
                </Estado_>

                <TurnoTracker estado="pendiente" />

                <div style={{ marginTop: 22 }}>
                  {sena > 0 && <DatoCopiable label="Cuánto" valor={montoTxt} />}
                  {datos.alias
                    ? <DatoCopiable label="Alias" valor={datos.alias} />
                    : (
                      /* Sin alias cargado no hay a dónde transferir. Antes que
                         mostrar un campo vacío, la pantalla lo dice y manda al
                         único lugar donde se resuelve. */
                      <p style={{ fontSize: 13, lineHeight: 1.6, color: 'var(--text-mut)', marginTop: 14 }}>
                        Escribile a Santiago y te pasa los datos para transferir.
                      </p>
                    )}
                  {datos.alias && (
                    <div style={{ borderTop: '1px solid var(--border)', padding: '14px 0' }}>
                      <div className="rotulo" style={{ marginBottom: 8 }}>A nombre de</div>
                      <span style={{ fontSize: 15, color: 'var(--text)' }}>{datos.titular}</span>
                    </div>
                  )}
                </div>

                {waLink && (
                  <a
                    href={waLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn-cta"
                    style={{ textDecoration: 'none', width: '100%', marginTop: 22 }}
                  >
                    Mandar el comprobante
                  </a>
                )}

                <p className="mono" style={{ marginTop: 14, fontSize: 10.5, color: 'var(--text-meta)', lineHeight: 1.5, textAlign: 'center' }}>
                  TE MANDAMOS ESTOS DATOS POR MAIL TAMBIÉN
                </p>
              </div>
            )}

            {estado === 'pagado' && (
              <div>
                <Estado_ rotulo="Listo" titulo="Turno confirmado">
                  Santiago confirmó la seña y el turno quedó tomado. Te mandamos el mail
                  con los datos, el link para cancelar y el saldo que se paga en el lugar.
                </Estado_>
                <TurnoTracker estado="confirmado" />
                <Link href="/" className="btn-cta" style={{ textDecoration: 'none', width: '100%', marginTop: 26 }}>
                  Volver al inicio
                </Link>
              </div>
            )}

            {estado === 'vencido' && (
              <div>
                <Estado_ rotulo="Sin resultado" titulo="La reserva venció">
                  Pasaron las {DEPOSIT_HOLD_LABEL} que guardamos el horario sin la seña,
                  y volvió a quedar disponible. Si llegaste a transferir, escribile a
                  Santiago y lo resuelven.
                </Estado_>
                <Link href="/reservar" className="btn-cta" style={{ textDecoration: 'none', width: '100%', marginTop: 26 }}>
                  Reservar de nuevo
                </Link>
              </div>
            )}

            {estado === 'error' && (
              <Estado_ rotulo="Error" titulo="Algo salió mal">
                No pudimos encontrar tu reserva. Revisá el mail que te mandamos: ahí
                están el alias y el monto de la seña.
              </Estado_>
            )}

          </div>
        </div>
      </main>
    </div>
  )
}
