import type { Location, Service } from '@/types/booking'

/* Cada precio lleva $1.000 arriba del que Santiago cobraba antes de la
   seña: es la comisión de Mercado Pago, absorbida por la casa en vez de
   sumarse aparte en el checkout.

   La comisión se cobra sólo sobre la seña —el resto se paga en el lugar y
   no pasa por Mercado Pago—, y es un porcentaje, así que los mil pesos no
   rinden igual en los tres. A la tasa de acreditación inmediata (~6,29% +
   IVA) la cuenta da: Corte $647 de comisión, Corte y barba $761, y el de
   domicilio $1.560 sobre una seña de $20.500 — o sea que ahí los mil pesos
   se quedan cortos por unos $560. Está así porque el aumento se definió
   como un monto fijo; si el domicilio tiene que cubrirse solo, son $2.000
   y no $1.000. */
export const SERVICES: Record<Location, Service[]> = {
  local: [
    { name: 'Corte', duration: 40, price: 17000 },
    { name: 'Corte y barba', duration: 60, price: 20000 },
  ],
  domicilio: [
    { name: 'Corte (incluye barba)', duration: 120, price: 41000 },
  ],
}

export const TIME_SLOTS: Record<Location, string[]> = {
  local: [
    '11:00', '11:30', '12:00', '12:30', '13:00', '13:30',
    '14:00', '14:30', '15:00', '15:30', '16:00', '16:30',
    '17:00', '17:30', '18:00', '18:30',
  ],
  domicilio: ['08:30', '10:00', '11:30', '13:00', '14:30', '16:00', '17:30', '19:00', '20:00'],
}

export const BLOCKED_SLOTS: string[] = []

/* ─── Viáticos a domicilio ─────────────────────────────────────────
 *
 * Santiago cobra el traslado cuando tiene que salir de los 5 km del
 * estudio. Los kilómetros NO se miden en cada reserva —eso obliga a
 * geocodificar la dirección y a pagarle a Google— sino que el radio ya
 * está resuelto acá: cada barrio quedó de un lado o del otro cuando se
 * armó esta tabla, y el cliente sólo elige de una lista.
 *
 * Cambiar montos o mover un barrio de zona se hace en este arreglo y en
 * ningún otro lado. Santiago confirmó esta tabla —los montos y los cuatro
 * barrios del límite, uno por uno— el 31 de agosto de 2026. */
export const VIATICO_POR_BANDA = 10000

export type Zona = {
  id: string
  nombre: string
  barrios: string[]
  /** Lo que se suma al total. Cero para lo que entra en los 5 km. */
  viatico: number
  /** Fuera de la grilla: el monto lo arregla Santiago, no la web. */
  aConvenir?: boolean
}

/* Cada barrio cayó en su banda midiendo desde el estudio en línea recta y
   agregando un 25%, que es lo que el callejero le suma a esa recta cuando
   uno maneja de verdad. Es una estimación, no un GPS: los cuatro que
   quedaron pegados al límite —Vicente López 4,9 · Villa Pueyrredón 5,0 ·
   Paternal 5,1 · Palermo 5,7— se le mostraron a Santiago uno por uno, con
   lo que cambiaba en cada caso, y los dejó como estaban.

   Mover un barrio de banda es mover un nombre de un arreglo al otro. */
export const ZONAS: Zona[] = [
  {
    id: 'z0',
    nombre: 'Hasta 5 km · sin viático',
    barrios: [
      'Belgrano', 'Coghlan', 'Núñez', 'Colegiales', 'Saavedra',
      'Villa Ortúzar', 'Villa Urquiza', 'Chacarita', 'Parque Chas',
      'Vicente López',
      /* Palermo mide 5,7 km y por la regla caería en la banda siguiente, pero
         va sin viático por decisión de la casa: es de donde más viene la
         gente y no se le cobra el traslado. */
      'Palermo',
    ],
    viatico: 0,
  },
  {
    id: 'z1',
    nombre: 'De 5 a 10 km',
    barrios: [
      'Villa Pueyrredón', 'Paternal', 'Agronomía', 'Villa Crespo',
      'Villa del Parque', 'Olivos', 'Villa Devoto', 'Caballito', 'Almagro',
      'Recoleta',
    ],
    viatico: VIATICO_POR_BANDA,
  },
  {
    id: 'z2',
    nombre: 'De 10 a 15 km',
    barrios: [
      'Floresta', 'Flores', 'Martínez', 'Boedo', 'Microcentro',
      'San Isidro', 'Puerto Madero', 'Liniers', 'San Telmo', 'Mataderos',
    ],
    viatico: VIATICO_POR_BANDA * 2,
  },
  {
    id: 'z3',
    nombre: 'De 15 a 20 km',
    barrios: ['Barracas', 'La Boca', 'Beccar', 'Villa Lugano', 'San Fernando'],
    viatico: VIATICO_POR_BANDA * 3,
  },
  {
    /* Sin esta salida, el que vive en un barrio que no está en la lista no
       puede reservar. Reserva igual: la seña es sobre el servicio, y el
       traslado se arregla aparte. */
    id: 'fuera',
    nombre: 'Más lejos',
    barrios: ['No está mi barrio'],
    viatico: 0,
    aConvenir: true,
  },
]

/** El barrio que eligió el cliente, con lo que cuesta llegar hasta ahí. */
export function zonaDeBarrio(barrio: string | null): Zona | null {
  if (!barrio) return null
  return ZONAS.find(z => z.barrios.includes(barrio)) ?? null
}

export function viaticoDeBarrio(barrio: string | null): number {
  return zonaDeBarrio(barrio)?.viatico ?? 0
}

export const BARBER_NAME = 'Santiago Rieck'
export const BARBER_ADDRESS = 'Congreso 1865, Belgrano, CABA'

/* La voz de la portada. Va acá y no escrita en el componente porque
   son datos de la casa, como la dirección: el día que Santiago se mude
   o abra los domingos, se cambia en un solo lugar.

   El sistema de diseño trae estas líneas ambientadas en Rosario
   —«ROSARIO · UN SILLÓN», «CENTRO · PICHINCHA · MAR – SÁB»—, que son
   el ejemplo del diseñador y no la casa: el estudio está en Belgrano y
   abre de lunes a sábado. Las versalitas las pone el CSS. */
export const CASA_LEMA = 'Belgrano · un sillón'
export const CASA_KICKER = 'Belgrano · un sillón · turnos de a uno'
export const CASA_META = ['Belgrano', 'CABA', 'Lun – Sáb']

export const INSTAGRAM_HANDLE = '@santii_barber07'
export const INSTAGRAM_URL = 'https://www.instagram.com/santii_barber07'

/* Cómo se nombra cada modalidad en TODA la app: interfaz, mails,
   WhatsApp y la descripción del evento de calendario. Antes cada
   archivo inventaba la suya — "Estudio", "En el local", "En local",
   "Barbería Rieck" — y no coincidían entre sí. */
export const LOCATION_LABELS: Record<Location, string> = {
  local: 'Studio Höhle',
  domicilio: 'A domicilio',
}

// Horas mínimas de anticipación para poder cancelar
export const CANCELLATION_MIN_HOURS = 24

/* Seña: la mitad del servicio, y el rato que le guardamos el horario a quien
   todavía no la pagó. Pasado ese rato el turno se cae y el horario vuelve a
   estar libre — si no, cualquiera que abandone la pantalla de pago se queda
   con el turno para siempre. */
export const DEPOSIT_PERCENT = 50
export const DEPOSIT_HOLD_MINUTES = 20

export function depositAmount(price: number): number {
  return Math.round((price * DEPOSIT_PERCENT) / 100)
}
