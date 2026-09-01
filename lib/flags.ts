/* Los dos interruptores que deciden qué cobra la web. Viven acá, juntos y
   fuera de cualquier componente, porque leen variables de entorno: si un
   componente de cliente los llamara, `process.env` sería undefined y la
   respuesta —falso— parecería una decisión y no un accidente. Se leen en el
   servidor y bajan como props.

   Ninguno cuelga de tener las credenciales cargadas. El día que Santiago
   pegue su token en Vercel, o que ajustemos la tabla de zonas, nada tiene que
   encenderse solo: se prende a mano, cuando el circuito está probado. */

/** Con esto en 1 el turno nace sin confirmar y hay que pagar la seña. */
export function isDepositEnabled(): boolean {
  return process.env.DEPOSIT_ENABLED === '1'
}

/** Con esto en 1 se pide el barrio y se cobra el traslado a domicilio. */
export function isViaticoEnabled(): boolean {
  return process.env.VIATICO_ENABLED === '1'
}

/** Con esto en 1 la web no toma reservas: la puerta de entrada es un
    cartel de próximamente. El panel de Santiago sigue funcionando, y
    también las pantallas de un turno ya reservado —quien tenga un link
    en el mail lo puede ver, mover o cancelar—, porque cerrar la puerta
    no es dejar a nadie adentro sin salida. */
export function isComingSoon(): boolean {
  return process.env.COMING_SOON === '1'
}
