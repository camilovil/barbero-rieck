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

  useEffect(() => {
    fetch('/api/blocked-dates?days=90')
      .then(r => r.json())
      .then(data => setBlockedDates(data.blocked ?? []))
      .catch(() => {})
  }, [])

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
  function isBlocked(date: Date) { return blockedDates.includes(toDateParam(date)) }
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
    <div className="step-enter">
      <div style={{ fontFamily: 'var(--font-anton, "Anton"), sans-serif', fontSize: 25, letterSpacing: '.3px', margin: '0 0 3px', color: 'var(--text)' }}>
        Día y horario
      </div>
      <p style={{ fontSize: 12.5, color: 'var(--text-mut)', fontWeight: 600, margin: '0 0 16px' }}>
        Los domingos no hay turnos
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {/* Calendario */}
        <div style={{
          border: '2.5px solid var(--border)', borderRadius: 16,
          padding: 14, background: 'var(--surface)',
        }}>
          {/* Nav mes */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <button
              onClick={prevMonth}
              style={{
                width: 28, height: 28, border: '2px solid var(--border)', borderRadius: 9,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontWeight: 800, color: 'var(--text)', cursor: 'pointer', background: 'none',
                fontSize: 16, transition: '.15s',
              }}
            >‹</button>
            <span style={{
              fontFamily: 'var(--font-anton, "Anton"), sans-serif',
              fontSize: 14, letterSpacing: '1.5px', textTransform: 'uppercase', color: 'var(--text)',
            }}>
              {MONTHS[viewMonth].toUpperCase()} {viewYear}
            </span>
            <button
              onClick={nextMonth}
              style={{
                width: 28, height: 28, border: '2px solid var(--border)', borderRadius: 9,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontWeight: 800, color: 'var(--text)', cursor: 'pointer', background: 'none',
                fontSize: 16, transition: '.15s',
              }}
            >›</button>
          </div>

          {/* Cabecera días */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2, marginBottom: 4 }}>
            {DAYS.map(d => (
              <div key={d} style={{ textAlign: 'center', fontSize: 9, fontWeight: 800, color: 'var(--text-mut)', padding: '3px 0' }}>
                {d}
              </div>
            ))}
          </div>

          {/* Grilla días */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 3 }}>
            {cells.map((day, i) => {
              if (!day) return <div key={`e-${i}`} />
              const d = new Date(viewYear, viewMonth, day)
              const disabled = isSunday(d) || isPast(d) || isBlocked(d)
              const isSelected = localDate && sameDay(d, localDate)
              const isToday = sameDay(d, today)

              return (
                <button
                  key={day}
                  disabled={disabled}
                  onClick={() => handleDateClick(day)}
                  style={{
                    position: 'relative',
                    aspectRatio: '1', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 13, borderRadius: 10, border: 'none', cursor: disabled ? 'not-allowed' : 'pointer',
                    fontWeight: 700, transition: '.12s',
                    background: isSelected ? 'var(--celeste)' : 'transparent',
                    color: disabled ? 'var(--off)' : isSelected ? '#fff' : isToday ? 'var(--text)' : 'var(--text)',
                    opacity: disabled ? .4 : 1,
                    outline: isToday && !isSelected ? '1.5px solid var(--celeste-deep)' : 'none',
                  }}
                >
                  {day}
                  {/* Punto dorado en días disponibles */}
                  {!disabled && !isSelected && (
                    <span style={{
                      position: 'absolute', bottom: 4, left: '50%', transform: 'translateX(-50%)',
                      width: 4, height: 4, borderRadius: '50%', background: 'var(--gold)',
                      display: 'block',
                    }} />
                  )}
                </button>
              )
            })}
          </div>
        </div>

        {/* Slots de hora */}
        <div>
          {localDate ? (
            <>
              <p style={{ fontSize: 12, fontWeight: 800, color: 'var(--text)', margin: '0 0 10px', textTransform: 'capitalize' }}>
                {localDate.toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' })}
              </p>

              {loadingSlots ? (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                  {Array.from({ length: slots.length }).map((_, i) => (
                    <div key={i} style={{
                      padding: '9px 0', borderRadius: 11, border: '2px solid var(--border)',
                      background: 'var(--chip-bg)', opacity: .5,
                    }} />
                  ))}
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                  {slots.map((time) => {
                    const blocked = blockedSlots.includes(time)
                    const isSelected = selectedTime === time && localDate && selectedDate && sameDay(localDate, selectedDate)

                    return (
                      <button
                        key={time}
                        disabled={blocked}
                        onClick={() => handleTimeClick(time)}
                        style={{
                          border: '2px solid', borderRadius: 11,
                          padding: '9px 0', textAlign: 'center',
                          fontWeight: 800, fontSize: 12.5, cursor: blocked ? 'not-allowed' : 'pointer',
                          transition: '.15s', fontFamily: 'inherit',
                          background: isSelected ? 'var(--celeste)' : 'transparent',
                          color: blocked ? 'var(--off)' : isSelected ? '#fff' : 'var(--text)',
                          borderColor: blocked ? 'var(--border-soft)' : isSelected ? 'var(--celeste)' : 'var(--border)',
                          textDecoration: blocked ? 'line-through' : 'none',
                        }}
                      >
                        {time}
                      </button>
                    )
                  })}
                </div>
              )}
            </>
          ) : (
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              minHeight: 80, fontSize: 13, color: 'var(--text-mut)', fontWeight: 600,
            }}>
              Seleccioná un día para ver los horarios disponibles
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
