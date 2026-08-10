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
import { SERVICES, LOCATION_LABELS } from '@/lib/constants'
import { diaCorto } from '@/lib/format'

interface Props {
  initialLocation?: Location | null
  initialServicio?: string | null
  /** Con la seña activa, confirmar no cierra el turno: lleva a pagar. */
  senaActiva?: boolean
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

  return { step, location, email: '', service, date: null, time: null, nombre: '', whatsapp: '', direccion: '', nota: '' }
}

function canAdvance(state: BookingState): boolean {
  switch (state.step) {
    case 1: return state.location !== null
    case 2: return state.service !== null
    case 3: return state.date !== null && state.time !== null
    case 4: {
      const base = state.nombre.trim() !== '' && state.whatsapp.trim() !== '' && state.email.trim() !== ''
      if (state.location === 'domicilio') return base && state.direccion.trim() !== ''
      return base
    }
    default: return true
  }
}

export default function BookingFlow({ initialLocation = null, initialServicio = null, senaActiva = false }: Props) {
  const [state, setState] = useState<BookingState>(() => buildInitialState(initialLocation, initialServicio))
  const [loading, setLoading] = useState(false)
  const [redirigiendo, setRedirigiendo] = useState(false)
  const [confirmed, setConfirmed] = useState(false)
  const [eventId, setEventId] = useState<string | null>(null)

  function update(patch: Partial<BookingState>) {
    setState(prev => ({ ...prev, ...patch }))
  }

  function goNext() {
    if (canAdvance(state)) update({ step: state.step + 1 })
  }

  function goBack() {
    if (state.step > 1) update({ step: state.step - 1 })
  }

  async function handleConfirm() {
    setLoading(true)
    try {
      const res = await fetch('/api/booking', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(state),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Error al confirmar')

      /* Con seña, acá el turno todavía no está cerrado: el horario le queda
         guardado y manda Mercado Pago. Se confirma cuando avisa que la plata
         entró, y el cliente vuelve a /pago. Por eso no hay pantalla de éxito. */
      if (data.paymentUrl) {
        setRedirigiendo(true)
        window.location.href = data.paymentUrl
        return
      }

      setEventId(data.eventId ?? null)
      setConfirmed(true)
    } catch (err) {
      console.error(err)
      alert(err instanceof Error ? err.message : 'Hubo un error al confirmar el turno. Intentá de nuevo.')
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

  const ready = canAdvance(state)

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
        right: state.service
          ? state.service.priceLabel ?? `$${state.service.price.toLocaleString('es-AR')}`
          : '',
      }
    : null

  /* El CTA es siempre el mismo control en el mismo lugar: cambia la
     etiqueta y a quién llama, no la posición. En el paso 5 confirma. */
  const ctaConfirmar = redirigiendo
    ? 'Te llevamos a pagar…'
    : loading
      ? 'Confirmando…'
      : senaActiva ? 'Pagar la seña' : 'Confirmar turno'

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
            onSelect={(s: Service) => update({ service: s })}
          />
        )}
        {state.step === 3 && state.location && (
          <StepCalendar
            location={state.location}
            selectedDate={state.date}
            selectedTime={state.time}
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
            nota={state.nota}
            onChange={(field, value) => update({ [field]: value })}
          />
        )}
        {state.step === 5 && <StepResumen booking={state} senaActiva={senaActiva} />}
      </div>

      <div className="cta-bar">
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
