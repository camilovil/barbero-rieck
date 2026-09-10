import { test, describe } from 'node:test'
import assert from 'node:assert/strict'
import {
  capitalize,
  diaBA,
  diaDeAgenda,
  fechaCorta,
  fechaLarga,
  hoyEnBA,
  nombreServicio,
  precioServicio,
  sumarDias,
  toDateParam,
} from '../lib/format.ts'
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

/* ─── El día de la agenda ─────────────────────────────────────────
 *
 * El bug que trajo esto: el mail de reprogramación le decía al cliente
 * «movimos tu turno al miércoles, 30 de septiembre» cuando el turno era el
 * jueves 1 de octubre. La ruta hacía `new Date("2026-10-01")` —medianoche
 * UTC— y el mail la mostraba en hora de Buenos Aires, donde esa medianoche
 * todavía es el día anterior a las nueve de la noche. */

describe('un día de la agenda', () => {
  const jueves = diaDeAgenda('2026-10-01')

  test('un día suelto es la medianoche de Buenos Aires', () => {
    assert.equal(jueves.toISOString(), '2026-10-01T03:00:00.000Z')
  })

  test('los mails lo escriben con el día que es', () => {
    assert.equal(fechaLarga(jueves), 'jueves, 1 de octubre')
    assert.equal(fechaCorta(jueves), 'Jue 1 oct')
  })

  /* Lo que hacía la ruta antes de esto. Se prueba el valor viejo para que
     quede escrito qué es lo que estaba mal. */
  test('la medianoche UTC, en cambio, decía el día anterior', () => {
    assert.equal(fechaLarga(new Date('2026-10-01')), 'miércoles, 30 de septiembre')
  })

  test('el día no depende de la zona del que lo lee', () => {
    assert.equal(diaBA(jueves), '2026-10-01')
    // Las once de la noche en Londres son las ocho acá: sigue siendo jueves.
    assert.equal(diaBA(new Date('2026-10-01T23:00:00.000Z')), '2026-10-01')
    // Y la medianoche de Londres ya es viernes allá, pero acá son las nueve.
    assert.equal(diaBA(new Date('2026-10-02T00:00:00.000Z')), '2026-10-01')
  })

  test('el titular de un turno de la noche no salta de día', () => {
    // 21:00 de Buenos Aires: en UTC ya es el 2 de octubre.
    assert.equal(fechaCorta(new Date('2026-10-02T00:00:00.000Z')), 'Jue 1 oct')
  })

  test('un ISO con hora se toma como el instante que es', () => {
    const instante = '2026-10-01T21:30:00.000Z'
    assert.equal(diaDeAgenda(instante).toISOString(), instante)
  })

  test('correr un día cruza el fin de mes', () => {
    assert.equal(diaBA(sumarDias(diaDeAgenda('2026-10-31'), 1)), '2026-11-01')
    assert.equal(diaBA(sumarDias(jueves, -1)), '2026-09-30')
  })

  test('hoy en Buenos Aires es un día de la agenda', () => {
    const hoy = hoyEnBA(new Date('2026-10-02T02:00:00.000Z')) // 23:00 del 1 acá
    assert.equal(diaBA(hoy), '2026-10-01')
    assert.equal(hoy.toISOString(), '2026-10-01T03:00:00.000Z')
  })
})
