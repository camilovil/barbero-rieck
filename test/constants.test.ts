import { test, describe } from 'node:test'
import assert from 'node:assert/strict'
import {
  SERVICES,
  TIME_SLOTS,
  ZONAS,
  DEPOSIT_PERCENT,
  depositAmount,
  zonaDeBarrio,
  viaticoDeBarrio,
} from '../lib/constants.ts'

/* Acá vive la plata. Todo lo que se prueba en este archivo decide cuánto
   se le cobra a alguien, así que se prueba solo — sin navegador, sin
   credenciales y sin tocar el calendario.
   `lib/constants.ts` sólo importa tipos, y Node los borra al ejecutar, así
   que corre sin ninguna dependencia. */

describe('la seña', () => {
  test('es la mitad del servicio', () => {
    assert.equal(DEPOSIT_PERCENT, 50)
    assert.equal(depositAmount(16000), 8000)
    assert.equal(depositAmount(19000), 9500)
    assert.equal(depositAmount(40000), 20000)
  })

  test('redondea al peso, no deja centavos', () => {
    assert.equal(depositAmount(15001), 7501)
    assert.equal(depositAmount(15003), 7502)
    assert.ok(Number.isInteger(depositAmount(12345)))
  })

  test('sin precio no hay seña', () => {
    assert.equal(depositAmount(0), 0)
  })

  test('nunca supera al servicio', () => {
    for (const lista of Object.values(SERVICES)) {
      for (const s of lista) {
        assert.ok(
          depositAmount(s.price) < s.price,
          `la seña de "${s.name}" no puede ser igual o mayor al servicio`,
        )
      }
    }
  })
})

describe('los viáticos por zona', () => {
  test('un barrio de la banda cero no paga traslado', () => {
    assert.equal(viaticoDeBarrio('Belgrano'), 0)
    assert.equal(viaticoDeBarrio('Núñez'), 0)
  })

  test('Palermo va sin viático aunque mida más de 5 km', () => {
    // Decisión de la casa, no de la tabla de distancias.
    assert.equal(viaticoDeBarrio('Palermo'), 0)
    assert.equal(zonaDeBarrio('Palermo')?.id, 'z0')
  })

  test('cada banda cobra más que la anterior', () => {
    const cobrables = ZONAS.filter(z => !z.aConvenir)
    for (let i = 1; i < cobrables.length; i++) {
      assert.ok(
        cobrables[i].viatico > cobrables[i - 1].viatico,
        `la banda "${cobrables[i].nombre}" no cobra más que la anterior`,
      )
    }
  })

  test('un barrio que no está en la tabla no inventa un precio', () => {
    assert.equal(viaticoDeBarrio('Ushuaia'), 0)
    assert.equal(zonaDeBarrio('Ushuaia'), null)
  })

  test('sin barrio no hay viático', () => {
    assert.equal(viaticoDeBarrio(null), 0)
    assert.equal(zonaDeBarrio(null), null)
  })

  test('ningún barrio está en dos bandas a la vez', () => {
    // Si estuviera, el precio dependería del orden del arreglo.
    const vistos = new Map<string, string>()
    for (const z of ZONAS) {
      for (const b of z.barrios) {
        const antes = vistos.get(b)
        assert.equal(antes, undefined, `"${b}" está en "${antes}" y también en "${z.nombre}"`)
        vistos.set(b, z.nombre)
      }
    }
  })

  test('ninguna banda quedó vacía', () => {
    for (const z of ZONAS) {
      if (z.aConvenir) continue
      assert.ok(z.barrios.length > 0, `la banda "${z.nombre}" no tiene barrios`)
    }
  })
})

describe('el catálogo', () => {
  test('todo servicio tiene precio y duración usables', () => {
    for (const [donde, lista] of Object.entries(SERVICES)) {
      assert.ok(lista.length > 0, `no hay servicios para "${donde}"`)
      for (const s of lista) {
        assert.ok(s.price > 0, `"${s.name}" no tiene precio`)
        assert.ok(s.duration > 0, `"${s.name}" no tiene duración`)
        assert.ok(s.name.trim().length > 0, 'hay un servicio sin nombre')
      }
    }
  })

  test('no hay dos servicios con el mismo nombre en la misma modalidad', () => {
    /* /api/booking busca el servicio por nombre dentro de la modalidad para
       no creerle el precio al cliente. Si hubiera dos con el mismo nombre,
       `find` se quedaría con el primero y el precio dependería del orden. */
    for (const [donde, lista] of Object.entries(SERVICES)) {
      const nombres = lista.map(s => s.name)
      assert.equal(new Set(nombres).size, nombres.length, `nombres repetidos en "${donde}"`)
    }
  })

  test('los horarios están ordenados y no se repiten', () => {
    for (const [donde, slots] of Object.entries(TIME_SLOTS)) {
      assert.ok(slots.length > 0, `no hay horarios para "${donde}"`)
      assert.equal(new Set(slots).size, slots.length, `horarios repetidos en "${donde}"`)
      const ordenados = [...slots].sort()
      assert.deepEqual(slots, ordenados, `los horarios de "${donde}" no están en orden`)
    }
  })

  test('todo horario tiene forma HH:MM válida', () => {
    for (const slots of Object.values(TIME_SLOTS)) {
      for (const s of slots) {
        assert.match(s, /^([01]\d|2[0-3]):[0-5]\d$/, `"${s}" no es una hora válida`)
      }
    }
  })
})
