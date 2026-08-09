'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import type { BookingEvent } from '@/lib/googleCalendar'
import ThemeToggle from '@/components/ThemeToggle'
import { TIME_SLOTS, LOCATION_LABELS } from '@/lib/constants'
import {
  capitalize as upperFirst,
  fechaLarga,
  hhmm as formatTime,
  nombreServicio,
  precioServicio,
  toDateParam,
} from '@/lib/format'

function formatDay(dateStr: string): string {
  const d = new Date(dateStr)
  const today = new Date()
  const tomorrow = new Date(today)
  tomorrow.setDate(today.getDate() + 1)
  if (d.toDateString() === today.toDateString()) return 'Hoy'
  if (d.toDateString() === tomorrow.toDateString()) return 'Mañana'
  return upperFirst(fechaLarga(d))
}

/* Se devuelve también la fecha cruda: la etiqueta formateada no sirve
   como clave porque en el historial dos días de años distintos se ven
   iguales ("jueves, 4 de agosto") y colisionan. */
function groupByDay(events: BookingEvent[]): { key: string; label: string; items: BookingEvent[] }[] {
  const map = new Map<string, BookingEvent[]>()
  for (const e of events) {
    const day = new Date(e.start).toDateString()
    if (!map.has(day)) map.set(day, [])
    map.get(day)!.push(e)
  }
  return Array.from(map.entries()).map(([key, items]) => ({
    key,
    label: formatDay(items[0].start),
    items,
  }))
}

/* "2026-08-11" → "11 de agosto". Nunca mostrar la fecha ISO cruda en
   la interfaz: es el formato de la API, no el del idioma. */
function shortDay(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('es-AR', { day: 'numeric', month: 'long' })
}

function isDomicilio(modalidad: string): boolean {
  return !!modalidad?.toLowerCase().includes('domicilio')
}

/* El WhatsApp se guarda en el calendario como "https://wa.me/54911…"
   y el panel lo mostraba tal cual, con el link entero donde tendría
   que ir el teléfono. Acá se queda sólo con los dígitos. */
function soloDigitos(whatsapp: string): string {
  return (whatsapp ?? '').replace(/\D/g, '')
}

/* "5491136413741" → "11 3641-3741". Se sacan el 54 y el 9 de
   marcación, que no se leen en voz alta ni se tipean acá.

   Los prefijos se recortan sólo si sobran dígitos: un número local
   ya tiene diez y sacarle el 54 lo dejaría en ocho. Y si la forma no
   se reconoce se muestran los dígitos crudos, nunca el texto de
   entrada — devolver la entrada hacía reaparecer el "https://wa.me/…"
   justo en el renglón del teléfono. Lo que se ve tiene que ser
   siempre lo que marca el link. */
function telVisible(whatsapp: string): string {
  const digitos = soloDigitos(whatsapp)
  let d = digitos
  if (d.length > 10 && d.startsWith('54')) d = d.slice(2)
  if (d.length > 10 && d.startsWith('9')) d = d.slice(1)
  if (d.length === 10) return `${d.slice(0, 2)} ${d.slice(2, 6)}-${d.slice(6)}`
  return digitos
}

function money(n: number): string {
  return `$${n.toLocaleString('es-AR')}`
}

function mapsUrl(direccion: string): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(direccion)}`
}

function duracionMin(ev: BookingEvent): number {
  return ev.end
    ? Math.round((new Date(ev.end).getTime() - new Date(ev.start).getTime()) / 60000)
    : 0
}

const WEEK_DAYS_SHORT = ['D', 'L', 'M', 'M', 'J', 'V', 'S']
const FILTERS = [
  { key: 'upcoming', label: 'Próximos' },
  { key: 'today', label: 'Hoy' },
  { key: 'week', label: 'Semana' },
  { key: 'history', label: 'Historial' },
] as const

type Filter = (typeof FILTERS)[number]['key']

/* La navegación lleva SÓLO estas dos. El diseño dibuja además
   Clientes, Servicios, Horarios y Cobros, que no existen como
   pantallas: un link que no lleva a ningún lado es peor que la
   ausencia del link. */
const SECCIONES = [
  { key: 'agenda', label: 'Agenda' },
  { key: 'ajustes', label: 'Ajustes' },
] as const

type Seccion = (typeof SECCIONES)[number]['key']

export default function AdminDashboard() {
  const router = useRouter()
  const [events, setEvents] = useState<BookingEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [cancelling, setCancelling] = useState<string | null>(null)
  const [cancelTarget, setCancelTarget] = useState<BookingEvent | null>(null)
  const [cancelReason, setCancelReason] = useState('')
  const [filter, setFilter] = useState<Filter>('upcoming')
  const [search, setSearch] = useState('')
  const [history, setHistory] = useState<BookingEvent[]>([])
  const [loadingHistory, setLoadingHistory] = useState(false)
  const [historyLoaded, setHistoryLoaded] = useState(false)

  // Qué sección de la navegación está abierta
  const [seccion, setSeccion] = useState<Seccion>('agenda')

  /* El turno abierto en la columna del detalle. Se guarda el id y no
     el objeto: reprogramar le cambia el id al evento y cancelar lo
     saca de la lista, así que un objeto guardado quedaría mostrando
     un turno que ya no existe. */
  const [selectedId, setSelectedId] = useState<string | null>(null)

  // Modificar turno
  const [editing, setEditing] = useState<BookingEvent | null>(null)
  const [editDate, setEditDate] = useState('')
  const [editTime, setEditTime] = useState('')
  const [saving, setSaving] = useState(false)
  const [editBlockedSlots, setEditBlockedSlots] = useState<string[]>([])
  const [loadingEditSlots, setLoadingEditSlots] = useState(false)
  const [editError, setEditError] = useState('')

  // Días bloqueados
  const [blockedDates, setBlockedDates] = useState<{ id: string; date: string }[]>([])
  const [blockFrom, setBlockFrom] = useState('')
  const [blockTo, setBlockTo] = useState('')
  const [blockingDate, setBlockingDate] = useState(false)
  const [showBlocked, setShowBlocked] = useState(false)

  // Ajustes
  const [maxDaily, setMaxDaily] = useState(8)
  const [maxDailyInput, setMaxDailyInput] = useState(8)
  const [savingSettings, setSavingSettings] = useState(false)

  // Lo que se anuncia al lector de pantalla cuando una acción cambia
  // la pantalla sin decir nada
  const [status, setStatus] = useState('')

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

  /* Al abrir una hoja el foco tiene que entrar en ella; al cerrarla,
     volver al botón que la abrió. Sin esto, quien navega con teclado
     queda atrás del overlay y tiene que recorrer toda la página. */
  const sheetRef = useRef<HTMLDivElement>(null)
  const openerRef = useRef<HTMLElement | null>(null)
  const sheetOpen = !!cancelTarget || !!editing

  function closeSheets() {
    setCancelTarget(null)
    setCancelReason('')
    setEditing(null)
  }

  useEffect(() => {
    if (!sheetOpen) {
      openerRef.current?.focus()
      openerRef.current = null
      return
    }
    openerRef.current = document.activeElement as HTMLElement | null
    sheetRef.current?.querySelector<HTMLElement>(
      'button, [href], input, textarea, select'
    )?.focus()

    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') closeSheets()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [sheetOpen])

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
    if (res.ok) {
      setEvents(prev => prev.filter(e => e.id !== cancelTarget.id))
      setStatus(`Turno de ${cancelTarget.nombre} cancelado. Le avisamos por mail.`)
    }
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
      setStatus('Días bloqueados. Ya no se pueden reservar turnos.')
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
    if (res.ok) {
      setMaxDaily(maxDailyInput)
      setStatus(`Tope guardado: ${maxDailyInput} turnos por día.`)
    }
    setSavingSettings(false)
  }

  function fetchEditSlots(dateStr: string, modalidad: string) {
    const loc = isDomicilio(modalidad) ? 'domicilio' : 'local'
    setLoadingEditSlots(true)
    fetch(`/api/availability?date=${dateStr}&location=${loc}`)
      .then(r => r.json())
      .then(data => setEditBlockedSlots(data.blocked ?? []))
      .catch(() => setEditBlockedSlots([]))
      .finally(() => setLoadingEditSlots(false))
  }

  function handleFilterChange(f: Filter) {
    setFilter(f)
    if (f === 'history' && !historyLoaded) {
      setLoadingHistory(true)
      fetch('/api/admin/bookings/history')
        .then(r => r.json())
        .then(data => { setHistory(data.events ?? []); setHistoryLoaded(true) })
        .catch(() => {})
        .finally(() => setLoadingHistory(false))
    }
  }

  function openEdit(ev: BookingEvent) {
    const d = new Date(ev.start)
    const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    const timeStr = formatTime(d)
    setEditing(ev)
    setEditDate(dateStr)
    setEditTime(timeStr)
    setEditBlockedSlots([])
    setEditError('')
    fetchEditSlots(dateStr, ev.modalidad)
  }

  async function handleSaveEdit() {
    if (!editing || !editDate || !editTime) return
    setSaving(true)
    setEditError('')
    try {
      const res = await fetch('/api/admin/modificar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ eventId: editing.id, newDate: editDate, newTime: editTime }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Error')
      // Se arma el nuevo inicio con el offset explícito de Buenos Aires:
      // setHours() interpretaría h:m en la zona del navegador y la hora
      // mostrada se correría en silencio si no fuera -03:00.
      const durationMs = new Date(editing.end).getTime() - new Date(editing.start).getTime()
      const newStart = new Date(`${editDate}T${editTime}:00-03:00`)
      const newEnd = new Date(newStart.getTime() + durationMs)
      setEvents(prev => prev.map(e => {
        if (e.id !== editing.id) return e
        return { ...e, id: data.newEventId, start: newStart.toISOString(), end: newEnd.toISOString() }
      }))
      /* Reprogramar crea un evento nuevo con otro id. Sin esto el
         detalle se vaciaba justo después de guardar, como si el turno
         se hubiera perdido. */
      setSelectedId(prev => (prev === editing.id ? data.newEventId : prev))
      setStatus(`Turno de ${editing.nombre} movido al ${editDate} a las ${editTime}. Le avisamos por mail.`)
      setEditing(null)
    } catch (err) {
      setEditError(err instanceof Error ? err.message : 'No se pudo mover el turno. Probá de nuevo.')
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
    if (res.ok) {
      setBlockedDates(prev => prev.filter(b => b.id !== eventId))
      setStatus('Día desbloqueado. Vuelve a estar disponible para reservar.')
    }
  }

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

  const filteredBase = filter === 'history'
    ? history
    : filter === 'today'
    ? events.filter(e => new Date(e.start).toDateString() === new Date().toDateString())
    : filter === 'week'
    ? events.filter(e => { const d = new Date(e.start); return d >= weekDays[0] && d <= weekDays[6] })
    : events

  const filtered = filteredBase.filter(e =>
    !search.trim() ||
    e.nombre.toLowerCase().includes(search.toLowerCase()) ||
    e.servicio.toLowerCase().includes(search.toLowerCase()) ||
    e.whatsapp.includes(search)
  )

  const grouped = groupByDay(filtered)
  const eventosHoy = events.filter(e => new Date(e.start).toDateString() === new Date().toDateString())
  const totalHoy = eventosHoy.length
  /* Lo que entra hoy si no se cae nada. Es el número por el que
     Santiago abre el panel a la mañana, y hasta ahora no estaba: lo
     calculaba sólo el mail del resumen diario. */
  const previstoHoy = eventosHoy.reduce((sum, e) => sum + precioServicio(e.servicio), 0)
  const totalSemana = events.filter(e => {
    const d = new Date(e.start)
    return d >= weekDays[0] && d <= weekDays[6]
  }).length

  const isHistory = filter === 'history'
  const isLoading = isHistory ? loadingHistory : loading

  /* El detalle se resuelve contra las dos listas y no contra la
     filtrada: cambiar de filtro no tiene por qué cerrar el turno que
     se estaba mirando. */
  const selected = selectedId
    ? events.find(e => e.id === selectedId) ?? history.find(e => e.id === selectedId) ?? null
    : null
  const selEsPasado = !!selected && history.some(h => h.id === selected.id)

  /* Con una búsqueda activa, decir "no tenés turnos" es mentira: los
     hay, no coinciden. Son dos vacíos distintos y llevan a acciones
     distintas. */
  const searching = search.trim().length > 0
  const emptyText = searching
    ? `Ningún turno coincide con «${search.trim()}».`
    : filter === 'today' ? 'Hoy no tenés turnos.'
    : filter === 'week' ? 'Esta semana no tenés turnos.'
    : isHistory ? 'No hay turnos en los últimos 60 días.'
    : 'No tenés turnos próximos.'

  /* El logotipo, igual en la barra lateral y en la cabecera de
     celular. El alt va en un .sr-only aparte: la variante que el tema
     oculta no aportaría su alt al árbol de accesibilidad. */
  const logo = (
    <span style={{ display: 'block', width: 118, flexShrink: 0 }}>
      <span className="sr-only">barber Höhle</span>
      <span className="logo-ink">
        <Image src="/logo-black.png" alt="" width={1522} height={253} sizes="118px" priority
          style={{ width: '100%', height: 'auto', display: 'block' }} />
      </span>
      <span className="logo-paper">
        <Image src="/logo-white.png" alt="" width={1522} height={253} sizes="118px" priority
          style={{ width: '100%', height: 'auto', display: 'block' }} />
      </span>
    </span>
  )

  const botonSalir = (
    <button onClick={handleLogout} className="btn-ghost" style={{ minHeight: 44, padding: '0 4px' }}>
      Cerrar sesión
    </button>
  )

  return (
    <div className="panel">

      {/* ─── Cabecera de celular ───
          En PC esto no existe: la marca y la sesión viven en la barra
          lateral. */}
      <header className="panel-cabecera">
        <div className="flex items-center gap-3 min-w-0">
          {logo}
          <span className="rotulo" style={{ letterSpacing: '.14em', flexShrink: 0 }}>Admin</span>
        </div>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          {botonSalir}
        </div>
      </header>

      {/* ─── Barra lateral ─── */}
      <aside className="panel-lateral">
        <div className="panel-marca">
          {logo}
          <span className="rotulo" style={{ letterSpacing: '.14em', flexShrink: 0 }}>Admin</span>
        </div>

        <nav className="panel-nav" aria-label="Secciones del panel">
          {SECCIONES.map(s => (
            <button
              key={s.key}
              aria-current={seccion === s.key ? 'page' : undefined}
              onClick={() => setSeccion(s.key)}
            >
              {s.label}
            </button>
          ))}
        </nav>

        <div className="panel-lateral-pie">
          {botonSalir}
          <ThemeToggle />
        </div>
      </aside>

      {/* ─── Agenda — la columna del medio ─── */}
      <main className="panel-agenda">
        <h1 className="sr-only">Panel admin — Barber Höhle</h1>

        {/* Una sola región de anuncios para todo el panel: las acciones
            cambian la pantalla en silencio y hay que contarlas. */}
        <p role="status" aria-live="polite" className="sr-only">{status}</p>

        {seccion === 'agenda' ? (
          <>
            {/* ─── Cifras ─── */}
            <dl className="cifras">
              {([
                ['Turnos hoy', String(totalHoy)],
                /* Sin turnos, "$0" se lee como un pronóstico de cero pesos.
                   No hay nada que prever todavía, y eso lo dice el guion. */
                ['Previsto hoy', totalHoy > 0 ? money(previstoHoy) : '—'],
                ['Semana', String(totalSemana)],
                ['30 días', String(events.length)],
              ] as [string, string][])
                .map(([label, valor]) => (
                  <div key={label}>
                    {/* El término va antes en el DOM para que el lector diga
                       "Hoy, 3" y no "3… Hoy"; el orden visual lo da flex. */}
                    <dt className="rotulo" style={{ order: 2, marginTop: 9 }}>{label}</dt>
                    <dd
                      className="mono"
                      style={{
                        order: 1, margin: 0, lineHeight: 1, color: 'var(--text)', fontWeight: 500,
                        /* La plata trae cinco o seis dígitos y un signo; al
                           mismo cuerpo que un "3" desbordaría la columna. */
                        fontSize: valor.length > 4 ? 19 : 28,
                      }}
                    >
                      {valor}
                    </dd>
                  </div>
                ))}
            </dl>

            {/* ─── Buscador ─── */}
            <div style={{ marginTop: 26, position: 'relative' }}>
              <label className="field-label" htmlFor="admin-search">Buscar</label>
              <input
                id="admin-search"
                type="search"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Nombre, servicio o teléfono"
                className="w-input"
                style={{ paddingRight: 36 }}
              />
              {search && (
                <button
                  onClick={() => setSearch('')}
                  aria-label="Borrar la búsqueda"
                  style={{
                    position: 'absolute', right: 0, bottom: 0,
                    width: 44, height: 44,
                    background: 'none', border: 'none', cursor: 'pointer',
                    color: 'var(--text-mut)', fontSize: 18, lineHeight: 1,
                  }}
                >
                  <span aria-hidden="true">×</span>
                </button>
              )}
            </div>

            {/* ─── Filtros ─── */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 20 }}>
              <div className="seg" role="group" aria-label="Filtrar turnos" style={{ flex: 1, minWidth: 0 }}>
                {FILTERS.map(f => (
                  <button
                    key={f.key}
                    aria-pressed={filter === f.key}
                    onClick={() => handleFilterChange(f.key)}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
              <button onClick={fetchEvents} className="link-btn" style={{ flexShrink: 0 }}>
                Recargar
              </button>
            </div>

            {/* ─── Vista semanal ─── */}
            {filter === 'week' && (
              /* A 375px, siete columnas dejan 50px por día y los nombres se
                 truncan hasta no decir nada. Se le da un ancho mínimo real y
                 se arrastra al costado, como la tira de días del flujo. */
              <div style={{ marginTop: 22, overflowX: 'auto' }}>
                <div style={{
                  minWidth: 560, border: '1px solid var(--border)',
                  display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)',
                }}>
                  {weekDays.map((day, i) => {
                    const dayEvents = events.filter(e => new Date(e.start).toDateString() === day.toDateString())
                    const isToday = day.toDateString() === new Date().toDateString()
                    return (
                      <div key={i} style={{ borderLeft: i === 0 ? 'none' : '1px solid var(--border-soft)', minHeight: 96 }}>
                        <div style={{ textAlign: 'center', padding: '9px 0 10px', borderBottom: '1px solid var(--border-soft)' }}>
                          <div className="rotulo" style={{ letterSpacing: '.06em' }}>{WEEK_DAYS_SHORT[day.getDay()]}</div>
                          {/* Hoy se marca con un filete corto bajo el número,
                              nunca con relleno: el relleno significa "elegido". */}
                          <div
                            className="mono"
                            style={{
                              fontSize: 14, fontWeight: 500, marginTop: 7, color: 'var(--text)',
                              textDecoration: isToday ? 'underline' : 'none',
                              textUnderlineOffset: 3,
                              textDecorationThickness: 1,
                            }}
                          >
                            {day.getDate()}
                          </div>
                        </div>
                        <div style={{ padding: '4px 5px', display: 'flex', flexDirection: 'column', gap: 3 }}>
                          {dayEvents.map(ev => (
                            <div
                              key={ev.id}
                              className="mono"
                              style={{
                                fontSize: 9.5, lineHeight: 1.5, paddingTop: 3,
                                borderTop: '1px solid var(--border-soft)', color: 'var(--text)',
                                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                              }}
                            >
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

            {/* ─── Lista de turnos ─── */}
            <div aria-live="polite" aria-busy={isLoading} style={{ marginTop: 30 }}>
              {isLoading ? (
                /* El esqueleto mide lo que mide una tarjeta: si midiera
                   menos, la lista saltaría al terminar de cargar. */
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {[1, 2, 3].map(i => (
                    <div key={i} style={{ height: 168, border: '1px solid var(--border-soft)', opacity: .5 }} />
                  ))}
                </div>
              ) : grouped.length === 0 ? (
                <div style={{ padding: '44px 0', textAlign: 'center' }}>
                  <p className="rotulo" style={{ lineHeight: 1.8, margin: 0 }}>{emptyText}</p>
                  {searching && (
                    <button onClick={() => setSearch('')} className="link-btn" style={{ marginTop: 18 }}>
                      Borrar la búsqueda
                    </button>
                  )}
                </div>
              ) : (
                <>
                  {/* ─── En PC: la tabla ───
                      Cada renglón es un control: tocarlo abre el turno en
                      la columna del detalle. Los rótulos de arriba son la
                      leyenda de las columnas y no van al árbol accesible;
                      lo que se anuncia es la fila entera. */}
                  <div className="agenda-tabla">
                    <div className="agenda-head" aria-hidden="true">
                      <span className="rotulo">Hora</span>
                      <span className="rotulo">Cliente</span>
                      <span className="rotulo">Servicio</span>
                      <span className="rotulo">Dónde</span>
                      <span />
                    </div>

                    {grouped.map(group => (
                      <section key={group.key} aria-labelledby={`dia-pc-${group.key}`}>
                        <h2 id={`dia-pc-${group.key}`} className="rotulo agenda-dia">
                          <span>{group.label}</span>
                          <span>{group.items.length} {group.items.length === 1 ? 'turno' : 'turnos'}</span>
                        </h2>

                        {group.items.map(ev => (
                          <button
                            key={ev.id}
                            className="agenda-fila"
                            aria-current={selectedId === ev.id ? 'true' : undefined}
                            onClick={() => setSelectedId(ev.id)}
                          >
                            <span className="agenda-hora">{formatTime(ev.start)}</span>
                            <span className="agenda-nombre">{ev.nombre}</span>
                            <span className="agenda-srv">{nombreServicio(ev.servicio)}</span>
                            <span className="agenda-donde">
                              {isDomicilio(ev.modalidad) ? LOCATION_LABELS.domicilio : LOCATION_LABELS.local}
                            </span>
                            <span className="agenda-mas" aria-hidden="true">›</span>
                          </button>
                        ))}
                      </section>
                    ))}
                  </div>

                  {/* ─── En celular: las tarjetas ───
                      La tarjeta ya trae todo lo que muestra el detalle, así
                      que acá no hay una segunda columna a la que ir. */}
                  <div className="agenda-cards">
                    {grouped.map(group => (
                      <section key={group.key} aria-labelledby={`dia-cel-${group.key}`}>
                        <h2 id={`dia-cel-${group.key}`} className="rotulo agenda-dia">
                          <span>{group.label}</span>
                          <span>{group.items.length} {group.items.length === 1 ? 'turno' : 'turnos'}</span>
                        </h2>

                        <ul className="agenda-lista">
                        {group.items.map(ev => {
                          const dom = isDomicilio(ev.modalidad)
                          const tel = soloDigitos(ev.whatsapp)
                          const precio = precioServicio(ev.servicio)
                          const mins = duracionMin(ev)
                          return (
                          <li key={ev.id} className="turno">
                            <div className="turno-head">
                              <span className="turno-hora">
                                {formatTime(ev.start)}
                                {ev.end && <i> – {formatTime(ev.end)}</i>}
                              </span>
                              <span className="rotulo">
                                {dom ? LOCATION_LABELS.domicilio : LOCATION_LABELS.local}
                                {isHistory && ' · Pasado'}
                              </span>
                            </div>

                            <div className="turno-body">
                              <div className="turno-nombre">{ev.nombre}</div>

                              <div className="turno-srv">
                                <span>
                                  {nombreServicio(ev.servicio)}
                                  {mins > 0 && ` · ${mins} min`}
                                </span>
                                {precio > 0 && <span className="turno-precio">{money(precio)}</span>}
                              </div>

                              {/* A domicilio, la dirección es la información que
                                  define el turno y antes no aparecía en ninguna
                                  parte del panel.

                                  El nombre accesible arranca con el texto que se
                                  ve: con aria-label="Cómo llegar a…" el rótulo
                                  visible «Dónde ir» quedaba fuera del nombre, y
                                  quien dicta por voz no puede pedir un control
                                  por lo que lee en pantalla. */}
                              {dom && ev.direccion && (
                                <a
                                  className="turno-dir"
                                  href={mapsUrl(ev.direccion)}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                >
                                  <b>Dónde ir</b>
                                  {ev.direccion}
                                  <span className="sr-only"> — abrir en Google Maps</span>
                                  {' '}<span aria-hidden="true">↗</span>
                                </a>
                              )}

                              {ev.nota && <p className="turno-nota">{ev.nota}</p>}
                            </div>

                            <div className="turno-pie">
                              <div className="turno-contacto">
                                {tel && (
                                  <>
                                    <a href={`tel:${tel}`} className="btn-ghost turno-tel"
                                      aria-label={`Llamar a ${ev.nombre}`}>
                                      {telVisible(ev.whatsapp)}
                                    </a>
                                    <a href={`https://wa.me/${tel}`}
                                      target="_blank" rel="noopener noreferrer" className="btn-ghost"
                                      aria-label={`Escribirle a ${ev.nombre} por WhatsApp`}>
                                      WhatsApp <span aria-hidden="true">↗</span>
                                    </a>
                                  </>
                                )}
                                {ev.email && (
                                  <a href={`mailto:${ev.email}`} className="btn-ghost turno-mail"
                                    aria-label={`Escribirle a ${ev.nombre} por mail`}>
                                    {ev.email}
                                  </a>
                                )}
                              </div>

                              {!isHistory && (
                                <div className="turno-acciones">
                                  <button
                                    onClick={() => { setCancelTarget(ev); setCancelReason('') }}
                                    disabled={cancelling === ev.id}
                                    className="btn-ghost"
                                    aria-label={`Cancelar el turno de ${ev.nombre}`}
                                  >
                                    {cancelling === ev.id ? 'Cancelando…' : 'Cancelar'}
                                  </button>
                                  <button
                                    onClick={() => openEdit(ev)}
                                    className="btn-outline btn-sm"
                                    aria-label={`Modificar el turno de ${ev.nombre}`}
                                  >
                                    Modificar
                                  </button>
                                </div>
                              )}
                            </div>
                          </li>
                          )
                        })}
                        </ul>
                      </section>
                    ))}
                  </div>
                </>
              )}
            </div>
          </>
        ) : (
          <>
            {/* ─── Ajustes ─── */}
            <section>
              <h2 className="rotulo rotulo-rule">Ajustes</h2>

              <div style={{ display: 'flex', alignItems: 'flex-end', gap: 14, flexWrap: 'wrap' }}>
                <div style={{ flex: '1 1 200px', minWidth: 0, maxWidth: 320 }}>
                  <label className="field-label" htmlFor="max-daily">Tope de turnos por día</label>
                  <input
                    id="max-daily"
                    type="number"
                    min={1}
                    max={30}
                    value={maxDailyInput}
                    onChange={e => setMaxDailyInput(Number(e.target.value))}
                    className="w-input mono"
                  />
                </div>
                <button
                  onClick={handleSaveSettings}
                  disabled={savingSettings || maxDailyInput === maxDaily}
                  className="btn-cta"
                  style={{ flexShrink: 0, minWidth: 130 }}
                >
                  {savingSettings ? 'Guardando…' : 'Guardar'}
                </button>
              </div>
              <p className="mono" style={{ fontSize: 10.5, letterSpacing: '.06em', color: 'var(--text-meta)', margin: '12px 0 0' }}>
                AHORA MISMO EL TOPE ES DE {maxDaily} TURNOS POR DÍA
              </p>
            </section>

            {/* ─── Días bloqueados ─── */}
            <section style={{ marginTop: 44, maxWidth: 560 }}>
              <button
                onClick={() => setShowBlocked(v => !v)}
                aria-expanded={showBlocked}
                aria-controls="dias-bloqueados"
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
                  width: '100%', minHeight: 44, background: 'none', border: 'none',
                  padding: '0 0 10px', borderBottom: '1px solid var(--border)', cursor: 'pointer',
                }}
              >
                <span className="rotulo" style={{ color: 'var(--text)' }}>Días bloqueados</span>
                <span className="rotulo">
                  {showBlocked ? 'Ocultar' : `Mostrar (${blockedDates.length})`}
                </span>
              </button>

              {showBlocked && (
                <div id="dias-bloqueados" style={{ marginTop: 20 }}>
                  <div style={{ display: 'flex', gap: 14 }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <label className="field-label" htmlFor="block-from">Desde</label>
                      <input
                        id="block-from"
                        type="date"
                        value={blockFrom}
                        onChange={e => { setBlockFrom(e.target.value); if (!blockTo || e.target.value > blockTo) setBlockTo(e.target.value) }}
                        min={toDateParam(new Date())}
                        className="w-input mono"
                      />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <label className="field-label" htmlFor="block-to">Hasta</label>
                      <input
                        id="block-to"
                        type="date"
                        value={blockTo}
                        onChange={e => setBlockTo(e.target.value)}
                        min={blockFrom || toDateParam(new Date())}
                        className="w-input mono"
                      />
                    </div>
                  </div>

                  <button
                    onClick={handleBlockDate}
                    disabled={!blockFrom || blockingDate}
                    className="btn-cta"
                    style={{ width: '100%', marginTop: 20 }}
                  >
                    {blockingDate
                      ? 'Bloqueando…'
                      : blockTo && blockTo !== blockFrom
                      ? `Bloquear del ${shortDay(blockFrom)} al ${shortDay(blockTo)}`
                      : blockFrom
                      ? `Bloquear el ${shortDay(blockFrom)}`
                      : 'Bloquear el día'}
                  </button>

                  <div style={{ marginTop: 26 }}>
                    {blockedDates.length === 0 ? (
                      <p className="rotulo" style={{ lineHeight: 1.8 }}>Ningún día bloqueado</p>
                    ) : (
                      <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
                      {blockedDates.map(b => {
                        const [year, month, day] = b.date.split('-').map(Number)
                        const d = new Date(year, month - 1, day)
                        const label = upperFirst(d.toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }))
                        return (
                          <li
                            key={b.id}
                            style={{
                              display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
                              padding: '10px 0', borderBottom: '1px solid var(--border-soft)',
                            }}
                          >
                            <span style={{ fontSize: 13, color: 'var(--text)' }}>{label}</span>
                            <button
                              onClick={() => handleUnblock(b.id)}
                              className="btn-ghost"
                              aria-label={`Desbloquear el ${label}`}
                              style={{ minHeight: 44, flexShrink: 0 }}
                            >
                              Desbloquear
                            </button>
                          </li>
                        )
                      })}
                      </ul>
                    )}
                  </div>
                </div>
              )}
            </section>
          </>
        )}
      </main>

      {/* ─── Detalle del turno — la tercera columna ───
          Sólo existe en PC. En celular la tarjeta ya muestra lo mismo
          en el lugar donde se la lee. */}
      <aside className="panel-detalle" aria-label="Detalle del turno">
        {selected ? (
          <div className="detalle-cuerpo">
            <div className="rotulo">{selEsPasado ? 'Turno pasado' : 'Turno'}</div>

            <p className="detalle-hora">
              {formatTime(selected.start)}
              {selected.end && <i> – {formatTime(selected.end)}</i>}
            </p>
            <p className="rotulo detalle-fecha">{upperFirst(fechaLarga(selected.start))}</p>

            <h2 className="detalle-nombre">{selected.nombre}</h2>

            <div className="kv">
              <span className="kv-k">Servicio</span>
              <span className="kv-v">{nombreServicio(selected.servicio)}</span>
            </div>
            {duracionMin(selected) > 0 && (
              <div className="kv">
                <span className="kv-k">Dura</span>
                <span className="kv-v mono">{duracionMin(selected)} min</span>
              </div>
            )}
            {precioServicio(selected.servicio) > 0 && (
              <div className="kv">
                <span className="kv-k">Precio</span>
                <span className="kv-v mono">{money(precioServicio(selected.servicio))}</span>
              </div>
            )}
            <div className="kv">
              <span className="kv-k">Dónde</span>
              <span className="kv-v">
                {isDomicilio(selected.modalidad) ? LOCATION_LABELS.domicilio : LOCATION_LABELS.local}
              </span>
            </div>
            {soloDigitos(selected.whatsapp) && (
              <div className="kv">
                <span className="kv-k">Teléfono</span>
                <span className="kv-v">
                  <a href={`tel:${soloDigitos(selected.whatsapp)}`} className="btn-ghost turno-tel"
                    aria-label={`Llamar a ${selected.nombre}`}>
                    {telVisible(selected.whatsapp)}
                  </a>
                </span>
              </div>
            )}
            {soloDigitos(selected.whatsapp) && (
              <div className="kv">
                <span className="kv-k">WhatsApp</span>
                <span className="kv-v">
                  <a href={`https://wa.me/${soloDigitos(selected.whatsapp)}`}
                    target="_blank" rel="noopener noreferrer" className="btn-ghost"
                    aria-label={`Escribirle a ${selected.nombre} por WhatsApp`}>
                    Escribirle <span aria-hidden="true">↗</span>
                  </a>
                </span>
              </div>
            )}
            {selected.email && (
              <div className="kv">
                <span className="kv-k">Mail</span>
                <span className="kv-v">
                  <a href={`mailto:${selected.email}`} className="btn-ghost turno-mail"
                    aria-label={`Escribirle a ${selected.nombre} por mail`}>
                    {selected.email}
                  </a>
                </span>
              </div>
            )}

            {isDomicilio(selected.modalidad) && selected.direccion && (
              <a
                className="turno-dir"
                href={mapsUrl(selected.direccion)}
                target="_blank"
                rel="noopener noreferrer"
              >
                <b>Dónde ir</b>
                {selected.direccion}
                <span className="sr-only"> — abrir en Google Maps</span>
                {' '}<span aria-hidden="true">↗</span>
              </a>
            )}

            {selected.nota && <p className="turno-nota">{selected.nota}</p>}

            {/* Un turno que ya pasó no se reprograma ni se cancela: lo
                único que queda es mirarlo. */}
            {!selEsPasado && (
              <div className="detalle-acciones">
                <button
                  onClick={() => openEdit(selected)}
                  className="btn-outline"
                  aria-label={`Reprogramar el turno de ${selected.nombre}`}
                >
                  Reprogramar
                </button>
                <button
                  onClick={() => { setCancelTarget(selected); setCancelReason('') }}
                  disabled={cancelling === selected.id}
                  className="btn-ghost"
                  aria-label={`Cancelar el turno de ${selected.nombre}`}
                >
                  {cancelling === selected.id ? 'Cancelando…' : 'Cancelar el turno'}
                </button>
              </div>
            )}
          </div>
        ) : (
          <p className="rotulo detalle-vacio">Elegí un turno de la agenda para verlo acá.</p>
        )}
      </aside>

      {/* ─── Pestañas de celular ───
          Son la misma navegación que la barra lateral, abajo, al
          alcance del pulgar. */}
      <nav className="panel-tabs" aria-label="Secciones del panel">
        {SECCIONES.map(s => (
          <button
            key={s.key}
            aria-current={seccion === s.key ? 'page' : undefined}
            onClick={() => setSeccion(s.key)}
          >
            {s.label}
          </button>
        ))}
      </nav>

      {/* ─── Hoja: cancelar turno ─── */}
      {cancelTarget && (
        <div
          className="sheet-overlay"
          role="dialog"
          aria-modal="true"
          aria-labelledby="cancel-title"
          onClick={e => { if (e.target === e.currentTarget) closeSheets() }}
        >
          <div className="sheet" ref={sheetRef}>
            <div className="rotulo">Cancelación</div>
            <h2
              id="cancel-title"
              className="font-display"
              style={{ fontSize: 30, fontWeight: 800, lineHeight: 1, letterSpacing: '-.04em', color: 'var(--text)', margin: '12px 0 0' }}
            >
              ¿Cancelar el turno de {cancelTarget.nombre.split(' ')[0]}?
            </h2>

            <div style={{ margin: '20px 0 0' }}>
              <div className="kv">
                <span className="kv-k">Cliente</span>
                <span className="kv-v">{cancelTarget.nombre}</span>
              </div>
              <div className="kv">
                <span className="kv-k">Turno</span>
                <span className="kv-v mono">
                  {`${upperFirst(fechaLarga(cancelTarget.start))} · ${formatTime(cancelTarget.start)}`}
                </span>
              </div>
            </div>

            <p className="mono" style={{ fontSize: 10.5, lineHeight: 1.7, color: 'var(--text-meta)', margin: '18px 0 0' }}>
              EL TURNO SE BORRA DEL CALENDARIO Y EL HORARIO QUEDA LIBRE.
              <br />
              AL CLIENTE LE LLEGA UN MAIL AVISÁNDOLE. NO SE PUEDE DESHACER.
            </p>

            <div style={{ marginTop: 22 }}>
              <label className="field-label" htmlFor="cancel-reason">
                Motivo <span style={{ color: 'var(--text-meta)' }}>· opcional, va en el mail</span>
              </label>
              <textarea
                id="cancel-reason"
                value={cancelReason}
                onChange={e => setCancelReason(e.target.value)}
                placeholder="Se me complicó la agenda…"
                rows={2}
                className="w-input"
                style={{ resize: 'none', minHeight: 62 }}
              />
            </div>

            <div style={{ display: 'flex', gap: 10, marginTop: 26 }}>
              <button onClick={closeSheets} className="btn-outline" style={{ flex: 1 }}>
                Volver
              </button>
              <button
                onClick={confirmCancel}
                disabled={!!cancelling}
                className="btn-cta"
                style={{ flex: 2 }}
              >
                {cancelling ? 'Cancelando…' : 'Cancelar el turno'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Hoja: modificar turno ─── */}
      {editing && (
        <div
          className="sheet-overlay"
          role="dialog"
          aria-modal="true"
          aria-labelledby="edit-title"
          onClick={e => { if (e.target === e.currentTarget) closeSheets() }}
        >
          <div className="sheet" ref={sheetRef}>
            <div className="rotulo">Reprogramar</div>
            <h2
              id="edit-title"
              className="font-display"
              style={{ fontSize: 30, fontWeight: 800, lineHeight: 1, letterSpacing: '-.04em', color: 'var(--text)', margin: '12px 0 0' }}
            >
              Modificar turno
            </h2>

            <div style={{ margin: '20px 0 0' }}>
              <div className="kv">
                <span className="kv-k">Cliente</span>
                <span className="kv-v">{editing.nombre}</span>
              </div>
              <div className="kv">
                <span className="kv-k">Servicio</span>
                <span className="kv-v">{editing.servicio.split(' — ')[0]}</span>
              </div>
            </div>

            <div style={{ marginTop: 24 }}>
              <label className="field-label" htmlFor="edit-date">Nueva fecha</label>
              <input
                id="edit-date"
                type="date"
                value={editDate}
                min={toDateParam(new Date())}
                onChange={e => {
                  setEditDate(e.target.value)
                  setEditTime('')
                  if (e.target.value && editing) fetchEditSlots(e.target.value, editing.modalidad)
                }}
                className="w-input mono"
              />
            </div>

            <div style={{ marginTop: 26 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, paddingBottom: 11, borderBottom: '1px solid var(--border)', marginBottom: 14 }}>
                <span className="rotulo" id="nuevo-horario">Nuevo horario</span>
                <div className="slot-legend">
                  <span><i className="is-free" />Libre</span>
                  <span><i className="is-busy" />Ocupado</span>
                  <span><i className="is-pick" />Elegido</span>
                </div>
              </div>

              {loadingEditSlots ? (
                <div className="slot-grid" aria-hidden="true" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
                  {Array.from({ length: 8 }).map((_, i) => (
                    <div key={i} className="slot-skeleton" />
                  ))}
                </div>
              ) : (
                <div className="slot-grid" role="group" aria-labelledby="nuevo-horario" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
                  {TIME_SLOTS[isDomicilio(editing.modalidad) ? 'domicilio' : 'local'].map(slot => {
                    const isOccupied = editBlockedSlots.includes(slot)
                    const isSelected = editTime === slot
                    return (
                      <button
                        key={slot}
                        aria-disabled={isOccupied || undefined}
                        onClick={() => { if (!isOccupied) setEditTime(slot) }}
                        aria-label={`${slot} — ${isOccupied ? 'ocupado' : 'libre'}`}
                        className={`slot${!isOccupied && isSelected ? ' is-pick' : ''}`}
                      >
                        {slot}
                      </button>
                    )
                  })}
                </div>
              )}
            </div>

            {editError && (
              <p className="mono" role="alert" style={{
                fontSize: 11, lineHeight: 1.6, color: 'var(--text)',
                border: '1px solid var(--text)', padding: '11px 13px', margin: '22px 0 0',
              }}>
                {editError}
              </p>
            )}

            <div style={{ display: 'flex', gap: 10, marginTop: 28 }}>
              <button onClick={closeSheets} className="btn-outline" style={{ flex: 1 }}>
                Volver
              </button>
              <button
                onClick={handleSaveEdit}
                disabled={saving || !editDate || !editTime}
                className="btn-cta"
                style={{ flex: 2 }}
              >
                {saving ? 'Guardando…' : 'Guardar y avisarle al cliente'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
