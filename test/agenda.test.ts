import { test, describe } from 'node:test'
import assert from 'node:assert/strict'
import { slotsPisados, inicioDeSlot } from '../lib/agenda.ts'
import { diaDeAgenda } from '../lib/format.ts'

/* Qué horario tapa a cuál. Es el cálculo del que dependen dos cosas: la
   grilla que ve el cliente y —desde ahora— la respuesta a «ese horario ya
   está tomado» cuando confirma. Antes sólo lo usaba la grilla, así que dos
   personas con la pantalla abierta a las seis y media se llevaban las dos el
   mismo turno: al confirmar, nadie volvía a preguntar. */

const jueves = diaDeAgenda('2026-10-01')
const enElDia = (time: string, minutos: number) => {
  const start = inicioDeSlot(jueves, time)
  return { start: start.toISOString(), end: new Date(start.getTime() + minutos * 60000).toISOString() }
}

describe('los horarios que tapa un turno', () => {
  test('sin nada agendado no tapa ninguno', () => {
    assert.deepEqual(slotsPisados(jueves, 'local', []), [])
  })

  test('un turno tapa su horario', () => {
    const pisados = slotsPisados(jueves, 'local', [enElDia('18:30', 40)])
    assert.ok(pisados.includes('18:30'), 'el horario del turno tiene que quedar tomado')
    assert.ok(!pisados.includes('11:00'), 'y la mañana tiene que seguir libre')
  })

  /* En el local la grilla le reserva una hora a cada turno, así que uno de
     las 18:30 también se come el de las 18:00: no se puede empezar un corte
     media hora antes de otro. */
  test('también tapa el horario que arranca justo antes', () => {
    const pisados = slotsPisados(jueves, 'local', [enElDia('18:30', 40)])
    assert.ok(pisados.includes('18:00'))
    assert.ok(!pisados.includes('17:00'))
  })

  /* Una franja bloqueada y un turno tapan por el mismo motivo: Santiago no
     está. Esto es lo que el servidor no miraba, así que un «de tres a cinco
     no estoy» no frenaba a nadie con la grilla vieja en pantalla. */
  test('una franja bloqueada tapa igual que un turno', () => {
    const franja = {
      start: inicioDeSlot(jueves, '15:00').toISOString(),
      end: inicioDeSlot(jueves, '17:00').toISOString(),
    }
    const pisados = slotsPisados(jueves, 'local', [franja])
    assert.ok(pisados.includes('15:00'))
    assert.ok(pisados.includes('16:00'))
    assert.ok(!pisados.includes('17:00'), 'la franja termina a las 17:00, ese horario queda libre')
  })

  /* A domicilio Santiago viaja, así que la grilla le reserva dos horas a
     cada turno: uno de las 13:00 se lleva puesto el de las 11:30 —que
     terminaría a las 13:30— y el de las 14:30, que empezaría antes de que
     el anterior termine. */
  test('a domicilio un turno se come dos horas de agenda', () => {
    const pisados = slotsPisados(jueves, 'domicilio', [enElDia('13:00', 120)])
    assert.deepEqual(pisados, ['11:30', '13:00', '14:30'])
  })

  test('el horario se arma en hora de Buenos Aires', () => {
    assert.equal(inicioDeSlot(jueves, '18:30').toISOString(), '2026-10-01T21:30:00.000Z')
  })
})
