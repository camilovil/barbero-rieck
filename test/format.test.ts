import { test, describe } from 'node:test'
import assert from 'node:assert/strict'
import { capitalize, nombreServicio, precioServicio, toDateParam } from '../lib/format.ts'
import { SERVICES } from '../lib/constants.ts'

/* El parser de la línea «Servicio: X — $Y» de la descripción del evento.

   No es cosmético: esa línea es la ÚNICA fuente de verdad del precio de un
   turno ya tomado —el catálogo cambia y reprogramar no puede re-cotizar
   solo— y de ella salen el precio que ven los mails, el que muestra el
   panel y el que arrastran las dos rutas de reprogramación al recrear el
   evento. La revisión de seguridad mostró que si esa línea se puede
   falsificar, la falsificación se vuelve persistente. */

describe('leer el servicio guardado', () => {
  test('separa el nombre del precio', () => {
    assert.equal(nombreServicio('Corte y barba — $19.000'), 'Corte y barba')
    assert.equal(precioServicio('Corte y barba — $19.000'), 19000)
  })

  test('entiende lo que el propio código escribe', () => {
    /* La ida y vuelta: se arma la línea igual que en createCalendarEvent y
       se vuelve a leer. Si alguien cambia el separador de un lado y no del
       otro, esto se rompe acá y no en producción. */
    for (const lista of Object.values(SERVICES)) {
      for (const s of lista) {
        const linea = `${s.name} — $${s.price.toLocaleString('es-AR')}`
        assert.equal(nombreServicio(linea), s.name, `no pudo releer el nombre de "${linea}"`)
        assert.equal(precioServicio(linea), s.price, `no pudo releer el precio de "${linea}"`)
      }
    }
  })

  test('sin precio devuelve cero y no rompe', () => {
    assert.equal(precioServicio('Corte'), 0)
    assert.equal(precioServicio(''), 0)
    assert.equal(nombreServicio(''), '')
  })

  test('un nombre con guiones no se corta de más', () => {
    // El separador es " — " (raya con espacios), no cualquier guión.
    assert.equal(nombreServicio('Corte a-medida — $16.000'), 'Corte a-medida')
    assert.equal(precioServicio('Corte a-medida — $16.000'), 16000)
  })

  test('el precio se lee sin los puntos de miles', () => {
    assert.equal(precioServicio('X — $1.234.567'), 1234567)
    assert.equal(precioServicio('X — $500'), 500)
  })
})

describe('fechas', () => {
  test('toDateParam usa la fecha local, no UTC', () => {
    /* Con UTC, un turno de las 21:00 en Buenos Aires cae al día siguiente y
       la grilla lo muestra en el día equivocado. */
    const nocheDeAca = new Date(2026, 7, 14, 21, 30)
    assert.equal(toDateParam(nocheDeAca), '2026-08-14')
  })

  test('rellena mes y día con cero', () => {
    assert.equal(toDateParam(new Date(2026, 0, 5)), '2026-01-05')
  })
})

describe('capitalize', () => {
  test('sube sólo la primera letra y no toca el resto', () => {
    /* A propósito no es text-transform: capitalize, que produce cosas como
       "6 De Agosto". */
    assert.equal(capitalize('miércoles 6 de agosto'), 'Miércoles 6 de agosto')
  })

  test('aguanta el vacío', () => {
    assert.equal(capitalize(''), '')
  })
})
