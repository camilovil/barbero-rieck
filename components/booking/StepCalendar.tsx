'use client'

import { useState, useEffect } from 'react'
import { TIME_SLOTS, BLOCKED_SLOTS } from '@/lib/constants'
import type { Location } from '@/types/booking'

interface Props {
  location: Location
  selectedDate: Date | null
  selectedTime: string | null
  onSelect: (date: Date, time: string) => void
}

const MONTHS = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
]
const DAYS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']

function isSunday(date: Date) { return date.getDay() === 0 }
function isPast(date: Date) {
  const today = new Date(); today.setHours(0, 0, 0, 0); return date < today
}
function sameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
}
function toDateParam(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export default function StepCalendar({ location, selectedDate, selectedTime, onSelect }: Props) {
  const today = new Date()
  const [viewMonth, setViewMonth] = useState(today.getMonth())
  const [viewYear, setViewYear] = useState(today.getFullYear())
  const [localDate, setLocalDate] = useState<Date | null>(selectedDate)
  const [blockedSlots, setBlockedSlots] = useState<string[]>(BLOCKED_SLOTS)
  const [loadingSlots, setLoadingSlots] = useState(false)
  const [blockedDates, setBlockedDates] = useState<string[]>([])

  const slots = TIME_SLOTS[location]

  // Fetch blocked dates for visual calendar feedback
  useEffect(() => {
    fetch('/api/blocked-dates?days=90')
      .then(r => r.json())
      .then(data => setBlockedDates(data.blocked ?? []))
      .catch(() => {})
  }, [])

  // Fetch available slots when a date is selected
  useEffect(() => {
    if (!localDate) return
    setLoadingSlots(true)
    fetch(`/api/availability?date=${toDateParam(localDate)}&location=${location}`)
      .then(r => r.json())
      .then(data => setBlockedSlots(data.blocked ?? BLOCKED_SLOTS))
      .catch(() => setBlockedSlots(BLOCKED_SLOTS))
      .finally(() => setLoadingSlots(false))
  }, [localDate, location])

  const firstDay = new Date(viewYear, viewMonth, 1).getDay()
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate()

  function prevMonth() {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1) }
    else setViewMonth(m => m - 1)
  }
  function nextMonth() {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1) }
    else setViewMonth(m => m + 1)
  }
  function isBlocked(date: Date): boolean {
    return blockedDates.includes(toDateParam(date))
  }
  function handleDateClick(day: number) {
    const d = new Date(viewYear, viewMonth, day)
    if (isSunday(d) || isPast(d) || isBlocked(d)) return
    setLocalDate(d)
  }
  function handleTimeClick(time: string) {
    if (!localDate || blockedSlots.includes(time)) return
    onSelect(localDate, time)
  }

  const cells: (number | null)[] = [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ]

  return (
    <div>
      <h2 className="font-playfair text-2xl sm:text-3xl mb-2" style={{color:'var(--text)'}}>Elegí día y horario</h2>
      <p className="text-sm mb-6" style={{color:'var(--text-muted)'}}>Los domingos no hay turnos</p>

      {/* En mobile: columna. En desktop: dos columnas */}
      <div className="flex flex-col gap-6 lg:grid lg:grid-cols-2">
        {/* Calendar */}
        <div className="rounded-xl p-4 sm:p-5 border" style={{background:'var(--bg-card)', borderColor:'var(--border-2)'}}>
          <div className="flex items-center justify-between mb-5">
            <button onClick={prevMonth} className="w-9 h-9 rounded-lg border flex items-center justify-center transition-all cursor-pointer text-lg"
              style={{borderColor:'var(--border-2)', color:'var(--text-muted)'}}>‹</button>
            <span className="font-semibold text-sm tracking-wide uppercase" style={{color:'var(--text)'}}>
              {MONTHS[viewMonth]} {viewYear}
            </span>
            <button onClick={nextMonth} className="w-9 h-9 rounded-lg border flex items-center justify-center transition-all cursor-pointer text-lg"
              style={{borderColor:'var(--border-2)', color:'var(--text-muted)'}}>›</button>
          </div>

          <div className="grid grid-cols-7 mb-2">
            {DAYS.map(d => (
              <div key={d} className="text-center text-[10px] uppercase tracking-wider py-1" style={{color:'var(--text-faint)'}}>
                {d}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-y-1">
            {cells.map((day, i) => {
              if (!day) return <div key={`e-${i}`} />
              const d = new Date(viewYear, viewMonth, day)
              const disabled = isSunday(d) || isPast(d) || isBlocked(d)
              const isSelected = localDate && sameDay(d, localDate)
              const isToday = sameDay(d, today)
              const blocked = isBlocked(d)

              return (
                <button
                  key={day}
                  disabled={disabled}
                  onClick={() => handleDateClick(day)}
                  className="relative mx-auto w-9 h-9 rounded-lg text-sm transition-all"
                  style={
                    disabled
                      ? { color: 'var(--text-xfaint)', cursor: 'not-allowed', textDecoration: blocked ? 'line-through' : 'none' }
                      : isSelected
                      ? { background: 'var(--text)', color: 'var(--bg)', fontWeight: 600, cursor: 'pointer' }
                      : isToday
                      ? { color: 'var(--text)', fontWeight: 600, cursor: 'pointer' }
                      : { color: 'var(--text-muted)', cursor: 'pointer' }
                  }
                >
                  {day}
                  {!disabled && !isSelected && (
                    <span className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full"
                      style={{background:'var(--text-faint)'}} />
                  )}
                </button>
              )
            })}
          </div>
        </div>

        {/* Time slots */}
        <div>
          {localDate ? (
            <>
              <p className="text-sm mb-4 capitalize" style={{color:'var(--text-muted)'}}>
                {localDate.toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' })}
              </p>

              {loadingSlots ? (
                <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-3 gap-2">
                  {Array.from({ length: slots.length }).map((_, i) => (
                    <div key={i} className="py-3 rounded-lg border animate-pulse" style={{borderColor:'var(--border)', background:'var(--bg-card)'}} />
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-3 gap-2">
                  {slots.map((time) => {
                    const blocked = blockedSlots.includes(time)
                    const isSelected = selectedTime === time && localDate && selectedDate && sameDay(localDate, selectedDate)

                    return (
                      <button
                        key={time}
                        disabled={blocked}
                        onClick={() => handleTimeClick(time)}
                        className="relative py-3 rounded-lg border text-sm font-medium transition-all"
                        style={
                          blocked
                            ? { borderColor: 'var(--border)', color: 'var(--text-xfaint)', cursor: 'not-allowed', textDecoration: 'line-through' }
                            : isSelected
                            ? { borderColor: 'var(--text-muted)', background: 'var(--bg-active)', color: 'var(--text)', cursor: 'pointer' }
                            : { borderColor: 'var(--border-2)', color: 'var(--text-muted)', cursor: 'pointer' }
                        }
                      >
                        {isSelected && (
                          <span className="absolute top-1 right-1 w-3.5 h-3.5 rounded-full flex items-center justify-center"
                            style={{background:'var(--text)'}}>
                            <svg className="w-2 h-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3.5}
                              style={{color:'var(--bg)'}}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                            </svg>
                          </span>
                        )}
                        {time}
                      </button>
                    )
                  })}
                </div>
              )}
            </>
          ) : (
            <div className="h-full flex items-center justify-center text-sm text-center py-12" style={{color:'var(--text-faint)'}}>
              Seleccioná un día para ver los horarios disponibles
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
