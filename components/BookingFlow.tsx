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

const INITIAL_STATE: BookingState = {
  step: 1,
  location: null,
  email: '',
  service: null,
  date: null,
  time: null,
  nombre: '',
  whatsapp: '',
  direccion: '',
  nota: '',
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

export default function BookingFlow() {
  const [state, setState] = useState<BookingState>(INITIAL_STATE)
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
      if (!res.ok) throw new Error('Error al confirmar')
      setConfirmed(true)
    } catch (err) {
      console.error(err)
      alert('Hubo un error al confirmar el turno. Intentá de nuevo.')
    } finally {
      setLoading(false)
    }
  }

  function reset() {
    setState(INITIAL_STATE)
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
        <div className="flex items-center justify-between mt-10 pt-6 border-t border-[#2e2e2e]">
          <button
            onClick={goBack}
            className={`
              text-sm text-[#f5f0e8]/40 hover:text-[#f5f0e8]/70 transition-colors
              ${state.step === 1 ? 'invisible' : ''}
            `}
          >
            ← Atrás
          </button>

          <button
            onClick={goNext}
            disabled={!ready}
            className={`
              px-8 py-3 rounded-xl text-sm font-semibold tracking-wide uppercase transition-all
              ${ready
                ? 'bg-[#f5f0e8] text-[#1a1a1a] hover:bg-white active:scale-[0.99]'
                : 'bg-[#2e2e2e] text-[#f5f0e8]/20 cursor-not-allowed'
              }
            `}
          >
            {state.step === 4 ? 'Ver resumen' : 'Continuar'}
          </button>
        </div>
      )}
    </div>
  )
}
