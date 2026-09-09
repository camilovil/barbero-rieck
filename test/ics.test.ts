import { test, describe } from 'node:test'
import assert from 'node:assert/strict'
import { buildICS, icsUid, instanteDeTurno, selloLocal } from '../lib/ics.ts'

/* El .ics del mail de confirmación es lo que termina en el calendario del
   cliente, y hasta acá venía con la hora tres horas antes: el turno de las
   18:30 se guardaba como 18:30 UTC —15:30 de Buenos Aires—, que fue lo que
   Santiago vio en la tarjeta de Gmail. La hora del turno no puede depender de
   en qué zona horaria corre el servidor ni de en cuál lo lee el cliente. */

/* El formato pliega las líneas largas a los 75 octetos: para leer un campo
   entero hay que volver a unirlas. */
const desplegar = (ics: string) => ics.split('\r\n ').join('')

const turno = (over: Partial<Parameters<typeof buildICS>[0]> = {}) =>
  buildICS({
    method: 'REQUEST',
    uid: 'x@barberhohle',
    start: instanteDeTurno(new Date('2026-10-01'), '18:30'),
    durationMin: 40,
    summary: 'Corte — Barber Höhle',
    location: 'Congreso 1865, Belgrano, CABA',
    nombre: 'Juan Pérez',
    email: 'juan@example.com',
    ...over,
  })

describe('la hora del turno', () => {
  test('18:30 de Buenos Aires son las 21:30 UTC', () => {
    assert.equal(
      instanteDeTurno(new Date('2026-10-01'), '18:30').toISOString(),
      '2026-10-01T21:30:00.000Z',
    )
  })

  test('el .ics lo escribe con TZID, no como si fuera UTC', () => {
    const ics = turno()
    assert.match(ics, /DTSTART;TZID=America\/Argentina\/Buenos_Aires:20261001T183000/)
    assert.match(ics, /DTEND;TZID=America\/Argentina\/Buenos_Aires:20261001T191000/)
    // Lo que estaba mal: la hora de Buenos Aires estampada con Z al final.
    assert.doesNotMatch(ics, /DTSTART:20261001T183000Z/)
  })

  test('lleva la zona horaria adentro, para el que no conozca el TZID', () => {
    assert.match(turno(), /BEGIN:VTIMEZONE[\s\S]*TZOFFSETTO:-0300[\s\S]*END:VTIMEZONE/)
  })

  /* La fecha llega de dos lados: del formulario, como medianoche UTC, y del
     evento ya tomado, como el instante de inicio. El turno de las 20:00 en UTC
     ya es del día siguiente: leerlo mal lo corría un día. */
  test('un instante de la tarde no se corre al día siguiente', () => {
    const inicio = new Date('2026-10-01T23:00:00.000Z') // 20:00 en Buenos Aires
    assert.equal(selloLocal(inicio), '20261001T200000')
    assert.equal(instanteDeTurno(inicio, '20:00').toISOString(), inicio.toISOString())
  })
})

describe('el turno como invitación', () => {
  test('tiene organizador y asistente: sin eso no se agrega a ningún lado', () => {
    const ics = desplegar(turno())
    assert.match(ics, /METHOD:REQUEST/)
    assert.match(ics, /ORGANIZER;CN=Barber Höhle:mailto:/)
    assert.match(ics, /ATTENDEE;[^\r\n]*mailto:juan@example\.com/)
    assert.match(ics, /STATUS:CONFIRMED/)
  })

  test('cancelar manda el mismo turno, dado de baja', () => {
    const ics = turno({ method: 'CANCEL' })
    assert.match(ics, /METHOD:CANCEL/)
    assert.match(ics, /STATUS:CANCELLED/)
    assert.match(ics, /UID:x@barberhohle/)
    assert.doesNotMatch(ics, /BEGIN:VALARM/)
  })

  test('el recordatorio va adentro del turno', () => {
    assert.match(turno({ alarmaMin: 120 }), /BEGIN:VALARM\r\nTRIGGER:-PT120M/)
  })

  test('la dirección va escapada: la coma es un separador del formato', () => {
    assert.match(turno(), /LOCATION:Congreso 1865\\, Belgrano\\, CABA/)
  })

  test('ninguna línea pasa de 75 octetos', () => {
    const largo = turno({
      summary: 'Corte y barba a domicilio — Barber Höhle, Santiago Rieck, Belgrano',
      description: 'Una descripción bien larga para forzar el plegado de líneas del formato, con acentos y eñes: mañana, cañón, Höhle, y algo más todavía.',
    })
    for (const line of largo.split('\r\n')) {
      assert.ok(Buffer.from(line, 'utf8').length <= 75, `línea de ${Buffer.from(line, 'utf8').length} octetos: ${line}`)
    }
    // Y desplegado tiene que volver a decir lo mismo, sin caracteres partidos.
    assert.match(desplegar(largo), /SUMMARY:Corte y barba a domicilio — Barber Höhle\\, Santiago Rieck\\, Belgrano/)
  })
})

describe('el identificador del turno', () => {
  const start = instanteDeTurno(new Date('2026-10-01'), '18:30')

  test('el mismo turno da siempre el mismo UID', () => {
    assert.equal(icsUid(start, 'juan@example.com'), icsUid(start, 'JUAN@example.com '))
  })

  /* Dos clientes distintos no pueden compartir UID: el turno de uno le
     pisaría el del otro en su propio calendario. */
  test('dos clientes en el mismo horario no comparten UID', () => {
    assert.notEqual(icsUid(start, 'juan@example.com'), icsUid(start, 'ana@example.com'))
  })
})
