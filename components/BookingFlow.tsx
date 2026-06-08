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

  return {
    step,
    location,
    email: '',
    service,
    date: null,
    time: null,
    nombre: '',
    whatsapp: '',
    direccion: '',
    nota: '',
  }
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
  }

  if (confirmed) {
    return <StepSuccess booking={state} onReset={reset} />
  }

  const ready = canAdvance(state)

  return (
    <div>
      <StepIndicator current={state.step} />

      <div className="min-h-[340px]">
        {state.step === 1 && (
          <StepLocation
            selected={state.location}
            onSelect={(loc: Location) => {
              update({ location: loc, service: null })
            }}
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
            loading={loading}
          />
        )}
      </div>

      {/* Navigation */}
      {state.step < 5 && (
        <div className="flex items-center justify-between mt-10 pt-6 border-t" style={{borderColor:'var(--border)'}}>
          <button
            onClick={goBack}
            style={state.step === 1 ? {} : {color:'var(--text-muted)', borderColor:'var(--border-2)'}}
            className={`
              flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium border transition-all hover:opacity-100
              ${state.step === 1 ? 'invisible' : ''}
            `}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7"/>
            </svg>
            Volver
          </button>

          <button
            onClick={goNext}
            disabled={!ready}
            className={`
              flex items-center gap-2 px-8 py-3 rounded-xl text-sm font-semibold tracking-wide uppercase transition-all
              ${ready ? 'active:scale-[0.99]' : 'cursor-not-allowed opacity-30'}
            `}
            style={ready ? {background:'var(--text)', color:'var(--bg)'} : {background:'var(--bg-active)', color:'var(--text-xfaint)'}}
          >
            {state.step === 4 ? 'Ver resumen' : 'Continuar'}
            {ready && (
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7"/>
              </svg>
            )}
          </button>
        </div>
      )}
    </div>
  )
}
