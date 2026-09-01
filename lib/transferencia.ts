import { BARBER_NAME } from './constants'

/* Cómo se paga la seña desde que no está Mercado Pago: una transferencia al
   alias de Santiago y el comprobante por WhatsApp.

   El alias vive en una variable de entorno y no acá adentro, por lo mismo
   que su WhatsApp: es un dato de su cuenta, no del código. El día que
   cambie de banco se cambia en Vercel y no hay que tocar ni desplegar nada
   —salvo el redeploy que Vercel pide para cualquier variable.

   Se leen en el servidor y bajan como props. Un componente de cliente que
   llame a esto recibe strings vacíos, que es exactamente el caso que la
   pantalla trata como «no configurado». */
export type DatosDeTransferencia = {
  alias: string
  titular: string
  /** Sólo dígitos, listo para wa.me. Vacío si no está cargado. */
  whatsapp: string
}

export function datosDeTransferencia(): DatosDeTransferencia {
  return {
    alias: (process.env.SANTIAGO_ALIAS ?? '').trim(),
    titular: (process.env.SANTIAGO_TITULAR ?? BARBER_NAME).trim(),
    whatsapp: (process.env.SANTIAGO_WHATSAPP ?? '').replace(/\D/g, ''),
  }
}

/* El mensaje con el que se le abre el chat a Santiago. Va todo escrito para
   que el cliente sólo tenga que adjuntar la captura: si tiene que redactar
   él quién es y qué turno sacó, la mitad manda «hola» y Santiago termina
   preguntando lo mismo tres veces.

   El nombre y el horario vienen del turno, no de lo que el cliente escriba
   después. */
export function mensajeDeComprobante(opts: {
  nombre: string
  cuando: string
  sena: number
}): string {
  const monto = `$${opts.sena.toLocaleString('es-AR')}`
  return [
    `Hola Santi! Soy ${opts.nombre}.`,
    `Reservé el turno del ${opts.cuando} y te transferí la seña de ${monto}.`,
    'Te paso el comprobante.',
  ].join(' ')
}

/** El link que abre WhatsApp con ese mensaje ya cargado. */
export function linkDeComprobante(datos: DatosDeTransferencia, mensaje: string): string {
  return `https://wa.me/${datos.whatsapp}?text=${encodeURIComponent(mensaje)}`
}
