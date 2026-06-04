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
    if (res.ok) {
      setEvents(prev => prev.filter(e => e.id !== eventId))
    }
    setCancelling(null)
  }

  const filtered = filter === 'today'
    ? events.filter(e => new Date(e.start).toDateString() === new Date().toDateString())
    : events

  const grouped = groupByDay(filtered)
  const totalHoy = events.filter(e => new Date(e.start).toDateString() === new Date().toDateString()).length

  return (
    <div className="min-h-screen bg-[#1a1a1a] flex flex-col">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-[#1a1a1a]/95 backdrop-blur-sm border-b border-[#2e2e2e]">
        <div className="max-w-3xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span>✂️</span>
            <span className="font-playfair text-[#f5f0e8]">Santiago Rieck</span>
            <span className="text-[10px] uppercase tracking-widest text-[#f5f0e8]/30 border border-[#2e2e2e] px-2 py-0.5 rounded">Admin</span>
          </div>
          <button onClick={handleLogout} className="text-xs text-[#f5f0e8]/30 hover:text-[#f5f0e8]/60 transition-colors">
            Salir
          </button>
        </div>
      </header>

      <main className="flex-1 pt-24 pb-16 px-6 max-w-3xl mx-auto w-full">

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-8">
          {[
            ['Hoy', totalHoy],
            ['Próximos 30 días', events.length],
            ['Esta semana', events.filter(e => {
              const d = new Date(e.start)
              const now = new Date()
              const week = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
              return d >= now && d <= week
            }).length],
          ].map(([label, count]) => (
            <div key={label as string} className="bg-[#1e1e1e] border border-[#2e2e2e] rounded-xl p-4">
              <div className="text-2xl font-bold text-[#f5f0e8]">{count}</div>
              <div className="text-xs text-[#f5f0e8]/40 mt-1">{label}</div>
            </div>
          ))}
        </div>

        {/* Filtros */}
        <div className="flex items-center gap-2 mb-6">
          {(['upcoming', 'today'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-1.5 rounded-lg text-xs font-medium uppercase tracking-wide transition-all
                ${filter === f
                  ? 'bg-[#f5f0e8] text-[#1a1a1a]'
                  : 'border border-[#2e2e2e] text-[#f5f0e8]/50 hover:text-[#f5f0e8]/80'
                }`}
            >
              {f === 'today' ? 'Hoy' : 'Todos'}
            </button>
          ))}
          <button onClick={fetchEvents} className="ml-auto text-xs text-[#f5f0e8]/30 hover:text-[#f5f0e8]/60 transition-colors">
            ↻ Actualizar
          </button>
        </div>

        {/* Lista */}
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-24 bg-[#1e1e1e] rounded-xl animate-pulse border border-[#2e2e2e]" />
            ))}
          </div>
        ) : grouped.length === 0 ? (
          <div className="text-center py-16 text-[#f5f0e8]/30 text-sm">
            {filter === 'today' ? 'No hay turnos para hoy' : 'No hay turnos próximos'}
          </div>
        ) : (
          <div className="space-y-8">
            {grouped.map(([day, dayEvents]) => (
              <div key={day}>
                <h2 className="text-xs uppercase tracking-widest text-[#f5f0e8]/40 mb-3 font-semibold">
                  {day} · {dayEvents.length} {dayEvents.length === 1 ? 'turno' : 'turnos'}
                </h2>
                <div className="space-y-2">
                  {dayEvents.map(ev => (
                    <div
                      key={ev.id}
                      className="bg-[#1e1e1e] border border-[#2e2e2e] rounded-xl p-4 flex items-start gap-4"
                    >
                      {/* Hora */}
                      <div className="text-lg font-bold text-[#f5f0e8] min-w-[52px]">
                        {formatTime(ev.start)}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-[#f5f0e8] text-sm">{ev.nombre}</span>
                          <span className="text-[10px] uppercase tracking-wide text-[#f5f0e8]/30 border border-[#2e2e2e] px-2 py-0.5 rounded">
                            {ev.modalidad?.includes('domicilio') ? '🏠 domicilio' : '✂️ local'}
                          </span>
                        </div>
                        <div className="text-sm text-[#f5f0e8]/50 mt-0.5">{ev.servicio}</div>
                        {ev.nota && (
                          <div className="text-xs text-[#f5f0e8]/30 mt-1 italic">"{ev.nota}"</div>
                        )}
                        <div className="flex items-center gap-3 mt-2">
                          {ev.whatsapp && (
                            <>
                              <a
                                href={`tel:${ev.whatsapp.replace(/\D/g, '')}`}
                                className="text-xs text-[#f5f0e8]/50 hover:text-[#f5f0e8] transition-colors"
                              >
                                {ev.whatsapp}
                              </a>
                              <a
                                href={`https://wa.me/${ev.whatsapp.replace(/\D/g, '')}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs text-green-500/70 hover:text-green-400 transition-colors"
                              >
                                WhatsApp →
                              </a>
                            </>
                          )}
                          {ev.email && (
                            <span className="text-xs text-[#f5f0e8]/30">{ev.email}</span>
                          )}
                        </div>
                      </div>

                      {/* Cancel */}
                      <button
                        onClick={() => handleCancel(ev.id, ev.nombre)}
                        disabled={cancelling === ev.id}
                        className="text-red-400 border border-red-400/40 hover:bg-red-400/10 transition-colors text-xs shrink-0 disabled:opacity-50 px-3 py-1 rounded-lg"
                      >
                        {cancelling === ev.id ? 'Cancelando...' : 'Cancelar turno'}
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
