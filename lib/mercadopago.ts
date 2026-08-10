/* Todo lo de Mercado Pago vive acá. Por ahora sólo la llave de luz: el resto
   —crear la preferencia de pago y escuchar el webhook— entra cuando tengamos
   las credenciales de Santiago.

   La seña es una decisión aparte de tener las credenciales cargadas. Si el
   interruptor colgara de MP_ACCESS_TOKEN, el día que Santiago pegue su token
   en Vercel la web empezaría sola a tomar turnos sin confirmar y sin manera
   de pagarlos. Se prende a mano, cuando el circuito de pago esté cerrado. */
export function isDepositEnabled(): boolean {
  return process.env.DEPOSIT_ENABLED === '1'
}
