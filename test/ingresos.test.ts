import { test, describe } from 'node:test'
import assert from 'node:assert/strict'
import { lunesDe, resumirIngresos } from '../lib/ingresos.ts'

/* Miércoles 23 de septiembre de 2026, 15:00 en Buenos Aires. */
const AHORA = new Date('2026-09-23T15:00:00-03:00')
const turno = (start: string, monto: number, pago?: 'pendiente' | 'pagado') => ({ start, monto, pago })

describe('lunesDe', () => {
  test('la semana empieza el lunes, y el domingo es el último día', () => {
    assert.equal(lunesDe('2026-09-21'), '2026-09-21')
    assert.equal(lunesDe('2026-09-23'), '2026-09-21')
    assert.equal(lunesDe('2026-09-27'), '2026-09-21')
    assert.equal(lunesDe('2026-09-28'), '2026-09-28')
  })

  test('cruza meses y años', () => {
    assert.equal(lunesDe('2026-10-02'), '2026-09-28')
    assert.equal(lunesDe('2027-01-01'), '2026-12-28')
  })
})

describe('resumirIngresos', () => {
  test('esta semana separa lo cobrado de lo que falta', () => {
    const r = resumirIngresos([
      turno('2026-09-21T10:00:00-03:00', 17000),
      turno('2026-09-23T11:00:00-03:00', 20000),
      turno('2026-09-23T18:00:00-03:00', 17000), // hoy, más tarde
      turno('2026-09-26T10:00:00-03:00', 40000),
    ], AHORA)
    assert.deepEqual(r.estaSemana, { total: 37000, turnos: 2, previsto: 57000 })
  })

  test('la semana pasada es lunes a domingo entero', () => {
    const r = resumirIngresos([
      turno('2026-09-13T20:00:00-03:00', 1), // domingo de la anterior
      turno('2026-09-14T09:00:00-03:00', 17000),
      turno('2026-09-20T20:00:00-03:00', 20000), // domingo
    ], AHORA)
    assert.deepEqual(r.semanaPasada, { total: 37000, turnos: 2 })
  })

  test('el día es el de Buenos Aires, no el de UTC', () => {
    /* Domingo 20 a las 22:00 acá es lunes 21 en UTC: sigue siendo de la
       semana pasada. */
    const r = resumirIngresos([turno('2026-09-20T22:00:00-03:00', 17000)], AHORA)
    assert.equal(r.semanaPasada.total, 17000)
    assert.equal(r.estaSemana.total, 0)
  })

  test('una reserva sin la seña pagada no suma', () => {
    const r = resumirIngresos([
      turno('2026-09-22T10:00:00-03:00', 17000, 'pendiente'),
      turno('2026-09-22T11:00:00-03:00', 20000, 'pagado'),
    ], AHORA)
    assert.equal(r.estaSemana.total, 20000)
    assert.equal(r.meses[0].total, 20000)
  })

  test('el mes suma lo cobrado y avisa lo previsto', () => {
    const r = resumirIngresos([
      turno('2026-08-31T10:00:00-03:00', 5000),
      turno('2026-09-01T10:00:00-03:00', 17000),
      turno('2026-09-23T10:00:00-03:00', 20000),
      turno('2026-09-30T10:00:00-03:00', 17000),
      turno('2026-10-01T10:00:00-03:00', 99999),
    ], AHORA)
    assert.deepEqual(r.esteMes, { total: 37000, turnos: 2, previsto: 17000 })
  })

  test('el registro va del mes más nuevo al más viejo, sin turnos futuros', () => {
    const r = resumirIngresos([
      turno('2026-07-10T10:00:00-03:00', 1000),
      turno('2026-09-10T10:00:00-03:00', 3000),
      turno('2026-08-10T10:00:00-03:00', 2000),
      turno('2026-09-30T10:00:00-03:00', 9999),
    ], AHORA)
    assert.deepEqual(r.meses.map(m => [m.mes, m.total]), [
      ['2026-09', 3000], ['2026-08', 2000], ['2026-07', 1000],
    ])
  })

  test('una semana que cruza de mes se parte entre los dos', () => {
    const r = resumirIngresos([
      turno('2026-08-31T10:00:00-03:00', 1000), // lunes
      turno('2026-09-02T10:00:00-03:00', 2000), // miércoles, misma semana
    ], AHORA)
    const [sep, ago] = r.meses
    assert.deepEqual(ago.semanas, [{ total: 1000, turnos: 1, desde: '2026-08-31', hasta: '2026-08-31' }])
    assert.deepEqual(sep.semanas, [{ total: 2000, turnos: 1, desde: '2026-09-01', hasta: '2026-09-06' }])
  })
})
