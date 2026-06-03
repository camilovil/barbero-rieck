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
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return date < today
}

function sameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
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

  const slots = TIME_SLOTS[location]

  // Fetch availability from Calendar when user picks a date
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

  function handleDateClick(day: number) {
    const d = new Date(viewYear, viewMonth, day)
    if (isSunday(d) || isPast(d)) return
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
      <h2 className="font-playfair text-2xl sm:text-3xl text-[#f5f0e8] mb-2">Elegí día y horario</h2>
      <p className="text-[#f5f0e8]/50 text-sm mb-8">Los domingos no hay turnos</p>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Calendar */}
        <div className="bg-[#222222] border border-[#3a3a3a] rounded-xl p-5">
          <div className="flex items-center justify-between mb-5">
            <button onClick={prevMonth} className="w-8 h-8 rounded-lg border border-[#3a3a3a] flex items-center justify-center text-[#f5f0e8]/60 hover:text-[#f5f0e8] hover:border-[#f5f0e8]/30 transition-all">
              ‹
            </button>
            <span className="font-semibold text-[#f5f0e8] text-sm tracking-wide uppercase">
              {MONTHS[viewMonth]} {viewYear}
            </span>
            <button onClick={nextMonth} className="w-8 h-8 rounded-lg border border-[#3a3a3a] flex items-center justify-center text-[#f5f0e8]/60 hover:text-[#f5f0e8] hover:border-[#f5f0e8]/30 transition-all">
              ›
            </button>
          </div>

          <div className="grid grid-cols-7 mb-2">
            {DAYS.map(d => (
              <div key={d} className="text-center text-[10px] uppercase tracking-wider text-[#f5f0e8]/30 py-1">
                {d}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-y-1">
            {cells.map((day, i) => {
              if (!day) return <div key={`e-${i}`} />

              const d = new Date(viewYear, viewMonth, day)
              const disabled = isSunday(d) || isPast(d)
              const isSelected = localDate && sameDay(d, localDate)
              const isToday = sameDay(d, today)

              return (
                <button
                  key={day}
                  disabled={disabled}
                  onClick={() => handleDateClick(day)}
                  className={`
                    relative mx-auto w-8 h-8 rounded-lg text-sm transition-all
                    ${disabled ? 'text-[#f5f0e8]/15 cursor-not-allowed' : 'hover:bg-[#2e2e2e] cursor-pointer'}
                    ${isSelected ? 'bg-[#f5f0e8] text-[#1a1a1a] font-semibold hover:bg-[#f5f0e8]' : ''}
                    ${!isSelected && isToday ? 'text-[#f5f0e8] font-semibold' : ''}
                    ${!isSelected && !disabled ? 'text-[#f5f0e8]/70' : ''}
                  `}
                >
                  {day}
                  {!disabled && !isSelected && (
                    <span className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-[#f5f0e8]/30" />
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
              <p className="text-[#f5f0e8]/60 text-sm mb-4">
                {localDate.toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' })}
              </p>

              {loadingSlots ? (
                <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-3 gap-2">
                  {Array.from({ length: slots.length }).map((_, i) => (
                    <div key={i} className="py-2.5 rounded-lg border border-[#2a2a2a] bg-[#222222] animate-pulse" />
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-3 gap-2">
                  {slots.map((time) => {
                    const blocked = blockedSlots.includes(time)
                    const isSelected = selectedTime === time &&
                      localDate && selectedDate &&
                      sameDay(localDate, selectedDate)

                    return (
                      <button
                        key={time}
                        disabled={blocked}
                        onClick={() => handleTimeClick(time)}
                        className={`
                          relative py-2.5 rounded-lg border text-sm font-medium transition-all
                          ${blocked ? 'border-[#2a2a2a] text-[#f5f0e8]/15 cursor-not-allowed line-through' : ''}
                          ${!blocked && isSelected ? 'border-[#f5f0e8]/40 bg-[#2e2e2e] text-[#f5f0e8]' : ''}
                          ${!blocked && !isSelected ? 'border-[#3a3a3a] text-[#f5f0e8]/70 hover:border-[#f5f0e8]/20 hover:bg-[#272727] hover:text-[#f5f0e8]' : ''}
                        `}
                      >
                        {isSelected && (
                          <span className="absolute top-1 right-1 w-3.5 h-3.5 rounded-full bg-[#f5f0e8] flex items-center justify-center">
                            <svg className="w-2 h-2 text-[#1a1a1a]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3.5}>
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
            <div className="h-full flex items-center justify-center text-[#f5f0e8]/30 text-sm text-center py-12">
              Seleccioná un día para ver los horarios disponibles
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
