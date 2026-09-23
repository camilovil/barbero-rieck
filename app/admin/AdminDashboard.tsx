'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import type { BookingEvent } from '@/lib/googleCalendar'
import type { MesCobrado, ResumenIngresos } from '@/lib/ingresos'
import ThemeToggle from '@/components/ThemeToggle'
import TurnoTracker from '@/components/TurnoTracker'
import { TIME_SLOTS, LOCATION_LABELS, DEPOSIT_HOLD_LABEL } from '@/lib/constants'
import {
  capitalize as upperFirst,
  diaBA,
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

/* «1 – 7 de septiembre», y con el mes de los dos extremos cuando la semana
   lo cruza. Los números de la grilla solos no dicen de qué mes son, y en la
   última semana de cada mes eso importa. */
function rangoDeSemana(dias: Date[]): string {
  const mes = (d: Date) => d.toLocaleDateString('es-AR', { month: 'long' })
  const desde = dias[0]
  const hasta = dias[6]
  return mes(desde) === mes(hasta)
    ? `${desde.getDate()} – ${hasta.getDate()} de ${mes(hasta)}`
    : `${desde.getDate()} de ${mes(desde)} – ${hasta.getDate()} de ${mes(hasta)}`
}
const FILTERS = [
  { key: 'upcoming', label: 'Próximos' },
  { key: 'today', label: 'Hoy' },
  { key: 'week', label: 'Semana' },
  { key: 'history', label: 'Historial' },
] as const

type Filter = (typeof FILTERS)[number]['key']

/* La navegación lleva SÓLO estas tres. El diseño dibuja además
   Clientes, Servicios y Horarios, que no existen como pantallas: un
   link que no lleva a ningún lado es peor que la ausencia del link. */
const SECCIONES = [
  { key: 'agenda', label: 'Agenda' },
  { key: 'cobros', label: 'Cobros' },
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
  const [cancelError, setCancelError] = useState('')
  const [filter, setFilter] = useState<Filter>('upcoming')
  const [search, setSearch] = useState('')
  const [history, setHistory] = useState<BookingEvent[]>([])
  const [loadingHistory, setLoadingHistory] = useState(false)
  const [historyLoaded, setHistoryLoaded] = useState(false)

  /* Qué semana muestra la vista semanal: 0 es la de hoy, -1 la anterior,
     1 la que viene. Es lo único que se mueve; el resto del panel siempre
     habla del presente. */
  const [weekOffset, setWeekOffset] = useState(0)

  // Qué sección de la navegación está abierta
  const [seccion, setSeccion] = useState<Seccion>('agenda')

  /* El turno abierto en la columna del detalle. Se guarda el id y no
     el objeto: reprogramar le cambia el id al evento y cancelar lo
     saca de la lista, así que un objeto guardado quedaría mostrando
     un turno que ya no existe. */
  const [selectedId, setSelectedId] = useState<string | null>(null)

  // Reprogramar turno
  const [editing, setEditing] = useState<BookingEvent | null>(null)
  const [editDate, setEditDate] = useState('')
  const [editTime, setEditTime] = useState('')
  const [saving, setSaving] = useState(false)
  const [editBlockedSlots, setEditBlockedSlots] = useState<string[]>([])
  const [loadingEditSlots, setLoadingEditSlots] = useState(false)
  const [editError, setEditError] = useState('')

  // Días bloqueados
  const [blockedDates, setBlockedDates] = useState<{ id: string; date: string }[]>([])
  const [blockedRanges, setBlockedRanges] = useState<{ id: string; start: string; end: string }[]>([])
  const [blockFrom, setBlockFrom] = useState('')
  const [blockTo, setBlockTo] = useState('')
  /* Vacías, se bloquea el día entero: es el caso de siempre y no puede
     costar un paso más. Con horas, se bloquea sólo esa franja. */
  const [blockHoraDesde, setBlockHoraDesde] = useState('')
  const [blockHoraHasta, setBlockHoraHasta] = useState('')
  const [blockingDate, setBlockingDate] = useState(false)
  const [showBlocked, setShowBlocked] = useState(false)

  // Ajustes
  /* null hasta que se lee de verdad: mostrar un 8 inventado como «el tope
     de ahora» es peor que decir que no se pudo leer. */
  const [maxDaily, setMaxDaily] = useState<number | null>(null)
  const [maxDailyInput, setMaxDailyInput] = useState(8)
  const [savingSettings, setSavingSettings] = useState(false)

  /* El resultado de cada acción. Antes sólo lo oía el lector de pantalla:
     Santiago cancelaba, bloqueaba o confirmaba una seña y la pantalla no le
     decía si había salido. Ahora se ve abajo y se va solo. Un error queda
     más tiempo: hay que llegar a leer qué hacer. */
  const [aviso, setAviso] = useState<{ texto: string; error: boolean } | null>(null)
  const avisoTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const setStatus = useCallback((texto: string, error = false) => {
    if (avisoTimer.current) clearTimeout(avisoTimer.current)
    setAviso({ texto, error })
    avisoTimer.current = setTimeout(() => setAviso(null), error ? 9000 : 5000)
  }, [])
  useEffect(() => () => { if (avisoTimer.current) clearTimeout(avisoTimer.current) }, [])

  /* Una sesión vencida contesta 401: se vuelve al login en vez de quedarse
     esperando una agenda que no va a llegar. */
  const [agendaError, setAgendaError] = useState(false)
  const fetchEvents = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/bookings')
      if (res.status === 401) { router.push('/admin/login'); return }
      if (!res.ok) throw new Error()
      const data = await res.json()
      setEvents(data.events ?? [])
      setAgendaError(false)
    } catch {
      setAgendaError(true)
    } finally {
      setLoading(false)
    }
  }, [router])

  const fetchBlockedDates = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/blocked-dates')
      if (!res.ok) throw new Error()
      const data = await res.json()
      setBlockedDates(data.blocked ?? [])
      setBlockedRanges(data.ranges ?? [])
    } catch {
      setStatus('No se pudieron leer los bloqueos. Recargá la página.', true)
    }
  }, [setStatus])

  useEffect(() => {
    fetchEvents()
    fetchBlockedDates()
    fetch('/api/admin/settings')
      .then(r => { if (!r.ok) throw new Error(); return r.json() })
      .then(d => { setMaxDaily(d.maxDailyBookings); setMaxDailyInput(d.maxDailyBookings) })
      .catch(() => setMaxDaily(null))
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
    setCancelError('')
    setEditing(null)
  }

  useEffect(() => {
    if (!sheetOpen) {
      /* Después de cancelar, el botón que abrió la hoja ya no existe: el
         foco caía en el <body>. Se lo lleva al buscador, arriba de la lista. */
      const opener = openerRef.current
      ;(opener?.isConnected ? opener : document.getElementById('admin-search'))?.focus()
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

  const [confirmando, setConfirmando] = useState<string | null>(null)

  /* Si falla, la hoja queda abierta con el error: cerrarla hacía creer que
     el turno se había cancelado cuando seguía en pie. */
  async function confirmCancel() {
    if (!cancelTarget) return
    setCancelling(cancelTarget.id)
    setCancelError('')
    try {
      const res = await fetch('/api/admin/cancelar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ eventId: cancelTarget.id, reason: cancelReason.trim() || undefined }),
      })
      if (!res.ok) throw new Error()
      setEvents(prev => prev.filter(e => e.id !== cancelTarget.id))
      setStatus(`Turno de ${cancelTarget.nombre} cancelado. Le avisamos por mail.`)
      setCancelTarget(null)
      setCancelReason('')
    } catch {
      setCancelError('No se pudo cancelar. Revisá la conexión y probá de nuevo.')
    } finally {
      setCancelling(null)
    }
  }

  /* Santiago cobró en efectivo, o arregló el turno por WhatsApp. Su
     confirmación vale lo mismo que la del webhook: la seña está para
     cubrirlo de las ausencias, no para atarle la forma de cobrar. */
  /* Confirmar la seña le manda un mail al cliente y no tiene vuelta atrás,
     y el botón vive en una lista que se recorre con el pulgar: un roce lo
     disparaba. El primer toque lo arma y el segundo confirma; si no llega
     el segundo, se desarma solo. */
  const [armado, setArmado] = useState<string | null>(null)
  const armadoTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(() => () => { if (armadoTimer.current) clearTimeout(armadoTimer.current) }, [])

  function tocarSena(ev: BookingEvent) {
    if (armadoTimer.current) clearTimeout(armadoTimer.current)
    if (armado !== ev.id) {
      setArmado(ev.id)
      armadoTimer.current = setTimeout(() => setArmado(null), 4000)
      return
    }
    setArmado(null)
    confirmarAMano(ev)
  }

  /* El rótulo visible es el principio del nombre accesible: quien dicta
     por voz pide el control por lo que lee. */
  function botonSena(ev: BookingEvent, conNombre = true): string {
    const base = confirmando === ev.id ? 'Confirmando…'
      : armado === ev.id ? 'Tocá de nuevo para confirmar la seña'
      : 'Recibí la seña — confirmar'
    return conNombre ? `${base} · ${ev.nombre}` : base
  }

  async function confirmarAMano(ev: BookingEvent) {
    setConfirmando(ev.id)
    const res = await fetch('/api/admin/confirmar', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ eventId: ev.id }),
    })
    if (res.ok) {
      setEvents(prev => prev.map(e => (e.id === ev.id ? { ...e, pago: 'pagado' } : e)))
      setStatus(`Turno de ${ev.nombre} confirmado. Le avisamos por mail.`)
    } else {
      const { error } = await res.json().catch(() => ({ error: '' }))
      setStatus(error || 'No se pudo confirmar la seña. Probá de nuevo en un rato.', true)
    }
    setConfirmando(null)
  }

  async function handleBlockDate() {
    if (!blockFrom) return
    const franja = Boolean(blockHoraDesde && blockHoraHasta)
    if (franja && blockHoraDesde >= blockHoraHasta) {
      setStatus('La hora de inicio tiene que ser anterior a la de fin.', true)
      return
    }
    setBlockingDate(true)
    const res = await fetch('/api/admin/blocked-dates', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        dateFrom: blockFrom,
        dateTo: blockTo || blockFrom,
        timeFrom: blockHoraDesde || undefined,
        timeTo: blockHoraHasta || undefined,
      }),
    })
    if (res.ok) {
      await fetchBlockedDates()
      setStatus(franja
        ? `Franja bloqueada de ${blockHoraDesde} a ${blockHoraHasta}. El resto del día sigue disponible.`
        : 'Días bloqueados. Ya no se pueden reservar turnos.')
      setBlockFrom('')
      setBlockTo('')
      setBlockHoraDesde('')
      setBlockHoraHasta('')
    } else {
      const data = await res.json().catch(() => null)
      setStatus(data?.error ?? 'No se pudo bloquear. Probá de nuevo en un rato.', true)
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
    } else {
      const data = await res.json().catch(() => null)
      setStatus(data?.error ?? 'No se pudo guardar el tope. Probá de nuevo.', true)
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

  /* El historial se pide una sola vez y cuando hace falta: al abrir su
     pestaña, o al retroceder a una semana pasada, que es la otra forma de
     mirar turnos que ya fueron. */
  const [historyError, setHistoryError] = useState(false)
  function cargarHistorial() {
    if (historyLoaded || loadingHistory) return
    setLoadingHistory(true)
    setHistoryError(false)
    fetch('/api/admin/bookings/history')
      .then(r => { if (!r.ok) throw new Error(); return r.json() })
      .then(data => { setHistory(data.events ?? []); setHistoryLoaded(true) })
      .catch(() => setHistoryError(true))
      .finally(() => setLoadingHistory(false))
  }

  function handleFilterChange(f: Filter) {
    setFilter(f)
    /* Cambiar de pestaña vuelve a la semana de hoy. Si no, se vuelve a
       «Semana» días después y sigue mostrando la que uno había dejado
       abierta, sin ninguna pista de por qué. */
    if (f !== 'week') setWeekOffset(0)
    if (f === 'history') cargarHistorial()
  }

  function irASemana(offset: number) {
    setWeekOffset(offset)
    if (offset < 0) cargarHistorial()
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
      setStatus(`Turno de ${editing.nombre} reprogramado al ${shortDay(editDate)} a las ${editTime}. Le avisamos por mail.`)
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
      /* Puede ser un día entero o una franja: se saca de las dos listas. */
      const eraFranja = blockedRanges.some(r => r.id === eventId)
      setBlockedDates(prev => prev.filter(b => b.id !== eventId))
      setBlockedRanges(prev => prev.filter(r => r.id !== eventId))
      setStatus(eraFranja ? 'Horario desbloqueado. Ya se puede reservar.' : 'Día desbloqueado. Ya se puede reservar.')
    } else {
      setStatus('No se pudo desbloquear. Probá de nuevo en un rato.', true)
    }
  }

  /* Los siete días de una semana, de lunes a domingo. `offset` la corre:
     0 es la de hoy, -1 la anterior.

     Dos cosas que estaban mal y se arreglan acá:

     · El domingo caía en la semana siguiente. `getDay()` devuelve 0 el
       domingo, así que la cuenta daba el lunes de mañana y el panel saltaba
       de semana un día antes de tiempo. Se atiende de lunes a sábado, así
       que casi no se veía — pero el domingo que Santiago abriera el panel,
       su semana no estaría.
     · El lunes conservaba la hora actual, y el filtro de la lista compara
       contra él: a las seis de la tarde, un turno del lunes a las nueve de
       la mañana quedaba afuera de «esta semana». */
  function getWeekDays(offset = 0): Date[] {
    const today = new Date()
    const day = today.getDay() === 0 ? 7 : today.getDay()
    const monday = new Date(today)
    monday.setDate(today.getDate() - day + 1 + offset * 7)
    monday.setHours(0, 0, 0, 0)
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(monday)
      d.setDate(monday.getDate() + i)
      return d
    })
  }

  const weekDays = getWeekDays(weekOffset)
  /* El domingo entero, no el domingo a las cero horas: si no, los turnos
     del último día de la semana no entran en su propia semana. */
  const finDeSemana = new Date(weekDays[6])
  finDeSemana.setHours(23, 59, 59, 999)

  /* La vista semanal mira el pasado y el futuro, así que se sirve de las dos
     listas. El historial puede no estar cargado todavía: se pide al
     retroceder, y mientras tanto la semana pasada se ve vacía por un
     segundo. */
  const eventosDeLaSemana = [...events, ...history]
    .filter(e => {
      const d = new Date(e.start)
      return d >= weekDays[0] && d <= finDeSemana
    })
    /* De lunes a domingo, como se lee la grilla de arriba. El historial viene
       del más reciente al más viejo —que es lo correcto en su pestaña, donde
       uno busca lo último— pero acá dejaba el sábado arriba del lunes. */
    .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime())

  /* Hasta dónde llega lo que el panel tiene cargado: la agenda viene con 30
     días para adelante. Más allá no hay «semana vacía», hay «semana que no
     pedimos», y son cosas distintas: por eso el botón se apaga en vez de
     mostrar un vacío que parece una agenda libre. */
  const SEMANAS_ADELANTE = 4
  const SEMANAS_ATRAS = 8

  const filteredBase = filter === 'history'
    ? history
    : filter === 'today'
    ? events.filter(e => new Date(e.start).toDateString() === new Date().toDateString())
    : filter === 'week'
    ? eventosDeLaSemana
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
  const previstoHoy = eventosHoy.reduce((sum, e) => sum + precioServicio(e.servicio) + e.viatico, 0)
  /* El número de arriba es siempre el de la semana en curso, aunque abajo se
     esté mirando otra: la fila de cifras es el estado de la casa hoy, no un
     resumen de lo que hay en pantalla. */
  const semanaDeHoy = getWeekDays(0)
  const finDeLaSemanaDeHoy = new Date(semanaDeHoy[6])
  finDeLaSemanaDeHoy.setHours(23, 59, 59, 999)
  const totalSemana = events.filter(e => {
    const d = new Date(e.start)
    return d >= semanaDeHoy[0] && d <= finDeLaSemanaDeHoy
  }).length

  const isHistory = filter === 'history'
  const isLoading = isHistory ? loadingHistory : loading
  const listaError = isHistory ? historyError : agendaError

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
    : filter === 'week'
      ? weekOffset === 0 ? 'Esta semana no tenés turnos.'
        : `Ningún turno entre el ${rangoDeSemana(weekDays)}.`
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
    <button onClick={handleLogout} className="btn-ghost">
      Cerrar sesión
    </button>
  )

  return (
    <div className="panel">

      {/* ─── Cabecera de celular ───
          En PC esto no existe: la marca y la sesión viven en la barra
          lateral. */}
      <header className="panel-cabecera" inert={sheetOpen}>
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
      <aside className="panel-lateral" inert={sheetOpen}>
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
      {/* Con una hoja abierta, lo de atrás queda inerte: el Tab no puede
          salirse del diálogo y perderse detrás del velo. */}
      <main className="panel-agenda" inert={sheetOpen}>
        <h1 className="sr-only">Panel admin — Barber Höhle</h1>

        {/* Una sola región de anuncios para todo el panel, y ahora también
            a la vista: las acciones cambian la pantalla en silencio y hay
            que contarlas. */}
        <p role="status" aria-live="polite" className="aviso" data-error={aviso?.error || undefined}>
          {aviso?.texto}
        </p>

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
                    <dt className="rotulo">{label}</dt>
                    <dd>{valor}</dd>
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
              <button onClick={fetchEvents} disabled={loading} className="link-btn" style={{ flexShrink: 0 }}>
                {loading ? 'Cargando…' : 'Recargar'}
              </button>
            </div>

            {/* ─── Vista semanal ─── */}
            {filter === 'week' && (
              /* A 375px, siete columnas dejan 50px por día y los nombres se
                 truncan hasta no decir nada. Se le da un ancho mínimo real y
                 se arrastra al costado, como la tira de días del flujo. */
              <div style={{ marginTop: 22 }}>
                {/* La barra de la semana. El rótulo del medio dice de qué
                    semana se está hablando, porque los números de la grilla
                    solos no alcanzan para saber si son de marzo o de abril. */}
                <div style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  gap: 12, marginBottom: 12,
                }}>
                  <button
                    onClick={() => irASemana(weekOffset - 1)}
                    disabled={weekOffset <= -SEMANAS_ATRAS}
                    className="btn-outline btn-sm"
                    aria-label="Semana anterior"
                  >
                    ←
                  </button>

                  <div style={{ textAlign: 'center', minWidth: 0 }}>
                    <div className="rotulo" style={{ whiteSpace: 'nowrap' }}>
                      {weekOffset === 0
                        ? 'Esta semana'
                        : weekOffset === 1
                          ? 'La semana que viene'
                          : weekOffset === -1
                            ? 'La semana pasada'
                            : rangoDeSemana(weekDays)}
                    </div>
                    {weekOffset !== 0 && (
                      <button onClick={() => irASemana(0)} className="link-btn" style={{ marginTop: 4 }}>
                        {rangoDeSemana(weekDays)} · volver a hoy
                      </button>
                    )}
                  </div>

                  <button
                    onClick={() => irASemana(weekOffset + 1)}
                    disabled={weekOffset >= SEMANAS_ADELANTE}
                    className="btn-outline btn-sm"
                    aria-label="Semana siguiente"
                  >
                    →
                  </button>
                </div>

                {/* A 375px, siete columnas dejan 50px por día y los nombres se
                    truncan hasta no decir nada. Se le da un ancho mínimo real
                    y se arrastra al costado, como la tira de días del flujo. */}
                <div style={{ overflowX: 'auto' }}>
                <div style={{
                  minWidth: 560, border: '1px solid var(--border)',
                  display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)',
                }}>
                  {weekDays.map((day, i) => {
                    const dayEvents = eventosDeLaSemana.filter(e => new Date(e.start).toDateString() === day.toDateString())
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
                                fontSize: 10.5, lineHeight: 1.5, paddingTop: 3,
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
              ) : listaError ? (
                /* Un error no es una agenda vacía: decir «no tenés turnos»
                   cuando no se pudo leer es mentirle. */
                <div style={{ padding: '44px 0', textAlign: 'center' }}>
                  <p className="nota" style={{ margin: 0, color: 'var(--text)' }}>
                    {isHistory ? 'No se pudo cargar el historial.' : 'No se pudo cargar la agenda.'} Revisá la conexión.
                  </p>
                  <button
                    onClick={() => {
                      if (isHistory) { setHistoryLoaded(false); setHistoryError(false); cargarHistorial() }
                      else fetchEvents()
                    }}
                    className="link-btn"
                    style={{ marginTop: 18 }}
                  >
                    Reintentar
                  </button>
                </div>
              ) : grouped.length === 0 ? (
                <div style={{ padding: '44px 0', textAlign: 'center' }}>
                  <p className="nota" style={{ margin: 0 }}>{emptyText}</p>
                  {searching ? (
                    <button onClick={() => setSearch('')} className="link-btn" style={{ marginTop: 18 }}>
                      Borrar la búsqueda
                    </button>
                  ) : filter !== 'upcoming' && !isHistory && (
                    /* Un vacío deja con un paso a mano, no en la nada. */
                    <button onClick={() => handleFilterChange('upcoming')} className="link-btn" style={{ marginTop: 18 }}>
                      Ver los próximos turnos
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
                            <span className="agenda-nombre">
                              {ev.nombre}
                              {ev.pago === 'pendiente' && <i className="marca-sena">Sin seña</i>}
                            </span>
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
                          // El traslado es plata que Santiago cobra: va en el mismo número.
                          const precio = precioServicio(ev.servicio) + ev.viatico
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
                                {ev.pago === 'pendiente' && <i className="marca-sena">Sin seña</i>}
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

                              {/* La salida para el que paga en efectivo. En PC
                                  vive en la columna del detalle, que en celular
                                  no existe: sin este botón acá, Santiago no
                                  tiene cómo dar la seña por recibida desde el
                                  teléfono, que es donde mira la agenda. Va al
                                  final del cuerpo y a todo el ancho: cierra el
                                  turno, y es lo último que se lee antes del
                                  contacto. Un turno pasado ya no se cobra. */}
                              {!isHistory && ev.pago === 'pendiente' && (
                                <button
                                  className="btn-outline turno-sena"
                                  disabled={confirmando === ev.id}
                                  onClick={() => tocarSena(ev)}
                                  aria-label={botonSena(ev)}
                                  data-armado={armado === ev.id || undefined}
                                >
                                  {botonSena(ev, false)}
                                </button>
                              )}
                            </div>

                            <div className="turno-pie">
                              <div className="turno-contacto">
                                {tel && (
                                  <>
                                    <a href={`tel:${tel}`} className="btn-ghost turno-tel"
                                      aria-label={`${telVisible(ev.whatsapp)} — llamar a ${ev.nombre}`}>
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
                                    aria-label={`${ev.email} — escribirle a ${ev.nombre}`}>
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
                                    aria-label={`Cancelar turno de ${ev.nombre}`}
                                  >
                                    {cancelling === ev.id ? 'Cancelando…' : 'Cancelar turno'}
                                  </button>
                                  <button
                                    onClick={() => openEdit(ev)}
                                    className="btn-outline btn-sm"
                                    aria-label={`Reprogramar turno de ${ev.nombre}`}
                                  >
                                    Reprogramar
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
        ) : seccion === 'cobros' ? (
          <Cobros />
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
                  style={{ flexShrink: 0, minWidth: 150 }}
                >
                  {savingSettings ? 'Guardando…' : 'Guardar tope'}
                </button>
              </div>
              <p className="nota">
                {maxDaily === null
                  ? 'No se pudo leer el tope guardado. Recargá la página antes de cambiarlo.'
                  : `Ahora mismo el tope es de ${maxDaily} turnos por día.`}
              </p>
            </section>

            {/* ─── Días bloqueados ───
                Bloquear es lo que se viene a hacer acá, así que el
                formulario está a la vista. Lo que se pliega es la lista de
                lo ya bloqueado, que se consulta de vez en cuando. */}
            <section style={{ marginTop: 44, maxWidth: 560 }}>
              <h2 className="rotulo rotulo-rule">Bloquear días u horarios</h2>

                <div>
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

                  {/* Las horas son opcionales: sin ellas cae el día entero,
                      con ellas sólo esa franja y el resto se sigue vendiendo. */}
                  <div style={{ display: 'flex', gap: 14, marginTop: 14 }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <label className="field-label" htmlFor="block-hora-desde">
                        Desde las <span style={{ color: 'var(--text-meta)' }}>· opcional</span>
                      </label>
                      <input
                        id="block-hora-desde"
                        type="time"
                        value={blockHoraDesde}
                        onChange={e => setBlockHoraDesde(e.target.value)}
                        className="w-input mono"
                      />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <label className="field-label" htmlFor="block-hora-hasta">
                        Hasta las <span style={{ color: 'var(--text-meta)' }}>· opcional</span>
                      </label>
                      <input
                        id="block-hora-hasta"
                        type="time"
                        value={blockHoraHasta}
                        onChange={e => setBlockHoraHasta(e.target.value)}
                        className="w-input mono"
                      />
                    </div>
                  </div>

                  <p className="nota">
                    {blockHoraDesde && blockHoraHasta
                      ? 'Se bloquea sólo esa franja; el resto del día se sigue reservando.'
                      : 'Sin horas se bloquea el día completo.'}
                  </p>

                  {/* Outline y no oro: en Ajustes el botón pleno es el del
                      tope, y el sistema lleva uno solo por pantalla. */}
                  <button
                    onClick={handleBlockDate}
                    disabled={!blockFrom || blockingDate}
                    className="btn-outline"
                    style={{ width: '100%', marginTop: 16 }}
                  >
                    {blockingDate
                      ? 'Bloqueando…'
                      : blockHoraDesde && blockHoraHasta && blockFrom
                      ? `Bloquear ${blockHoraDesde}–${blockHoraHasta}${blockTo && blockTo !== blockFrom ? ` del ${shortDay(blockFrom)} al ${shortDay(blockTo)}` : ` el ${shortDay(blockFrom)}`}`
                      : blockTo && blockTo !== blockFrom
                      ? `Bloquear del ${shortDay(blockFrom)} al ${shortDay(blockTo)}`
                      : blockFrom
                      ? `Bloquear el ${shortDay(blockFrom)}`
                      : 'Bloquear el día'}
                  </button>

                  <div style={{ marginTop: 32 }}>
                    <button
                      className="fila-toggle"
                      onClick={() => setShowBlocked(v => !v)}
                      aria-expanded={showBlocked}
                      aria-controls="dias-bloqueados"
                    >
                      <span className="rotulo" style={{ color: 'var(--text)' }}>
                        Ya bloqueado ({blockedDates.length + blockedRanges.length})
                      </span>
                      <span className="rotulo">{showBlocked ? 'Ocultar' : 'Ver'}</span>
                    </button>
                    {showBlocked && (
                    <div id="dias-bloqueados">
                    {blockedDates.length === 0 && blockedRanges.length === 0 ? (
                      <p className="nota">Nada bloqueado.</p>
                    ) : (
                      <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
                      {blockedRanges.map(r => {
                        const label = `${upperFirst(fechaLarga(r.start))} · ${formatTime(r.start)}–${formatTime(r.end)}`
                        return (
                          <li
                            key={r.id}
                            style={{
                              display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
                              padding: '10px 0', borderBottom: '1px solid var(--border-soft)',
                            }}
                          >
                            <span style={{ fontSize: 13, color: 'var(--text)' }}>{label}</span>
                            <button
                              onClick={() => handleUnblock(r.id)}
                              className="btn-ghost"
                              aria-label={`Desbloquear ${label}`}
                              style={{ flexShrink: 0 }}
                            >
                              Desbloquear
                            </button>
                          </li>
                        )
                      })}
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
                              style={{ flexShrink: 0 }}
                            >
                              Desbloquear
                            </button>
                          </li>
                        )
                      })}
                      </ul>
                    )}
                    </div>
                    )}
                  </div>
                </div>
            </section>
          </>
        )}
      </main>

      {/* ─── Detalle del turno — la tercera columna ───
          Sólo existe en PC. En celular la tarjeta ya muestra lo mismo
          en el lugar donde se la lee. */}
      <aside className="panel-detalle" aria-label="Detalle del turno" inert={sheetOpen}>
        {selected ? (
          <div className="detalle-cuerpo">
            <div className="rotulo">{selEsPasado ? 'Turno pasado' : 'Turno'}</div>

            <p className="detalle-hora">
              {formatTime(selected.start)}
              {selected.end && <i> – {formatTime(selected.end)}</i>}
            </p>
            <p className="rotulo detalle-fecha">{upperFirst(fechaLarga(selected.start))}</p>

            <h2 className="detalle-nombre">{selected.nombre}</h2>

            {/* El recorrido de la seña, arriba de los datos: con seña, saber
                si el turno está cerrado es lo primero, antes que el servicio
                o el precio. Reemplaza a la vieja fila «Seña» —decir dos veces
                el mismo estado, una en palabras y otra en barra, es ruido— y
                se queda con su dato operativo en la leyenda. Un turno sin
                seña no tiene recorrido: ahí no se dibuja nada. */}
            {selected.pago && (
              <TurnoTracker
                compacto
                estado={selected.pago === 'pagado' ? 'confirmado' : 'pendiente'}
                nota={selected.pago === 'pagado'
                  ? 'Seña pagada'
                  : `Sin seña · se libera en ${DEPOSIT_HOLD_LABEL}`}
              />
            )}

            {/* La salida para el que paga en efectivo. Aparece sólo mientras
                el turno espera la seña: confirmado ya no hay nada que hacer,
                y vencido el evento no existe. Va en outline y no en oro —el
                botón pleno de esta columna es otro— pero es la acción que
                cierra el turno, así que va arriba de todo el detalle. */}
            {selected.pago === 'pendiente' && (
              <button
                className="btn-outline"
                style={{ width: '100%', marginTop: 12 }}
                disabled={confirmando === selected.id}
                onClick={() => tocarSena(selected)}
                aria-label={botonSena(selected)}
                data-armado={armado === selected.id || undefined}
              >
                {botonSena(selected, false)}
              </button>
            )}

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
                <span className="kv-v mono">
                  {money(precioServicio(selected.servicio) + selected.viatico)}
                </span>
              </div>
            )}
            {/* Desglosado sólo cuando hay traslado: si no, sobra un renglón. */}
            {selected.viatico > 0 && (
              <div className="kv">
                <span className="kv-k">Incluye viático</span>
                <span className="kv-v mono">{money(selected.viatico)}</span>
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
                    aria-label={`${telVisible(selected.whatsapp)} — llamar a ${selected.nombre}`}>
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
                    aria-label={`${selected.email} — escribirle a ${selected.nombre}`}>
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
                  aria-label={`Reprogramar turno de ${selected.nombre}`}
                >
                  Reprogramar
                </button>
                <button
                  onClick={() => { setCancelTarget(selected); setCancelReason('') }}
                  disabled={cancelling === selected.id}
                  className="btn-outline btn-danger"
                  aria-label={`Cancelar turno de ${selected.nombre}`}
                >
                  {cancelling === selected.id ? 'Cancelando…' : 'Cancelar turno'}
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
      <nav className="panel-tabs" aria-label="Secciones del panel" inert={sheetOpen}>
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

            <p className="nota" style={{ marginTop: 18 }}>
              El turno se borra del calendario y el horario queda libre. Al cliente le llega un mail avisándole.
            </p>
            <p style={{ margin: '8px 0 0', fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>
              No se puede deshacer.
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

            {cancelError && <p className="error-caja" role="alert">{cancelError}</p>}

            <div style={{ display: 'flex', gap: 10, marginTop: 24 }}>
              <button onClick={closeSheets} className="btn-outline" style={{ flex: 1 }}>
                Volver
              </button>
              {/* Rojo y no oro: el oro es «Guardar», y esto borra. */}
              <button
                onClick={confirmCancel}
                disabled={!!cancelling}
                className="btn-outline btn-danger"
                style={{ flex: 2 }}
              >
                {cancelling ? 'Cancelando…' : cancelError ? 'Probar de nuevo' : 'Cancelar turno'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Hoja: reprogramar turno ─── */}
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
              ¿A cuándo pasa el turno de {editing.nombre.split(' ')[0]}?
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

            {editError && <p className="error-caja" role="alert">{editError}</p>}

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

/* "2026-09" → "Septiembre 2026" */
function nombreDelMes(mes: string): string {
  const [y, m] = mes.split('-').map(Number)
  return upperFirst(new Date(y, m - 1, 1).toLocaleDateString('es-AR', { month: 'long', year: 'numeric' }))
}

/* "21 al 27", o "31" cuando la semana se quedó con un solo día del mes. El
   mes no hace falta: está en el título de arriba. */
function diasDeSemana(desde: string, hasta: string): string {
  const d = Number(desde.slice(8))
  const h = Number(hasta.slice(8))
  return d === h ? `Día ${d}` : `Del ${d} al ${h}`
}

function turnosTxt(n: number): string {
  return n === 1 ? '1 turno' : `${n} turnos`
}

/* Los doce meses que muestra el gráfico, del más viejo al actual. Salen del
   calendario y no de los datos: un mes sin turnos tiene que verse como una
   barra en cero, no desaparecer y correr a los demás. */
function ultimosDoceMeses(): string[] {
  const [y, m] = diaBA(new Date()).split('-').map(Number)
  return Array.from({ length: 12 }, (_, i) => {
    const d = new Date(Date.UTC(y, m - 12 + i, 1))
    return d.toISOString().slice(0, 7)
  })
}

/* ─── Gráfico: lo cobrado mes a mes ───
   Una sola serie, así que una sola tinta y sin leyenda: el título dice qué
   es. Cada barra es un botón —se toca para ver su mes en el registro— y el
   renglón de arriba lee la barra marcada. El registro de abajo es la vista
   en tabla de estos mismos números.

   El mes elegido es el mismo que está abierto en el registro, y queda
   encendido hasta que se elige otro. Pasar el mouse por otra barra la lee
   de paso, sin mover la elección: al salir, vuelve a la elegida. */
function GraficoMensual({ meses, elegido, onElegir }: {
  meses: MesCobrado[]
  elegido: string | null
  onElegir: (mes: string) => void
}) {
  const claves = ultimosDoceMeses()
  const porMes = new Map(meses.map(m => [m.mes, m]))
  const serie = claves.map(k => porMes.get(k) ?? { mes: k, total: 0, turnos: 0, semanas: [] })
  const max = Math.max(...serie.map(m => m.total), 1)
  const actual = claves[claves.length - 1]
  const [encima, setEncima] = useState<string | null>(null)
  const fijo = elegido && claves.includes(elegido) ? elegido : actual
  const marcado = encima ?? fijo
  const m = serie.find(x => x.mes === marcado)!

  return (
    <figure style={{ margin: '36px 0 0', maxWidth: 560 }}>
      <figcaption className="rotulo rotulo-rule">Cobrado por mes</figcaption>

      <p aria-live="polite" style={{ margin: '0 0 14px', minHeight: 40 }}>
        <span style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>
          {nombreDelMes(m.mes)}{m.mes === actual ? ' · en curso' : ''}
        </span>
        <span className="mono" style={{ fontSize: 12, color: 'var(--text-mut)' }}>
          {money(m.total)} · {turnosTxt(m.turnos)}
          {m.turnos > 0 && ` · ${money(Math.round(m.total / m.turnos))} por turno`}
        </span>
      </p>

      <div
        onMouseLeave={() => setEncima(null)}
        style={{
          display: 'flex', alignItems: 'flex-end', gap: 2, height: 132,
          borderBottom: '1px solid var(--border)',
        }}
      >
        {serie.map(x => {
          const esFijo = x.mes === fijo
          const esMarcado = x.mes === marcado
          return (
            <button
              key={x.mes}
              onMouseEnter={() => setEncima(x.mes)}
              onFocus={() => setEncima(x.mes)}
              onBlur={() => setEncima(null)}
              onClick={() => { setEncima(null); onElegir(x.mes) }}
              aria-pressed={esFijo}
              aria-label={`${nombreDelMes(x.mes)}: ${money(x.total)}, ${turnosTxt(x.turnos)}. Ver en el registro.`}
              style={{
                /* El botón ocupa la columna entera, no sólo la barra: un mes
                   flojo tiene que poder tocarse igual. */
                flex: 1, minWidth: 0, height: '100%', padding: 0,
                display: 'flex', alignItems: 'flex-end',
                background: 'none', border: 'none', cursor: 'pointer',
              }}
            >
              <span
                aria-hidden="true"
                style={{
                  display: 'block', width: '100%',
                  height: x.total ? `${Math.max((x.total / max) * 100, 2)}%` : 0,
                  borderRadius: '4px 4px 0 0',
                  background: 'var(--acento)',
                  /* Elegido, a pleno; el que se lee de paso, a medio camino;
                     el resto, atrás. */
                  opacity: esFijo ? 1 : esMarcado ? 0.7 : 0.32,
                  transition: 'opacity .16s',
                }}
              />
            </button>
          )
        })}
      </div>

      {/* La inicial de cada mes. Sin el año: el renglón de arriba lo dice. */}
      <div aria-hidden="true" style={{ display: 'flex', gap: 2, marginTop: 6 }}>
        {serie.map(x => (
          <span
            key={x.mes}
            className="mono"
            style={{
              flex: 1, textAlign: 'center', fontSize: 10,
              color: x.mes === fijo ? 'var(--text)' : 'var(--text-meta)',
              fontWeight: x.mes === fijo ? 600 : 400,
            }}
          >
            {new Date(Number(x.mes.slice(0, 4)), Number(x.mes.slice(5)) - 1, 1)
              .toLocaleDateString('es-AR', { month: 'narrow' }).toUpperCase()}
          </span>
        ))}
      </div>
    </figure>
  )
}

/* ─── Cobros ───
   Lo que entró por semana y por mes. Se pide cada vez que se abre la
   sección: son pocas veces por día, y así nunca muestra una cifra de la
   mañana a la tarde. */
function Cobros() {
  const [resumen, setResumen] = useState<ResumenIngresos | null>(null)
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState(false)
  /* El mes en curso abierto de entrada: es el que se viene a mirar. */
  const [abierto, setAbierto] = useState<string | null>(null)
  /* El mes encendido en el gráfico. Va aparte del abierto porque el gráfico
     muestra los doce meses y el registro sólo los que tuvieron cobros:
     tocar un mes en cero lo lee en el gráfico sin cerrar lo que estaba
     abierto abajo. */
  const [elegido, setElegido] = useState<string | null>(null)

  /* Cada «Recargar» sube la vuelta y el efecto vuelve a pedir. El estado se
     toca sólo cuando llega la respuesta, y una respuesta vieja que llega
     tarde se descarta. */
  const [vuelta, setVuelta] = useState(0)

  useEffect(() => {
    let vigente = true
    fetch('/api/admin/ingresos')
      .then(res => {
        if (!res.ok) throw new Error()
        return res.json() as Promise<ResumenIngresos>
      })
      .then(data => {
        if (!vigente) return
        setResumen(data)
        setError(false)
        setAbierto(a => a ?? data.meses[0]?.mes ?? null)
      })
      .catch(() => { if (vigente) setError(true) })
      .finally(() => { if (vigente) setCargando(false) })
    return () => { vigente = false }
  }, [vuelta])

  function recargar() {
    setCargando(true)
    setVuelta(v => v + 1)
  }

  const cifras: [string, string][] = resumen
    ? [
        ['Esta semana', money(resumen.estaSemana.total)],
        ['Semana pasada', money(resumen.semanaPasada.total)],
        ['Este mes', money(resumen.esteMes.total)],
        ['Turnos del mes', String(resumen.esteMes.turnos)],
      ]
    : []

  return (
    <>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 12 }}>
        <h2 className="rotulo" style={{ margin: '0 0 14px' }}>Cobros</h2>
        <button onClick={recargar} disabled={cargando} className="link-btn" style={{ flexShrink: 0 }}>
          {cargando ? 'Cargando…' : 'Recargar'}
        </button>
      </div>

      {error ? (
        <p className="error-caja" role="alert">
          No se pudieron calcular los cobros. Probá recargar en un rato.
        </p>
      ) : !resumen ? (
        <p className="nota">Sumando los turnos…</p>
      ) : (
        <>
          <dl className="cifras">
            {cifras.map(([label, valor]) => (
              <div key={label}>
                <dt className="rotulo">{label}</dt>
                <dd>{valor}</dd>
              </div>
            ))}
          </dl>

          {/* Lo agendado que todavía no pasó. Va aparte y no sumado: es
              plata que entra sólo si no se cae nada. */}
          {(resumen.estaSemana.previsto > 0 || resumen.esteMes.previsto > 0) && (
            <p className="nota">
              Por cobrar si no se cae ningún turno: <b className="mono" style={{ color: 'var(--text)', fontWeight: 500 }}>{money(resumen.estaSemana.previsto)}</b> esta
              semana y <b className="mono" style={{ color: 'var(--text)', fontWeight: 500 }}>{money(resumen.esteMes.previsto)}</b> en lo que queda del mes.
            </p>
          )}

          <GraficoMensual
            meses={resumen.meses}
            elegido={elegido ?? abierto}
            onElegir={mes => {
              setElegido(mes)
              if (!resumen.meses.some(m => m.mes === mes)) return
              setAbierto(mes)
              document.getElementById(`cobros-mes-${mes}`)?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
            }}
          />

          {/* ─── Registro ─── */}
          <section style={{ marginTop: 40, maxWidth: 560 }}>
            <h3 className="rotulo rotulo-rule">Registro de los últimos 12 meses</h3>

            {resumen.meses.length === 0 ? (
              <p className="nota">Todavía no hay turnos cobrados.</p>
            ) : (
              <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
                {resumen.meses.map(m => {
                  const abiertoEste = abierto === m.mes
                  const id = `cobros-${m.mes}`
                  return (
                    <li
                      key={m.mes}
                      id={`cobros-mes-${m.mes}`}
                      style={{
                        borderBottom: '1px solid var(--border)',
                        /* El mes abierto lleva el filete vivo a la izquierda,
                           igual que la sección encendida de la navegación. */
                        borderLeft: `2px solid ${abiertoEste ? 'var(--sel-borde)' : 'transparent'}`,
                        paddingLeft: 12,
                        transition: 'border-color .16s',
                      }}
                    >
                      <button
                        onClick={() => { setAbierto(abiertoEste ? null : m.mes); setElegido(abiertoEste ? null : m.mes) }}
                        aria-expanded={abiertoEste}
                        aria-controls={id}
                        style={{
                          display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 12,
                          width: '100%', minHeight: 52, padding: '14px 0',
                          background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left',
                        }}
                      >
                        <span style={{ minWidth: 0 }}>
                          <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>{nombreDelMes(m.mes)}</span>
                          <span className="rotulo" style={{ marginLeft: 10 }}>{turnosTxt(m.turnos)}</span>
                        </span>
                        <span className="mono" style={{ fontSize: 15, fontWeight: 500, color: 'var(--text)', flexShrink: 0 }}>
                          {money(m.total)}
                          <span aria-hidden="true" style={{ marginLeft: 10, color: 'var(--text-meta)' }}>{abiertoEste ? '−' : '+'}</span>
                        </span>
                      </button>

                      {abiertoEste && (
                        <div id={id} style={{ paddingBottom: 12 }}>
                          {m.semanas.map(w => (
                            <div key={w.desde} className="kv">
                              <span className="kv-k">
                                {diasDeSemana(w.desde, w.hasta)} · {turnosTxt(w.turnos)}
                              </span>
                              <span className="kv-v mono">{money(w.total)}</span>
                            </div>
                          ))}
                          <div className="kv">
                            <span className="kv-k">Promedio por turno</span>
                            <span className="kv-v mono">{money(Math.round(m.total / m.turnos))}</span>
                          </div>
                          {/* Un link y no un fetch: el navegador baja el
                              archivo solo, con el nombre que pone la ruta. */}
                          <a
                            href={`/api/admin/ingresos/planilla?mes=${m.mes}`}
                            download
                            className="btn-outline btn-sm"
                            style={{ display: 'inline-flex', marginTop: 14 }}
                          >
                            Descargar {nombreDelMes(m.mes).toLowerCase()} en Excel
                          </a>
                        </div>
                      )}
                    </li>
                  )
                })}
              </ul>
            )}

            <p className="nota" style={{ marginTop: 16 }}>
              Suma servicio y viático de cada turno reservado por la web que ya pasó. Los cancelados no cuentan.
            </p>
          </section>
        </>
      )}
    </>
  )
}
