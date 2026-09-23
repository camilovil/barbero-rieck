/* Cuánta plata entró, por semana y por mes.
 *
 * No hay base de datos ni libro de caja: el registro son los turnos que
 * quedaron en el calendario. Un turno cancelado se borra, así que lo que
 * sigue ahí y ya pasó es un turno que se hizo, y lo que se cobró es lo que
 * dice su descripción —servicio más viático, cotizados al reservar—. Por
 * eso el registro no hay que guardarlo aparte: se vuelve a sumar cada vez
 * desde la misma fuente, y no se puede desincronizar.
 *
 * Es puro cálculo sobre días de Buenos Aires, igual que lib/agenda.ts, para
 * poder probarlo sin credenciales. */

import { diaBA, hhmm, nombreServicio, precioServicio } from './format.ts'

export type TurnoCobrado = {
  /** El instante del turno, ISO. */
  start: string
  /** Servicio más viático. */
  monto: number
  /** Una reserva que todavía no pagó la seña no es plata de nadie. */
  pago?: 'pendiente' | 'pagado'
}

export type Periodo = { total: number; turnos: number }

export type SemanaDelMes = Periodo & {
  /** Primer y último día de la semana DENTRO del mes, "AAAA-MM-DD". */
  desde: string
  hasta: string
}

export type MesCobrado = Periodo & {
  /** "AAAA-MM" */
  mes: string
  semanas: SemanaDelMes[]
}

export type ResumenIngresos = {
  /** Lo que ya se cobró esta semana, y lo que falta si no se cae nada. */
  estaSemana: Periodo & { previsto: number }
  semanaPasada: Periodo
  esteMes: Periodo & { previsto: number }
  /** Del más reciente al más viejo. Sólo lo ya cobrado. */
  meses: MesCobrado[]
}

/* Los días se cuentan como fechas sueltas "AAAA-MM-DD" y la aritmética se
   hace en UTC: a medianoche UTC no hay huso que corra el día. */
function sumar(dia: string, n: number): string {
  const d = new Date(`${dia}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + n)
  return d.toISOString().slice(0, 10)
}

/** El lunes de la semana de un día. La semana va de lunes a domingo. */
export function lunesDe(dia: string): string {
  const dow = new Date(`${dia}T00:00:00Z`).getUTCDay() // 0 = domingo
  return sumar(dia, -((dow + 6) % 7))
}

function ultimoDelMes(mes: string): string {
  const [y, m] = mes.split('-').map(Number)
  return new Date(Date.UTC(y, m, 0)).toISOString().slice(0, 10)
}

const vacio = (): Periodo => ({ total: 0, turnos: 0 })

function sumarA(p: Periodo, monto: number) {
  p.total += monto
  p.turnos += 1
}

export function resumirIngresos(turnos: TurnoCobrado[], ahora: Date = new Date()): ResumenIngresos {
  const hoy = diaBA(ahora)
  const lunes = lunesDe(hoy)
  const lunesPasado = sumar(lunes, -7)
  const mesActual = hoy.slice(0, 7)

  const estaSemana = { ...vacio(), previsto: 0 }
  const semanaPasada = vacio()
  const esteMes = { ...vacio(), previsto: 0 }
  const porMes = new Map<string, Map<string, Periodo>>()

  for (const t of turnos) {
    if (t.pago === 'pendiente') continue
    const dia = diaBA(new Date(t.start))
    const semana = lunesDe(dia)
    const mes = dia.slice(0, 7)

    /* Lo que todavía no pasó no está cobrado: entra como previsto de su
       semana y de su mes, y al registro no. */
    if (new Date(t.start) > ahora) {
      if (semana === lunes) estaSemana.previsto += t.monto
      if (mes === mesActual) esteMes.previsto += t.monto
      continue
    }

    if (semana === lunes) sumarA(estaSemana, t.monto)
    if (semana === lunesPasado) sumarA(semanaPasada, t.monto)
    if (mes === mesActual) sumarA(esteMes, t.monto)

    if (!porMes.has(mes)) porMes.set(mes, new Map())
    const semanas = porMes.get(mes)!
    if (!semanas.has(semana)) semanas.set(semana, vacio())
    sumarA(semanas.get(semana)!, t.monto)
  }

  /* Una semana que cruza de mes se parte: cada mes se queda con sus días, y
     el rango que se muestra es el de esos días. Si no, la última semana de
     septiembre sumaría en septiembre los turnos del 2 de octubre. */
  const meses = [...porMes.entries()]
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([mes, semanas]) => {
      const primero = `${mes}-01`
      const ultimo = ultimoDelMes(mes)
      const lista = [...semanas.entries()]
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([lunesSem, p]) => ({
          ...p,
          desde: lunesSem < primero ? primero : lunesSem,
          hasta: sumar(lunesSem, 6) > ultimo ? ultimo : sumar(lunesSem, 6),
        }))
      return {
        mes,
        total: lista.reduce((s, w) => s + w.total, 0),
        turnos: lista.reduce((s, w) => s + w.turnos, 0),
        semanas: lista,
      }
    })

  return { estaSemana, semanaPasada, esteMes, meses }
}

/** La medianoche de Buenos Aires del día 1 de un mes "AAAA-MM", corrido
 *  n meses. Es el borde que se le pide al calendario. */
export function inicioDeMes(mes: string, n = 0): Date {
  const [y, m] = mes.split('-').map(Number)
  const d = new Date(Date.UTC(y, m - 1 + n, 1))
  return new Date(`${d.toISOString().slice(0, 10)}T00:00:00-03:00`)
}

/* ─── La planilla de un mes ───────────────────────────────────────
 *
 * Un CSV y no un .xlsx: Excel lo abre con doble clic, igual que Google
 * Sheets o Numbers, y no suma una dependencia. Va con punto y coma porque
 * el Excel en castellano usa la coma para los decimales y separaría mal, y
 * con BOM para que las tildes no salgan rotas. */

export type TurnoDePlanilla = {
  start: string
  nombre: string
  servicio: string
  modalidad: string
  viatico: number
  pago?: 'pendiente' | 'pagado'
}

/* Un nombre que empieza con = + - @ Excel lo lee como fórmula. El nombre lo
   escribe el cliente al reservar, así que se le antepone un apóstrofo: se ve
   igual y no se ejecuta. */
function celda(v: string | number): string {
  let s = String(v)
  if (/^[=+\-@]/.test(s)) s = `'${s}`
  return /[;"\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

/** Los turnos cobrados de un mes —los mismos que suma el registro—, uno por
 *  renglón y con el total al pie. */
export function planillaDelMes(turnos: TurnoDePlanilla[], mes: string, ahora: Date = new Date()): string {
  const filas = turnos
    .filter(t => t.pago !== 'pendiente' && new Date(t.start) <= ahora && diaBA(new Date(t.start)).startsWith(mes))
    .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime())
    .map(t => {
      const [y, m, d] = diaBA(new Date(t.start)).split('-')
      const precio = precioServicio(t.servicio)
      return [`${d}/${m}/${y}`, hhmm(t.start), t.nombre, nombreServicio(t.servicio), t.modalidad, precio, t.viatico, precio + t.viatico]
    })

  const total = filas.reduce((s, f) => s + (f[7] as number), 0)
  return '\uFEFF' + [
    ['Fecha', 'Hora', 'Cliente', 'Servicio', 'Modalidad', 'Servicio $', 'Viático $', 'Total $'],
    ...filas,
    [],
    ['Total del mes', '', `${filas.length} turnos`, '', '', '', '', total],
  ].map(f => f.map(celda).join(';')).join('\r\n') + '\r\n'
}
