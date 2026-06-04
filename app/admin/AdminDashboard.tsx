'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
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

export default function AdminDashboard() {
  const router = useRouter()
  const [events, setEvents] = useState<BookingEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [cancelling, setCancelling] = useState<string | null>(null)
  const [filter, setFilter] = useState<'upcoming' | 'today'>('upcoming')

  const fetchEvents = useCallback(async () => {
    setLoading(true)
    const res = await fetch('/api/admin/bookings')
    const data = await res.json()
    setEvents(data.events ?? [])
    setLoading(false)
  }, [])

  useEffect(() => { fetchEvents() }, [fetchEvents])

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

  const filtered = filter === 'today'
    ? events.filter(e => new Date(e.start).toDateString() === new Date().toDateString())
    : events

  const grouped = groupByDay(filtered)
  const totalHoy = events.filter(e => new Date(e.start).toDateString() === new Date().toDateString()).length

  return (
    <div className="min-h-screen flex flex-col" style={{background:'var(--bg)'}}>
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 backdrop-blur-sm border-b" style={{background:'var(--bg-2)', borderColor:'var(--border)'}}>
        <div className="max-w-3xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Image src="/logo.png" alt="Santi Barber" width={32} height={32} className="rounded-full object-cover" />
            <span className="font-playfair" style={{color:'var(--text)'}}>Santiago Rieck</span>
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
              const now = new Date()
              const week = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
              return d >= now && d <= week
            }).length],
          ].map(([label, count]) => (
            <div key={label as string} className="border rounded-xl p-4" style={{background:'var(--bg-2)', borderColor:'var(--border)'}}>
              <div className="text-2xl font-bold" style={{color:'var(--text)'}}>{count}</div>
              <div className="text-xs mt-1" style={{color:'var(--text-faint)'}}>{label}</div>
            </div>
          ))}
        </div>

        {/* Filtros */}
        <div className="flex items-center gap-2 mb-6">
          {(['upcoming', 'today'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className="px-4 py-1.5 rounded-lg text-xs font-medium uppercase tracking-wide transition-all"
              style={filter === f
                ? {background:'var(--text)', color:'var(--bg)'}
                : {border:'1px solid var(--border)', color:'var(--text-muted)'}}
            >
              {f === 'today' ? 'Hoy' : 'Todos'}
            </button>
          ))}
          <button onClick={fetchEvents} className="ml-auto text-xs transition-colors" style={{color:'var(--text-faint)'}}>
            ↻ Actualizar
          </button>
        </div>

        {/* Lista */}
        {loading ? (
          <div className="space-y-3">
            {[1,2,3].map(i => (
              <div key={i} className="h-24 rounded-xl animate-pulse border" style={{background:'var(--bg-2)', borderColor:'var(--border)'}} />
            ))}
          </div>
        ) : grouped.length === 0 ? (
          <div className="text-center py-16 text-sm" style={{color:'var(--text-faint)'}}>
            {filter === 'today' ? 'No hay turnos para hoy' : 'No hay turnos próximos'}
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
      </main>
    </div>
  )
}
