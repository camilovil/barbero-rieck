'use client'

import { useState } from 'react'
import StepIndicator from './booking/StepIndicator'
import StepLocation from './booking/StepLocation'
import StepService from './booking/StepService'
import StepCalendar from './booking/StepCalendar'
import StepDatos from './booking/StepDatos'
import StepResumen from './booking/StepResumen'
import StepSuccess from './booking/StepSuccess'
import type { BookingState, Location, Service } from '@/types/booking'
import { SERVICES, LOCATION_LABELS, viaticoDeBarrio } from '@/lib/constants'
import { diaCorto } from '@/lib/format'

interface Props {
  initialLocation?: Location | null
  initialServicio?: string | null
  /** Con la seña activa, confirmar no cierra el turno: lleva a pagar. */
  senaActiva?: boolean
  /** Con el viático activo se pide el barrio y se cobra el traslado. */
  viaticoActivo?: boolean
}

function buildInitialState(initialLocation: Location | null, initialServicio: string | null): BookingState {
  const location = initialLocation
  let service: Service | null = null
  let step = 1

  if (location) {
    step = 2
    const services = SERVICES[location]
    if (initialServicio) {
      const slug = initialServicio.toLowerCase()
      const match = services.find(s =>
        s.name.toLowerCase().replace(/\s+y\s+/g, '-').replace(/\s+/g, '-') === slug ||
        s.name.toLowerCase().split(' ')[0] === slug.split('-')[0]
      )
      if (match) { service = match; step = 3 }
    }
  }

  return { step, location, email: '', service, date: null, time: null, nombre: '', whatsapp: '', direccion: '', barrio: null, nota: '' }
}

function canAdvance(state: BookingState, viaticoActivo: boolean): boolean {
  switch (state.step) {
    case 1: return state.location !== null
    case 2: return state.service !== null
    case 3: return state.date !== null && state.time !== null
    case 4: {
      const base = state.nombre.trim() !== '' && state.whatsapp.trim() !== '' && state.email.trim() !== ''
      /* El barrio sólo hace falta cuando se cobra el traslado: si el viático
         está apagado, pedirlo sería un campo obligatorio que no decide nada. */
      if (state.location === 'domicilio') {
        return base && state.direccion.trim() !== '' && (!viaticoActivo || !!state.barrio)
      }
      return base
    }
    default: return true
  }
}

export default function BookingFlow({ initialLocation = null, initialServicio = null, senaActiva = false, viaticoActivo = false }: Props) {
  const [state, setState] = useState<BookingState>(() => buildInitialState(initialLocation, initialServicio))
  const [loading, setLoading] = useState(false)
  const [redirigiendo, setRedirigiendo] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [confirmed, setConfirmed] = useState(false)
  const [eventId, setEventId] = useState<string | null>(null)

  function update(patch: Partial<BookingState>) {
    setState(prev => ({ ...prev, ...patch }))
  }

  function goNext() {
    if (canAdvance(state, viaticoActivo)) update({ step: state.step + 1 })
  }

  function goBack() {
    setError(null)
    if (state.step > 1) update({ step: state.step - 1 })
  }

  async function handleConfirm() {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/booking', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(state),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Error al confirmar')

      /* Con seña, acá el turno todavía no está cerrado: el horario le queda
         guardado y le toca transferir. /pago le dice cuánto, a qué alias y
         cómo mandar el comprobante, y se queda mirando hasta que Santiago lo
         confirma. Por eso no hay pantalla de éxito en este camino. */
      if (data.pendingPayment && data.eventId) {
        setRedirigiendo(true)
        /* Quién es y para cuándo, para que el WhatsApp del comprobante le
           llegue a Santiago ya redactado. Va por la sesión del navegador y no
           por la URL: es el dato del cliente y no tiene por qué quedar en un
           link que después se comparte o queda en el historial. */
        try {
          sessionStorage.setItem('bh_pago', JSON.stringify({
            nombre: state.nombre,
            cuando: state.date
              ? `${state.date.toLocaleDateString('es-AR', { day: 'numeric', month: 'long' })} a las ${state.time ?? ''}`.trim()
              : undefined,
          }))
        } catch { /* sin storage el mensaje sale genérico, que también sirve */ }
        /* assign() y no `location.href = ...`: hace exactamente lo mismo,
           pero es una llamada y no la mutación de un objeto de afuera, que es
           lo que el linter marca con razón en el caso general. */
        window.location.assign(`/pago?turno=${encodeURIComponent(data.eventId)}`)
        return
      }

      setEventId(data.eventId ?? null)
      setConfirmed(true)
    } catch (err) {
      /* El error va en la barra del CTA, donde el ojo ya está y donde está el
         botón para reintentar. El alert() del navegador no se puede estilar,
         bloquea la página y en el teléfono se lee como un error del sistema y
         no del sitio. */
      console.error(err)
      setError(err instanceof Error ? err.message : 'Hubo un error al confirmar el turno. Intentá de nuevo.')
    } finally {
      setLoading(false)
    }
  }

  function reset() {
    setState(buildInitialState(null, null))
    setConfirmed(false)
    setEventId(null)
  }

  if (confirmed) {
    return <StepSuccess booking={state} eventId={eventId} onReset={reset} />
  }

  const ready = canAdvance(state, viaticoActivo)

  /* Recap de una línea sobre el CTA: lo que se lleva elegido hasta
     acá. Antes esto vivía en el «volver» de arriba; como ese control
     se fue, el contexto viaja donde el ojo ya está mirando. */
  const elegido = [
    state.location ? LOCATION_LABELS[state.location] : null,
    state.service ? `${state.service.name} · ${state.service.duration}'` : null,
    state.date && state.time ? `${diaCorto(state.date)} · ${state.time}` : null,
  ].filter(Boolean).join('  ·  ')

  const recap = elegido
    ? {
        left: elegido,
        /* El recap muestra lo que va a pagar, viático incluido: si mostrara
           sólo el servicio, el número cambiaría solo en el resumen. */
        right: state.service
          ? state.service.priceLabel
            ?? `$${(state.service.price + (viaticoActivo ? viaticoDeBarrio(state.barrio) : 0)).toLocaleString('es-AR')}`
          : '',
      }
    : null

  /* El CTA es siempre el mismo control en el mismo lugar: cambia la
     etiqueta y a quién llama, no la posición. En el paso 5 confirma. */
  const ctaConfirmar = redirigiendo
    ? 'Un momento…'
    : loading
      ? 'Confirmando…'
      : senaActiva ? 'Reservar y pagar la seña' : 'Confirmar turno'

  const cta = state.step === 5
    ? { label: ctaConfirmar, onClick: handleConfirm, enabled: !loading && !redirigiendo }
    : { label: state.step === 4 ? 'Ver resumen' : 'Continuar', onClick: goNext, enabled: ready }

  return (
    <div className="flow">
      <StepIndicator current={state.step} />

      {/* Sólo esta zona hace scroll. La cabecera de pasos y el CTA
          quedan fijos, así el flujo mide siempre lo mismo. */}
      <div className="flow-body">
        {state.step === 1 && (
          <StepLocation
            selected={state.location}
            onSelect={(loc: Location) => update({ location: loc, service: null })}
          />
        )}
        {state.step === 2 && state.location && (
          <StepService
            location={state.location}
            selected={state.service}
            senaActiva={senaActiva}
            viaticoActivo={viaticoActivo}
            onSelect={(s: Service) => update({ service: s })}
          />
        )}
        {state.step === 3 && state.location && (
          <StepCalendar
            location={state.location}
            selectedDate={state.date}
            selectedTime={state.time}
            senaActiva={senaActiva}
            onSelect={(date, time) => update({ date, time })}
          />
        )}
        {state.step === 4 && state.location && (
          <StepDatos
            location={state.location}
            nombre={state.nombre}
            whatsapp={state.whatsapp}
            email={state.email}
            direccion={state.direccion}
            barrio={state.barrio}
            viaticoActivo={viaticoActivo}
            nota={state.nota}
            onChange={(field, value) => update({ [field]: value })}
          />
        )}
        {state.step === 5 && <StepResumen booking={state} senaActiva={senaActiva} viaticoActivo={viaticoActivo} />}
      </div>

      <div className="cta-bar">
        {error && (
          <p className="cta-error" role="alert">{error}</p>
        )}
        {recap && state.step >= 2 && (
          <div className="cta-recap">
            <span>{recap.left}</span>
            {recap.right && <b>{recap.right}</b>}
          </div>
        )}
        <div className="cta-bar-inner">
          {/* Un solo «atrás», con caja: en el paso 1 no existe, así el
              primario ocupa todo el ancho y no queda un hueco raro. */}
          {state.step > 1 && (
            <button onClick={goBack} className="btn-outline btn-back" aria-label="Volver al paso anterior">
              <span aria-hidden="true">←</span> Atrás
            </button>
          )}

          <button onClick={cta.onClick} disabled={!cta.enabled} className="btn-cta">
            {cta.label}
          </button>
        </div>
      </div>
    </div>
  )
}
