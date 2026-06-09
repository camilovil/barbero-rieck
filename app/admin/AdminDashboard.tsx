'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import type { BookingEvent } from '@/lib/googleCalendar'
import ThemeToggle from '@/components/ThemeToggle'

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
  const [cancelTarget, setCancelTarget] = useState<BookingEvent | null>(null)
  const [cancelReason, setCancelReason] = useState('')
  const [filter, setFilter] = useState<'upcoming' | 'today' | 'week'>('upcoming')
  const [search, setSearch] = useState('')

  // Modificar turno
  const [editing, setEditing] = useState<BookingEvent | null>(null)
  const [editDate, setEditDate] = useState('')
  const [editTime, setEditTime] = useState('')
  const [saving, setSaving] = useState(false)
  const [editBlockedSlots, setEditBlockedSlots] = useState<string[]>([])
  const [loadingEditSlots, setLoadingEditSlots] = useState(false)

  // Blocked dates
  const [blockedDates, setBlockedDates] = useState<{ id: string; date: string }[]>([])
  const [blockFrom, setBlockFrom] = useState('')
  const [blockTo, setBlockTo] = useState('')
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

  async function confirmCancel() {
    if (!cancelTarget) return
    setCancelling(cancelTarget.id)
    const res = await fetch('/api/admin/cancelar', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ eventId: cancelTarget.id, reason: cancelReason.trim() || undefined }),
    })
    if (res.ok) setEvents(prev => prev.filter(e => e.id !== cancelTarget.id))
    setCancelling(null)
    setCancelTarget(null)
    setCancelReason('')
  }

  async function handleBlockDate() {
    if (!blockFrom) return
    setBlockingDate(true)
    const res = await fetch('/api/admin/blocked-dates', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ dateFrom: blockFrom, dateTo: blockTo || blockFrom }),
    })
    if (res.ok) {
      await fetchBlockedDates()
      setBlockFrom('')
      setBlockTo('')
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

  function fetchEditSlots(dateStr: string, modalidad: string) {
    const loc = modalidad.toLowerCase().includes('domicilio') ? 'domicilio' : 'local'
    setLoadingEditSlots(true)
    fetch(`/api/availability?date=${dateStr}&location=${loc}`)
      .then(r => r.json())
      .then(data => setEditBlockedSlots(data.blocked ?? []))
      .catch(() => setEditBlockedSlots([]))
      .finally(() => setLoadingEditSlots(false))
  }

  function openEdit(ev: BookingEvent) {
    const d = new Date(ev.start)
    const dateStr = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
    const timeStr = d.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', hour12: false })
    setEditing(ev)
    setEditDate(dateStr)
    setEditTime(timeStr)
    setEditBlockedSlots([])
    fetchEditSlots(dateStr, ev.modalidad)
  }

  async function handleSaveEdit() {
    if (!editing || !editDate || !editTime) return
    setSaving(true)
    try {
      const res = await fetch('/api/admin/modificar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ eventId: editing.id, newDate: editDate, newTime: editTime }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Error')
      // Update local state: replace old event with updated times
      setEvents(prev => prev.map(e => {
        if (e.id !== editing.id) return e
        const [h, m] = editTime.split(':').map(Number)
        const newStart = new Date(editDate)
        newStart.setHours(h, m, 0, 0)
        const newEnd = new Date(newStart.getTime() + 60 * 60000)
        return { ...e, id: data.newEventId, start: newStart.toISOString(), end: newEnd.toISOString() }
      }))
      setEditing(null)
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error al modificar')
    } finally {
      setSaving(false)
    }
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

  const filtered = (filter === 'today'
    ? events.filter(e => new Date(e.start).toDateString() === new Date().toDateString())
    : filter === 'week'
    ? events.filter(e => {
        const d = new Date(e.start)
        return d >= weekDays[0] && d <= weekDays[6]
      })
    : events
  ).filter(e =>
    !search.trim() ||
    e.nombre.toLowerCase().includes(search.toLowerCase()) ||
    e.servicio.toLowerCase().includes(search.toLowerCase()) ||
    e.whatsapp.includes(search)
  )

  const grouped = groupByDay(filtered)
  const totalHoy = events.filter(e => new Date(e.start).toDateString() === new Date().toDateString()).length

  return (
    <div className="min-h-screen flex flex-col" style={{background:'var(--app-bg)'}}>
      {/* Header — Argentina theme */}
      <header className="fixed top-0 left-0 right-0 z-50" style={{
        background: 'linear-gradient(135deg, #75AADB 0%, #0B1F47 100%)',
        boxShadow: '0 2px 16px rgba(11,31,71,.45)',
      }}>
        {/* top celeste stripe */}
        <div style={{height: 4, background: '#75AADB', opacity: .45}} />
        <div className="max-w-3xl mx-auto px-4 sm:px-6 flex items-center justify-between" style={{height:'calc(env(safe-area-inset-top) + 56px)', paddingTop:'env(safe-area-inset-top)'}}>
          {/* Brand */}
          <div className="flex items-center gap-2.5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/icon.svg" alt="" width={30} height={30} style={{filter:'drop-shadow(0 1px 4px rgba(0,0,0,.35))'}} />
            <div className="flex flex-col leading-none">
              <span style={{fontFamily:'var(--font-permanent-marker)', fontSize:'1rem', color:'#fff', lineHeight:1.1}}>
                Santi Barber
              </span>
              <span style={{fontFamily:'var(--font-anton)', fontSize:'0.52rem', letterSpacing:'0.2em', textTransform:'uppercase', color:'rgba(255,255,255,.6)', lineHeight:1, marginTop:2}}>
                PANEL ADMIN
              </span>
            </div>
          </div>
          {/* Actions */}
          <div className="flex items-center gap-3">
            <ThemeToggle variant="admin" />
            <button
              onClick={handleLogout}
              style={{
                fontSize: 11, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase',
                color: 'rgba(255,255,255,.75)', background: 'none', border: 'none', cursor: 'pointer',
                padding: '6px 2px',
              }}
            >
              Salir
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 pb-16 px-4 sm:px-6 max-w-3xl mx-auto w-full" style={{paddingTop:'calc(env(safe-area-inset-top) + 74px)'}}>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 mb-8">
          {[
            ['Hoy', totalHoy],
            ['30 días', events.length],
            ['Semana', events.filter(e => {
              const d = new Date(e.start)
              return d >= weekDays[0] && d <= weekDays[6]
            }).length],
          ].map(([label, count]) => (
            <div key={label as string} className="border rounded-xl p-4" style={{background:'var(--surface)', borderColor:'var(--border)'}}>
              <div className="text-2xl font-bold" style={{fontFamily:'var(--font-anton)', color:'var(--celeste)'}}>{count}</div>
              <div className="text-xs mt-1 uppercase tracking-widest" style={{color:'var(--text-mut)'}}>{label}</div>
            </div>
          ))}
        </div>

        {/* Búsqueda */}
        <div className="relative mb-4">
          <svg style={{position:'absolute', left:12, top:'50%', transform:'translateY(-50%)', pointerEvents:'none'}} width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="var(--text-mut)" strokeWidth={2.5} strokeLinecap="round">
            <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
          </svg>
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar por nombre, servicio o teléfono..."
            style={{
              width:'100%', padding:'10px 12px 10px 34px', borderRadius:12,
              border:'2px solid var(--border)', background:'var(--surface)',
              color:'var(--text)', fontSize:13, outline:'none', boxSizing:'border-box',
            }}
          />
          {search && (
            <button onClick={() => setSearch('')} style={{position:'absolute', right:10, top:'50%', transform:'translateY(-50%)', background:'none', border:'none', cursor:'pointer', color:'var(--text-mut)', fontSize:16, lineHeight:1}}>
              ×
            </button>
          )}
        </div>

        {/* Filtros */}
        <div className="flex items-center gap-2 mb-6 flex-wrap">
          {(['upcoming', 'today', 'week'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className="px-4 py-1.5 rounded-lg text-xs font-medium uppercase tracking-wide transition-all"
              style={filter === f
                ? {background:'var(--celeste-deep)', color:'#fff'}
                : {border:'1px solid var(--border)', color:'var(--text-mut)'}}
            >
              {f === 'today' ? 'Hoy' : f === 'week' ? 'Semana' : 'Todos'}
            </button>
          ))}
          <button onClick={fetchEvents} className="ml-auto text-xs transition-colors" style={{color:'var(--celeste)'}}>
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
                    <div className="text-center py-2 border-b text-[10px] uppercase tracking-wide" style={{borderColor:'var(--border)', background:'var(--surface)'}}>
                      <div style={{color:'var(--text-mut)'}}>{WEEK_DAYS_SHORT[day.getDay()]}</div>
                      <div className="font-bold text-sm" style={{
                        color: isToday ? '#fff' : 'var(--text-mut)',
                        background: isToday ? 'var(--celeste-deep)' : 'transparent',
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
                          style={{background:'var(--chip-bg)', color:'var(--text-mut)'}}>
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
              <div key={i} className="h-24 rounded-xl animate-pulse border" style={{background:'var(--surface)', borderColor:'var(--border)'}} />
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
                <h2 className="text-xs uppercase tracking-widest mb-3 font-semibold capitalize" style={{fontFamily:'var(--font-anton)', color:'var(--text-mut)'}}>
                  {day} · {dayEvents.length} {dayEvents.length === 1 ? 'turno' : 'turnos'}
                </h2>
                <div className="space-y-2">
                  {dayEvents.map(ev => (
                    <div key={ev.id} className="border rounded-xl p-4 flex items-start gap-3" style={{background:'var(--surface)', borderColor:'var(--border)'}}>
                      {/* Hora */}
                      <div className="shrink-0 min-w-[52px]" style={{
                        fontFamily:'var(--font-anton)', fontSize:'1.1rem', color:'var(--celeste)',
                      }}>
                        {formatTime(ev.start)}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-sm" style={{color:'var(--text)'}}>{ev.nombre}</span>
                          <span className="text-[10px] uppercase tracking-wide border px-2 py-0.5 rounded" style={{color:'var(--text-mut)', borderColor:'var(--border-soft)', background:'var(--chip-bg)'}}>
                            {ev.modalidad?.includes('domicilio') ? '🏠 domicilio' : '✂️ local'}
                          </span>
                        </div>
                        <div className="text-sm mt-0.5" style={{color:'var(--text-mut)'}}>{ev.servicio}</div>
                        {ev.nota && (
                          <div className="text-xs mt-1 italic" style={{color:'var(--text-mut)'}}>"{ev.nota}"</div>
                        )}
                        <div className="flex items-center gap-3 mt-2 flex-wrap">
                          {ev.whatsapp && (
                            <>
                              <a href={`tel:${ev.whatsapp.replace(/\D/g, '')}`}
                                className="text-xs transition-colors" style={{color:'var(--text-mut)'}}>
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
                            <a href={`mailto:${ev.email}`} className="text-xs transition-colors" style={{color:'var(--text-mut)'}}>
                              {ev.email}
                            </a>
                          )}
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex flex-col gap-1.5 shrink-0">
                        <button
                          onClick={() => openEdit(ev)}
                          className="text-xs px-3 py-1 rounded-lg whitespace-nowrap transition-colors"
                          style={{color:'var(--celeste)', border:'1px solid var(--celeste)', background:'transparent'}}
                        >
                          ✏️ Modificar
                        </button>
                        <button
                          onClick={() => { setCancelTarget(ev); setCancelReason('') }}
                          disabled={cancelling === ev.id}
                          className="text-red-400 border border-red-400/40 hover:bg-red-400/10 transition-colors text-xs disabled:opacity-50 px-3 py-1 rounded-lg whitespace-nowrap"
                        >
                          {cancelling === ev.id ? 'Cancelando...' : 'Cancelar'}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ─── Configuración ─── */}
        <div className="mt-12 border-t pt-10" style={{borderColor:'var(--border-soft)'}}>
          <h3 className="text-xs uppercase tracking-widest font-semibold mb-5" style={{fontFamily:'var(--font-anton)', color:'var(--text-mut)'}}>⚙️ Configuración</h3>
          <div className="border rounded-xl p-5" style={{background:'var(--surface)', borderColor:'var(--border)'}}>
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div>
                <p className="text-sm font-medium" style={{color:'var(--text)'}}>Límite de turnos por día</p>
                <p className="text-xs mt-0.5" style={{color:'var(--text-mut)'}}>
                  Actual: <strong style={{color:'var(--celeste)'}}>{maxDaily}</strong> turnos máximos
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
                  style={{background:'var(--app-bg)', borderColor:'var(--border)', color:'var(--text)'}}
                />
                <button
                  onClick={handleSaveSettings}
                  disabled={savingSettings || maxDailyInput === maxDaily}
                  className="px-4 py-2 rounded-lg text-sm font-semibold disabled:opacity-40 transition-all"
                  style={{background:'var(--celeste-deep)', color:'#fff'}}
                >
                  {savingSettings ? '...' : 'Guardar'}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* ─── Gestión de días bloqueados ─── */}
        <div className="mt-10 border-t pt-8" style={{borderColor:'var(--border-soft)'}}>
          <button
            onClick={() => setShowBlocked(v => !v)}
            className="flex items-center gap-2 w-full text-left mb-5"
          >
            <span className="text-xs uppercase tracking-widest font-semibold" style={{fontFamily:'var(--font-anton)', color:'var(--text-mut)'}}>
              🚫 Bloquear días sin turnos
            </span>
            <span className="ml-auto text-xs" style={{color:'var(--text-mut)'}}>{showBlocked ? '▲ Ocultar' : '▼ Ver'}</span>
          </button>

          {showBlocked && (
            <div>
              {/* Inputs para bloquear — rango o día suelto */}
              <div className="space-y-2 mb-5">
                <div className="flex gap-2">
                  <div className="flex-1">
                    <label className="block text-[10px] uppercase tracking-widest font-bold mb-1" style={{color:'var(--text-mut)'}}>Desde</label>
                    <input
                      type="date"
                      value={blockFrom}
                      onChange={e => { setBlockFrom(e.target.value); if (!blockTo || e.target.value > blockTo) setBlockTo(e.target.value) }}
                      min={toDateParam(new Date())}
                      className="w-full rounded-lg border px-3 py-2 text-sm outline-none"
                      style={{background:'var(--app-bg)', borderColor:'var(--border)', color:'var(--text)'}}
                    />
                  </div>
                  <div className="flex-1">
                    <label className="block text-[10px] uppercase tracking-widest font-bold mb-1" style={{color:'var(--text-mut)'}}>Hasta</label>
                    <input
                      type="date"
                      value={blockTo}
                      onChange={e => setBlockTo(e.target.value)}
                      min={blockFrom || toDateParam(new Date())}
                      className="w-full rounded-lg border px-3 py-2 text-sm outline-none"
                      style={{background:'var(--app-bg)', borderColor:'var(--border)', color:'var(--text)'}}
                    />
                  </div>
                </div>
                <button
                  onClick={handleBlockDate}
                  disabled={!blockFrom || blockingDate}
                  className="w-full py-2 rounded-lg text-sm font-semibold disabled:opacity-50 transition-all"
                  style={{background:'var(--celeste-deep)', color:'#fff'}}
                >
                  {blockingDate ? 'Bloqueando...' : blockTo && blockTo !== blockFrom ? `Bloquear rango (${blockFrom} → ${blockTo})` : 'Bloquear día'}
                </button>
              </div>

              {/* Lista de días bloqueados */}
              {blockedDates.length === 0 ? (
                <p className="text-sm" style={{color:'var(--text-mut)'}}>No hay días bloqueados.</p>
              ) : (
                <div className="space-y-2">
                  {blockedDates.map(b => {
                    const [year, month, day] = b.date.split('-').map(Number)
                    const d = new Date(year, month - 1, day)
                    const label = d.toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
                    return (
                      <div key={b.id} className="flex items-center justify-between border rounded-xl px-4 py-3"
                        style={{background:'var(--surface)', borderColor:'var(--border)'}}>
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

      {/* ─── Modal cancelar turno ─── */}
      {cancelTarget && (
        <div
          style={{ position:'fixed', inset:0, zIndex:200, background:'rgba(0,0,0,.65)', backdropFilter:'blur(4px)', display:'flex', alignItems:'flex-end', justifyContent:'center' }}
          onClick={e => { if (e.target === e.currentTarget) { setCancelTarget(null); setCancelReason('') } }}
        >
          <div style={{ width:'100%', maxWidth:480, background:'var(--surface)', borderRadius:'20px 20px 0 0', border:'2px solid var(--border)', borderBottom:'none', padding:'24px 20px 36px' }}>
            <div style={{ width:40, height:4, borderRadius:2, background:'var(--border)', margin:'0 auto 20px' }} />

            <p style={{ margin:'0 0 4px', fontFamily:'var(--font-anton)', fontSize:18, color:'#f87171', letterSpacing:'.3px' }}>
              CANCELAR TURNO
            </p>
            <p style={{ margin:'0 0 20px', fontSize:13, color:'var(--text-mut)', fontWeight:600 }}>
              {cancelTarget.nombre} · {new Date(cancelTarget.start).toLocaleString('es-AR', { weekday:'long', day:'numeric', month:'long', hour:'2-digit', minute:'2-digit' })}
            </p>

            <div style={{ marginBottom:20 }}>
              <label style={{ display:'block', fontSize:10, fontWeight:800, textTransform:'uppercase', letterSpacing:'.1em', color:'var(--text-mut)', marginBottom:6 }}>
                Motivo (opcional — se incluye en el email al cliente)
              </label>
              <textarea
                value={cancelReason}
                onChange={e => setCancelReason(e.target.value)}
                placeholder="Ej: Problema de agenda, emergencia personal..."
                rows={2}
                style={{ width:'100%', padding:'12px 14px', borderRadius:12, border:'2px solid var(--border)', background:'var(--app-bg)', color:'var(--text)', fontSize:13, resize:'none', outline:'none', boxSizing:'border-box', fontFamily:'inherit' }}
              />
            </div>

            <div style={{ display:'flex', gap:10 }}>
              <button
                onClick={() => { setCancelTarget(null); setCancelReason('') }}
                style={{ flex:1, padding:'14px', borderRadius:14, border:'2px solid var(--border)', background:'none', color:'var(--text-mut)', fontFamily:'var(--font-anton)', fontSize:13, letterSpacing:'1px', cursor:'pointer' }}
              >
                VOLVER
              </button>
              <button
                onClick={confirmCancel}
                disabled={!!cancelling}
                style={{ flex:2, padding:'14px', borderRadius:14, background:'linear-gradient(135deg,#ef4444,#b91c1c)', color:'#fff', border:'none', fontFamily:'var(--font-anton)', fontSize:13, letterSpacing:'1px', cursor:'pointer', opacity: cancelling ? .7 : 1 }}
              >
                {cancelling ? 'CANCELANDO...' : 'CONFIRMAR CANCELACIÓN'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Modal modificar turno ─── */}
      {editing && (
        <div
          style={{
            position: 'fixed', inset: 0, zIndex: 200,
            background: 'rgba(0,0,0,.65)', backdropFilter: 'blur(4px)',
            display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
          }}
          onClick={e => { if (e.target === e.currentTarget) setEditing(null) }}
        >
          <div style={{
            width: '100%', maxWidth: 480,
            background: 'var(--surface)', borderRadius: '20px 20px 0 0',
            border: '2px solid var(--border)', borderBottom: 'none',
            padding: '24px 20px 36px',
          }}>
            {/* Handle */}
            <div style={{ width: 40, height: 4, borderRadius: 2, background: 'var(--border)', margin: '0 auto 20px' }} />

            {/* Header */}
            <div style={{ marginBottom: 20 }}>
              <p style={{ margin: 0, fontFamily: 'var(--font-anton)', fontSize: 18, color: 'var(--text)', letterSpacing: '.3px' }}>
                MODIFICAR TURNO
              </p>
              <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--text-mut)', fontWeight: 600 }}>
                {editing.nombre} · {editing.servicio.split(' — ')[0]}
              </p>
            </div>

            {/* Fecha */}
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.1em', color: 'var(--text-mut)', marginBottom: 6 }}>
                Nueva fecha
              </label>
              <input
                type="date"
                value={editDate}
                min={toDateParam(new Date())}
                onChange={e => {
                  setEditDate(e.target.value)
                  setEditTime('')
                  if (e.target.value && editing) fetchEditSlots(e.target.value, editing.modalidad)
                }}
                style={{
                  width: '100%', padding: '12px 14px', borderRadius: 12,
                  border: '2px solid var(--border)', background: 'var(--app-bg)',
                  color: 'var(--text)', fontSize: 15, fontWeight: 700,
                  boxSizing: 'border-box', outline: 'none',
                }}
              />
            </div>

            {/* Horario — grilla de slots */}
            <div style={{ marginBottom: 24 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                <label style={{ fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.1em', color: 'var(--text-mut)' }}>
                  Nuevo horario
                </label>
                <div style={{ display: 'flex', gap: 10, fontSize: 9, fontWeight: 700, color: 'var(--text-mut)', alignItems: 'center' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <span style={{ width: 8, height: 8, borderRadius: 2, background: 'var(--celeste-deep)', display: 'inline-block' }} />
                    LIBRE
                  </span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <span style={{ width: 8, height: 8, borderRadius: 2, background: 'var(--chip-bg)', border: '1px solid var(--border-soft)', display: 'inline-block' }} />
                    OCUPADO
                  </span>
                </div>
              </div>

              {loadingEditSlots ? (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 7 }}>
                  {Array.from({ length: 8 }).map((_, i) => (
                    <div key={i} style={{ height: 38, borderRadius: 10, background: 'var(--chip-bg)', opacity: .5 }} />
                  ))}
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 7 }}>
                  {(editing.modalidad?.toLowerCase().includes('domicilio')
                    ? ['10:00','11:30','13:00','15:00','17:00']
                    : ['10:00','10:30','11:00','11:30','12:00','12:30','13:00','14:00','14:30','15:00','15:30','16:00','16:30','17:00','17:30','18:00','18:30']
                  ).map(slot => {
                    const isOccupied = editBlockedSlots.includes(slot)
                    const isSelected = editTime === slot
                    return (
                      <button
                        key={slot}
                        disabled={isOccupied}
                        onClick={() => !isOccupied && setEditTime(slot)}
                        title={isOccupied ? 'Horario ocupado' : 'Disponible'}
                        style={{
                          padding: '10px 4px',
                          borderRadius: 10,
                          border: isSelected
                            ? '2px solid var(--celeste)'
                            : isOccupied
                            ? '2px solid var(--border-soft)'
                            : '2px solid var(--border)',
                          background: isSelected
                            ? 'var(--celeste-deep)'
                            : isOccupied
                            ? 'var(--chip-bg)'
                            : 'var(--app-bg)',
                          color: isSelected ? '#fff' : isOccupied ? 'var(--text-mut)' : 'var(--text)',
                          fontFamily: 'var(--font-anton)',
                          fontSize: 13, letterSpacing: '.5px',
                          cursor: isOccupied ? 'not-allowed' : 'pointer',
                          opacity: isOccupied ? .45 : 1,
                          transition: 'all .12s',
                          textDecoration: isOccupied ? 'line-through' : 'none',
                          position: 'relative',
                        }}
                      >
                        {slot}
                      </button>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Botones */}
            <div style={{ display: 'flex', gap: 10 }}>
              <button
                onClick={() => setEditing(null)}
                style={{
                  flex: 1, padding: '14px', borderRadius: 14,
                  border: '2px solid var(--border)', background: 'none',
                  color: 'var(--text-mut)', fontFamily: 'var(--font-anton)',
                  fontSize: 13, letterSpacing: '1px', cursor: 'pointer',
                }}
              >
                CANCELAR
              </button>
              <button
                onClick={handleSaveEdit}
                disabled={saving || !editDate || !editTime}
                style={{
                  flex: 2, padding: '14px', borderRadius: 14,
                  background: (!editDate || !editTime) ? 'var(--border)' : 'linear-gradient(135deg, #75AADB, #0B1F47)',
                  color: '#fff', border: 'none',
                  fontFamily: 'var(--font-anton)', fontSize: 13, letterSpacing: '1px',
                  cursor: (!editDate || !editTime) ? 'not-allowed' : 'pointer',
                  opacity: saving ? .7 : 1,
                }}
              >
                {saving ? 'GUARDANDO...' : 'GUARDAR Y NOTIFICAR'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
