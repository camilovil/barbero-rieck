'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import type { BookingEvent } from '@/lib/googleCalendar'

function formatDay(dateStr: string): string {
  const d = new Date(dateStr)
  const today = new Date()
  const tomorrow = new Date(today)
  tomorrow.setDate(today.getDate() + 1)
  if (d.toDateString() === today.toDateString()) return 'Hoy'
  if (d.toDateString() === tomorrow.toDateString()) return 'Mañana'
  return d.toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' })
}

function formatTime(dateStr: string): string {
  return new Date(dateStr).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })
}

function groupByDay(events: BookingEvent[]): [string, BookingEvent[]][] {
  const map = new Map<string, BookingEvent[]>()
  for (const e of events) {
    const day = new Date(e.start).toDateString()
    if (!map.has(day)) map.set(day, [])
    map.get(day)!.push(e)
  }
  return Array.from(map.entries()).map(([day, evs]) => [formatDay(evs[0].start), evs])
}

function toDateParam(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

const WEEK_DAYS_SHORT = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']

export default function AdminDashboard() {
  const router = useRouter()
  const [events, setEvents] = useState<BookingEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [cancelling, setCancelling] = useState<string | null>(null)
  const [filter, setFilter] = useState<'upcoming' | 'today' | 'week'>('upcoming')

  // Blocked dates
  const [blockedDates, setBlockedDates] = useState<{ id: string; date: string }[]>([])
  const [blockInput, setBlockInput] = useState('')
  const [blockingDate, setBlockingDate] = useState(false)
  const [showBlocked, setShowBlocked] = useState(false)

  // Settings
  const [maxDaily, setMaxDaily] = useState(8)
  const [maxDailyInput, setMaxDailyInput] = useState(8)
  const [savingSettings, setSavingSettings] = useState(false)

  const fetchEvents = useCallback(async () => {
    setLoading(true)
    const res = await fetch('/api/admin/bookings')
    const data = await res.json()
    setEvents(data.events ?? [])
    setLoading(false)
  }, [])

  const fetchBlockedDates = useCallback(async () => {
    const res = await fetch('/api/admin/blocked-dates')
    const data = await res.json()
    setBlockedDates(data.blocked ?? [])
  }, [])

  useEffect(() => {
    fetchEvents()
    fetchBlockedDates()
    fetch('/api/admin/settings')
      .then(r => r.json())
      .then(d => { setMaxDaily(d.maxDailyBookings); setMaxDailyInput(d.maxDailyBookings) })
      .catch(() => {})
  }, [fetchEvents, fetchBlockedDates])

  async function handleLogout() {
    await fetch('/api/admin/login', { method: 'DELETE' })
    router.push('/admin/login')
  }

  async function handleCancel(eventId: string, nombre: string) {
    if (!confirm(`¿Cancelar el turno de ${nombre}?`)) return
    setCancelling(eventId)
    const res = await fetch('/api/admin/cancelar', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ eventId }),
    })
    if (res.ok) setEvents(prev => prev.filter(e => e.id !== eventId))
    setCancelling(null)
  }

  async function handleBlockDate() {
    if (!blockInput) return
    setBlockingDate(true)
    const res = await fetch('/api/admin/blocked-dates', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ date: blockInput }),
    })
    if (res.ok) {
      await fetchBlockedDates()
      setBlockInput('')
    }
    setBlockingDate(false)
  }

  async function handleSaveSettings() {
    setSavingSettings(true)
    const res = await fetch('/api/admin/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ maxDailyBookings: maxDailyInput }),
    })
    if (res.ok) setMaxDaily(maxDailyInput)
    setSavingSettings(false)
  }

  async function handleUnblock(eventId: string) {
    const res = await fetch('/api/admin/blocked-dates', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ eventId }),
    })
    if (res.ok) setBlockedDates(prev => prev.filter(b => b.id !== eventId))
  }

  // Week view helpers
  function getWeekDays(): Date[] {
    const today = new Date()
    const day = today.getDay()
    const monday = new Date(today)
    monday.setDate(today.getDate() - day + 1)
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(monday)
      d.setDate(monday.getDate() + i)
      return d
    })
  }

  const weekDays = getWeekDays()

  const filtered = filter === 'today'
    ? events.filter(e => new Date(e.start).toDateString() === new Date().toDateString())
    : filter === 'week'
    ? events.filter(e => {
        const d = new Date(e.start)
        return d >= weekDays[0] && d <= weekDays[6]
      })
    : events

  const grouped = groupByDay(filtered)
  const totalHoy = events.filter(e => new Date(e.start).toDateString() === new Date().toDateString()).length

  return (
    <div className="min-h-screen flex flex-col" style={{background:'var(--bg)'}}>
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 backdrop-blur-sm border-b" style={{background:'var(--bg-2)', borderColor:'var(--border)'}}>
        <div className="max-w-3xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.png" alt="Santi Barber" width={32} height={32} className="rounded-full object-cover" />
            <div className="flex flex-col leading-tight">
              <span style={{fontFamily:'var(--font-permanent-marker)', fontSize:'1.1rem', lineHeight:1.1}}>
                <span style={{color:'var(--text)'}}>Santi </span>
                <span style={{color:'#F5E6C8'}}>Barber</span>
              </span>
              <span style={{fontSize:'0.55rem', letterSpacing:'0.15em', textTransform:'uppercase', color:'var(--text-faint)'}}>Barbería</span>
            </div>
            <span className="text-[10px] uppercase tracking-widest border px-2 py-0.5 rounded" style={{color:'var(--text-faint)', borderColor:'var(--border)'}}>Admin</span>
          </div>
          <button onClick={handleLogout} className="text-xs transition-colors" style={{color:'var(--text-faint)'}}>
            Salir
          </button>
        </div>
      </header>

      <main className="flex-1 pt-24 pb-16 px-4 sm:px-6 max-w-3xl mx-auto w-full">

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 mb-8">
          {[
            ['Hoy', totalHoy],
            ['30 días', events.length],
            ['Esta semana', events.filter(e => {
              const d = new Date(e.start)
              return d >= weekDays[0] && d <= weekDays[6]
            }).length],
          ].map(([label, count]) => (
            <div key={label as string} className="border rounded-xl p-4" style={{background:'var(--bg-2)', borderColor:'var(--border)'}}>
              <div className="text-2xl font-bold" style={{color:'var(--text)'}}>{count}</div>
              <div className="text-xs mt-1" style={{color:'var(--text-faint)'}}>{label}</div>
            </div>
          ))}
        </div>

        {/* Filtros */}
        <div className="flex items-center gap-2 mb-6 flex-wrap">
          {(['upcoming', 'today', 'week'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className="px-4 py-1.5 rounded-lg text-xs font-medium uppercase tracking-wide transition-all"
              style={filter === f
                ? {background:'var(--text)', color:'var(--bg)'}
                : {border:'1px solid var(--border)', color:'var(--text-muted)'}}
            >
              {f === 'today' ? 'Hoy' : f === 'week' ? 'Semana' : 'Todos'}
            </button>
          ))}
          <button onClick={fetchEvents} className="ml-auto text-xs transition-colors" style={{color:'var(--text-faint)'}}>
            ↻ Actualizar
          </button>
        </div>

        {/* Vista semanal */}
        {filter === 'week' && (
          <div className="mb-6 border rounded-xl overflow-hidden" style={{borderColor:'var(--border)'}}>
            <div className="grid grid-cols-7">
              {weekDays.map((day, i) => {
                const dayEvents = events.filter(e => new Date(e.start).toDateString() === day.toDateString())
                const isToday = day.toDateString() === new Date().toDateString()
                return (
                  <div key={i} className="border-r last:border-r-0 min-h-[80px]" style={{borderColor:'var(--border)'}}>
                    <div className="text-center py-2 border-b text-[10px] uppercase tracking-wide" style={{borderColor:'var(--border)', background:'var(--bg-2)'}}>
                      <div style={{color:'var(--text-faint)'}}>{WEEK_DAYS_SHORT[day.getDay()]}</div>
                      <div className="font-bold text-sm" style={{
                        color: isToday ? 'var(--text)' : 'var(--text-muted)',
                        background: isToday ? 'var(--bg-active)' : 'transparent',
                        borderRadius: '50%',
                        width: 24, height: 24,
                        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                      }}>
                        {day.getDate()}
                      </div>
                    </div>
                    <div className="p-1 space-y-1">
                      {dayEvents.map(ev => (
                        <div key={ev.id} className="rounded px-1 py-0.5 text-[10px] leading-tight truncate"
                          style={{background:'var(--bg-active)', color:'var(--text-muted)'}}>
                          {formatTime(ev.start)} {ev.nombre.split(' ')[0]}
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Lista */}
        {loading ? (
          <div className="space-y-3">
            {[1,2,3].map(i => (
              <div key={i} className="h-24 rounded-xl animate-pulse border" style={{background:'var(--bg-2)', borderColor:'var(--border)'}} />
            ))}
          </div>
        ) : grouped.length === 0 ? (
          <div className="text-center py-16 text-sm" style={{color:'var(--text-faint)'}}>
            {filter === 'today' ? 'No hay turnos para hoy' : filter === 'week' ? 'No hay turnos esta semana' : 'No hay turnos próximos'}
          </div>
        ) : (
          <div className="space-y-8">
            {grouped.map(([day, dayEvents]) => (
              <div key={day}>
                <h2 className="text-xs uppercase tracking-widest mb-3 font-semibold capitalize" style={{color:'var(--text-faint)'}}>
                  {day} · {dayEvents.length} {dayEvents.length === 1 ? 'turno' : 'turnos'}
                </h2>
                <div className="space-y-2">
                  {dayEvents.map(ev => (
                    <div key={ev.id} className="border rounded-xl p-4 flex items-start gap-3" style={{background:'var(--bg-2)', borderColor:'var(--border)'}}>
                      {/* Hora */}
                      <div className="text-base font-bold shrink-0 min-w-[52px]" style={{color:'var(--text)'}}>
                        {formatTime(ev.start)}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-sm" style={{color:'var(--text)'}}>{ev.nombre}</span>
                          <span className="text-[10px] uppercase tracking-wide border px-2 py-0.5 rounded" style={{color:'var(--text-faint)', borderColor:'var(--border)'}}>
                            {ev.modalidad?.includes('domicilio') ? '🏠 domicilio' : '✂️ local'}
                          </span>
                        </div>
                        <div className="text-sm mt-0.5" style={{color:'var(--text-muted)'}}>{ev.servicio}</div>
                        {ev.nota && (
                          <div className="text-xs mt-1 italic" style={{color:'var(--text-faint)'}}>"{ev.nota}"</div>
                        )}
                        <div className="flex items-center gap-3 mt-2 flex-wrap">
                          {ev.whatsapp && (
                            <>
                              <a href={`tel:${ev.whatsapp.replace(/\D/g, '')}`}
                                className="text-xs transition-colors" style={{color:'var(--text-muted)'}}>
                                {ev.whatsapp}
                              </a>
                              <a href={`https://wa.me/${ev.whatsapp.replace(/\D/g, '')}`}
                                target="_blank" rel="noopener noreferrer"
                                className="text-xs text-green-500 transition-colors">
                                WhatsApp →
                              </a>
                            </>
                          )}
                          {ev.email && (
                            <a href={`mailto:${ev.email}`} className="text-xs transition-colors" style={{color:'var(--text-faint)'}}>
                              {ev.email}
                            </a>
                          )}
                        </div>
                      </div>

                      {/* Cancel */}
                      <button
                        onClick={() => handleCancel(ev.id, ev.nombre)}
                        disabled={cancelling === ev.id}
                        className="text-red-400 border border-red-400/40 hover:bg-red-400/10 transition-colors text-xs shrink-0 disabled:opacity-50 px-3 py-1 rounded-lg whitespace-nowrap"
                      >
                        {cancelling === ev.id ? 'Cancelando...' : 'Cancelar'}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ─── Configuración ─── */}
        <div className="mt-12 border-t pt-10" style={{borderColor:'var(--border)'}}>
          <h3 className="text-sm font-semibold mb-6" style={{color:'var(--text)'}}>⚙️ Configuración</h3>
          <div className="border rounded-xl p-5" style={{background:'var(--bg-2)', borderColor:'var(--border)'}}>
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div>
                <p className="text-sm font-medium" style={{color:'var(--text)'}}>Límite de turnos por día</p>
                <p className="text-xs mt-0.5" style={{color:'var(--text-faint)'}}>
                  Actual: <strong style={{color:'var(--text)'}}>{maxDaily}</strong> turnos máximos
                </p>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={1}
                  max={30}
                  value={maxDailyInput}
                  onChange={e => setMaxDailyInput(Number(e.target.value))}
                  className="w-16 text-center rounded-lg border px-2 py-2 text-sm outline-none"
                  style={{background:'var(--bg)', borderColor:'var(--border)', color:'var(--text)'}}
                />
                <button
                  onClick={handleSaveSettings}
                  disabled={savingSettings || maxDailyInput === maxDaily}
                  className="px-4 py-2 rounded-lg text-sm font-semibold disabled:opacity-40 transition-all"
                  style={{background:'var(--text)', color:'var(--bg)'}}
                >
                  {savingSettings ? '...' : 'Guardar'}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* ─── Gestión de días bloqueados ─── */}
        <div className="mt-12 border-t pt-10" style={{borderColor:'var(--border)'}}>
          <button
            onClick={() => setShowBlocked(v => !v)}
            className="flex items-center gap-2 text-sm font-semibold mb-6 w-full text-left"
            style={{color:'var(--text)'}}
          >
            <span>🚫 Bloquear días sin turnos</span>
            <span className="ml-auto text-xs" style={{color:'var(--text-faint)'}}>{showBlocked ? '▲ Ocultar' : '▼ Ver'}</span>
          </button>

          {showBlocked && (
            <div>
              {/* Input para bloquear */}
              <div className="flex gap-2 mb-6">
                <input
                  type="date"
                  value={blockInput}
                  onChange={e => setBlockInput(e.target.value)}
                  min={toDateParam(new Date())}
                  className="flex-1 rounded-lg border px-3 py-2 text-sm outline-none"
                  style={{background:'var(--bg-2)', borderColor:'var(--border)', color:'var(--text)'}}
                />
                <button
                  onClick={handleBlockDate}
                  disabled={!blockInput || blockingDate}
                  className="px-4 py-2 rounded-lg text-sm font-semibold disabled:opacity-50 transition-all"
                  style={{background:'var(--text)', color:'var(--bg)'}}
                >
                  {blockingDate ? '...' : 'Bloquear'}
                </button>
              </div>

              {/* Lista de días bloqueados */}
              {blockedDates.length === 0 ? (
                <p className="text-sm" style={{color:'var(--text-faint)'}}>No hay días bloqueados.</p>
              ) : (
                <div className="space-y-2">
                  {blockedDates.map(b => {
                    const [year, month, day] = b.date.split('-').map(Number)
                    const d = new Date(year, month - 1, day)
                    const label = d.toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
                    return (
                      <div key={b.id} className="flex items-center justify-between border rounded-xl px-4 py-3"
                        style={{background:'var(--bg-2)', borderColor:'var(--border)'}}>
                        <span className="text-sm capitalize" style={{color:'var(--text)'}}>{label}</span>
                        <button
                          onClick={() => handleUnblock(b.id)}
                          className="text-xs text-red-400 border border-red-400/40 hover:bg-red-400/10 transition-colors px-3 py-1 rounded-lg"
                        >
                          Desbloquear
                        </button>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}
        </div>

      </main>
    </div>
  )
}
