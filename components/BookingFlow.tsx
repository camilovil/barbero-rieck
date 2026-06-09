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
import { SERVICES } from '@/lib/constants'

interface Props {
  initialLocation?: Location | null
  initialServicio?: string | null
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

export default function BookingFlow({ initialLocation = null, initialServicio = null }: Props) {
  const [state, setState] = useState<BookingState>(() => buildInitialState(initialLocation, initialServicio))
  const [loading, setLoading] = useState(false)
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

  return (
    <div>
      <StepIndicator current={state.step} />

      <div style={{ minHeight: 340 }}>
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
        {state.step === 5 && (
          <StepResumen
            booking={state}
            onConfirm={handleConfirm}
            onBack={goBack}
            loading={loading}
          />
        )}
      </div>

      {/* Footer de navegación — oculto en paso 5 (tiene su propio CTA) */}
      {state.step < 5 && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 12,
          marginTop: 24, paddingTop: 14,
          borderTop: '2px solid var(--border-soft)',
        }}>
          {/* Atrás */}
          <button
            onClick={goBack}
            style={{
              visibility: state.step === 1 ? 'hidden' : 'visible',
              background: 'none', border: 'none',
              color: 'var(--text-mut)', fontWeight: 800, fontSize: 12.5,
              fontFamily: 'inherit', letterSpacing: '.3px',
              cursor: 'pointer', padding: '6px 4px', transition: 'color .15s',
            }}
          >
            ← Atrás
          </button>

          {/* Continuar (pill CTA) */}
          <button
            onClick={goNext}
            disabled={!ready}
            className={`btn-cta${state.step === 4 ? ' final' : ''}`}
            style={{ marginLeft: 'auto' }}
          >
            {state.step === 4 ? 'VER RESUMEN' : 'CONTINUAR'}
            {ready && (
              <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 5l7 7-7 7"/>
              </svg>
            )}
          </button>
        </div>
      )}
    </div>
  )
}
