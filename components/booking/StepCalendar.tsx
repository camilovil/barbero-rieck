'use client'

import { useState, useEffect } from 'react'
import { TIME_SLOTS, BLOCKED_SLOTS, DEPOSIT_HOLD_LABEL } from '@/lib/constants'
import type { Location } from '@/types/booking'
import { capitalize as upperFirst, toDateParam } from '@/lib/format'

interface Props {
  location: Location
  selectedDate: Date | null
  selectedTime: string | null
  /** Con la seña activa el horario no queda tomado hasta que se paga. */
  senaActiva?: boolean
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

/* El sistema muestra los horarios en dos bloques con su rótulo.
   El corte es al mediodía: antes de las 13, mañana. */
function splitByHalf(slots: string[]) {
  const manana = slots.filter(t => Number(t.slice(0, 2)) < 13)
  const tarde = slots.filter(t => Number(t.slice(0, 2)) >= 13)
  return [
    { label: 'Mañana', items: manana },
    { label: 'Tarde', items: tarde },
  ].filter(g => g.items.length > 0)
}

export default function StepCalendar({ location, selectedDate, selectedTime, senaActiva = false, onSelect }: Props) {
  const today = new Date()
  const [viewMonth, setViewMonth] = useState(today.getMonth())
  const [viewYear, setViewYear] = useState(today.getFullYear())
  const [localDate, setLocalDate] = useState<Date | null>(selectedDate)
  const [blockedSlots, setBlockedSlots] = useState<string[]>(BLOCKED_SLOTS)
  const [loadingSlots, setLoadingSlots] = useState(false)
  const [blockedDates, setBlockedDates] = useState<string[]>([])
  // Solo presentación: la tira de días es el selector primario y la
  // grilla del mes queda detrás de este toggle, para fechas lejanas.
  const [showMonth, setShowMonth] = useState(false)

  const slots = TIME_SLOTS[location]

  useEffect(() => {
    fetch('/api/blocked-dates?days=90')
      .then(r => r.json())
      .then(data => setBlockedDates(data.blocked ?? []))
      .catch(() => {})
  }, [])

  // Fetch availability — se llama al seleccionar fecha, al hacer foco y cada 30s
  function fetchSlots(date: Date, isBackground = false) {
    if (!isBackground) setLoadingSlots(true)
    fetch(`/api/availability?date=${toDateParam(date)}&location=${location}`)
      .then(r => r.json())
      .then(data => setBlockedSlots(data.blocked ?? BLOCKED_SLOTS))
      .catch(() => {})
      .finally(() => { if (!isBackground) setLoadingSlots(false) })
  }

  useEffect(() => {
    if (!localDate) return
    fetchSlots(localDate)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [localDate, location])

  // Polling cada 30s mientras hay una fecha seleccionada
  useEffect(() => {
    if (!localDate) return
    const interval = setInterval(() => fetchSlots(localDate, true), 30_000)
    return () => clearInterval(interval)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [localDate, location])

  // Refetch al volver el foco a la pestaña
  useEffect(() => {
    if (!localDate) return
    function onFocus() { fetchSlots(localDate!, true) }
    document.addEventListener('visibilitychange', onFocus)
    return () => document.removeEventListener('visibilitychange', onFocus)
  // eslint-disable-next-line react-hooks/exhaustive-deps
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
  // Misma condición que la grilla: domingo, pasado o fecha bloqueada
  function handleStripClick(d: Date) {
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

  // Próximos 24 días desde hoy — el orden y la disponibilidad
  // salen exactamente de las mismas reglas que la grilla
  const stripDays: Date[] = Array.from({ length: 24 }, (_, i) => {
    const d = new Date(today.getFullYear(), today.getMonth(), today.getDate() + i)
    return d
  })

  return (
    <div className="step-enter">
      <div className="h-step lineas"><span>Elegí día</span><span>y hora</span></div>
      <p className="sub-step">
        Los domingos no hay turnos.
        {/* El plazo se dice al elegir la hora, que es cuando empieza a
            correr: enterarse después de haber elegido es enterarse tarde. */}
        {senaActiva && ` Cuando elijas el horario te lo guardamos ${DEPOSIT_HOLD_LABEL} para que transfieras la seña.`}
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

        {/* Tira de días — selector primario, se arrastra al costado */}
        <div>
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            gap: 12, marginBottom: 11,
          }}>
            <span className="rotulo">Próximos días</span>
            <button
              type="button"
              className="link-btn"
              onClick={() => setShowMonth(v => !v)}
              aria-expanded={showMonth}
            >
              {showMonth ? 'Ocultar mes' : 'Ver mes'}
              <svg width={11} height={11} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round"
                style={{ transform: showMonth ? 'rotate(180deg)' : 'none', transition: 'transform .22s' }}>
                <path d="M6 9l6 6 6-6" />
              </svg>
            </button>
          </div>

          <div className="daystrip">
            {stripDays.map((d, i) => {
              const disabled = isSunday(d) || isPast(d) || isBlocked(d)
              const isPick = !!localDate && sameDay(d, localDate)
              const isToday = sameDay(d, today)
              const startsMonth = i > 0 && d.getDate() === 1

              return (
                <div key={d.getTime()} style={{ display: 'flex', alignItems: 'stretch', gap: 8 }}>
                  {startsMonth && (
                    <span className="rotulo" style={{
                      alignSelf: 'center', writingMode: 'vertical-rl',
                      borderLeft: '1px solid var(--border)', paddingLeft: 7,
                    }}>
                      {MONTHS[d.getMonth()].slice(0, 3)}
                    </span>
                  )}
                  {/* aria-disabled en vez de disabled: el día sigue siendo
                      enfocable, así quien navega con teclado o lector se
                      entera de que existe y de que no hay turnos. */}
                  <button
                    type="button"
                    aria-disabled={disabled || undefined}
                    onClick={() => handleStripClick(d)}
                    aria-label={`${d.toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' })}${disabled ? ' — sin turnos' : ''}`}
                    aria-current={isToday ? 'date' : undefined}
                    className={`day-chip${!disabled && isPick ? ' is-pick' : ''}${isToday ? ' is-today' : ''}`}
                  >
                    <span className="dc-dow">{DAYS[d.getDay()]}</span>
                    <span className="dc-num">{d.getDate()}</span>
                  </button>
                </div>
              )
            })}
          </div>
        </div>

        {/* Calendario del mes — para fechas más lejanas */}
        {showMonth && (
        <div style={{ border: '1px solid var(--border)', padding: '16px 16px 18px' }}>
          {/* Nav mes */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <button
              onClick={prevMonth}
              aria-label="Mes anterior"
              style={{
                width: 30, height: 30, border: '1px solid var(--border)', borderRadius: 2,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: 'var(--text)', cursor: 'pointer', background: 'none',
              }}
            >
              <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M15 5l-7 7 7 7"/></svg>
            </button>
            <span className="rotulo" style={{ color: 'var(--text)', letterSpacing: '.16em' }}>
              {MONTHS[viewMonth]} {viewYear}
            </span>
            <button
              onClick={nextMonth}
              aria-label="Mes siguiente"
              style={{
                width: 30, height: 30, border: '1px solid var(--border)', borderRadius: 2,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: 'var(--text)', cursor: 'pointer', background: 'none',
              }}
            >
              <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M9 5l7 7-7 7"/></svg>
            </button>
          </div>

          {/* Cabecera días */}
          <div style={{
            display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2,
            paddingBottom: 8, marginBottom: 6, borderBottom: '1px solid var(--border)',
          }}>
            {DAYS.map(d => (
              <div key={d} className="rotulo" style={{ textAlign: 'center', letterSpacing: '.08em' }}>
                {d.slice(0, 1)}
              </div>
            ))}
          </div>

          {/* Grilla días */}
          <div className="mono" style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2 }}>
            {cells.map((day, i) => {
              if (!day) return <div key={`e-${i}`} />
              const d = new Date(viewYear, viewMonth, day)
              const disabled = isSunday(d) || isPast(d) || isBlocked(d)
              const isSelected = localDate && sameDay(d, localDate)
              const isToday = sameDay(d, today)

              return (
                <button
                  key={day}
                  aria-disabled={disabled || undefined}
                  aria-current={isToday ? 'date' : undefined}
                  aria-label={`${day}${disabled ? ' — sin turnos' : ''}`}
                  onClick={() => handleDateClick(day)}
                  className="mono"
                  style={{
                    aspectRatio: '1', minHeight: 40,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 13, borderRadius: 2, cursor: disabled ? 'not-allowed' : 'pointer',
                    fontWeight: 500, transition: 'background .12s, color .12s, border-color .12s',
                    /* El día elegido se enciende como la tira de días:
                       en papel se invierte, en la cueva es filete vivo. */
                    background: isSelected ? 'var(--sel-bg)' : 'transparent',
                    border: `1px solid ${isSelected ? 'var(--sel-borde)' : 'transparent'}`,
                    color: disabled ? 'var(--off)' : isSelected ? 'var(--sel-fg)' : 'var(--text)',
                    textDecoration: disabled ? 'line-through' : 'none',
                    outline: isToday && !isSelected ? '1px solid var(--border-strong)' : 'none',
                    outlineOffset: -1,
                  }}
                >
                  {day}
                </button>
              )
            })}
          </div>
        </div>
        )}

        {/* Slots de hora */}
        <div>
          {localDate ? (
            <>
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                gap: 12, flexWrap: 'wrap', margin: '0 0 20px',
                paddingBottom: 12, borderBottom: '1px solid var(--text)',
              }}>
                <p style={{
                  fontSize: 15, fontWeight: 600, letterSpacing: '-.02em',
                  color: 'var(--text)', margin: 0,
                }}>
                  {upperFirst(localDate.toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' }))}
                </p>
                <div className="slot-legend">
                  <span><i className="is-free" />Libre</span>
                  <span><i className="is-busy" />Ocupado</span>
                  <span><i className="is-pick" />Elegido</span>
                </div>
              </div>

              {loadingSlots ? (
                <div className="slot-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
                  {Array.from({ length: slots.length }).map((_, i) => (
                    <div key={i} className="slot-skeleton" />
                  ))}
                </div>
              ) : (
                splitByHalf(slots).map((group, gi) => (
                  <div key={group.label} style={{ marginTop: gi === 0 ? 0 : 26 }}>
                    <div className="rotulo rotulo-rule">{group.label}</div>
                    <div className="slot-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
                      {group.items.map((time) => {
                        const blocked = blockedSlots.includes(time)
                        const isSelected = selectedTime === time && localDate && selectedDate && sameDay(localDate, selectedDate)

                        return (
                          <button
                            key={time}
                            aria-disabled={blocked || undefined}
                            onClick={() => handleTimeClick(time)}
                            aria-label={`${time} — ${blocked ? 'ocupado' : 'libre'}`}
                            className={`slot${!blocked && isSelected ? ' is-pick' : ''}`}
                          >
                            {time}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                ))
              )}
            </>
          ) : (
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              minHeight: 96, padding: '20px 16px',
              border: '1px solid var(--border-soft)',
              textAlign: 'center', lineHeight: 1.6,
            }}>
              <span className="rotulo" style={{ letterSpacing: '.14em', lineHeight: 1.8 }}>
                Elegí un día para ver los horarios
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
