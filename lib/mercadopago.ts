import {
  MercadoPagoConfig,
  Preference,
  Payment,
  WebhookSignatureValidator,
  InvalidWebhookSignatureError,
} from 'mercadopago'
import { DEPOSIT_HOLD_MINUTES, LOCATION_LABELS } from './constants'
import type { BookingState } from '@/types/booking'

export { InvalidWebhookSignatureError }

/* La seña es una decisión aparte de tener las credenciales cargadas. Si el
   interruptor colgara de MP_ACCESS_TOKEN, el día que Santiago pegue su token
   en Vercel la web empezaría sola a tomar turnos sin confirmar. Se prende a
   mano, cuando el circuito de pago está cerrado de punta a punta. */
export function isDepositEnabled(): boolean {
  return process.env.DEPOSIT_ENABLED === '1'
}

function getClient(): MercadoPagoConfig {
  const accessToken = process.env.MP_ACCESS_TOKEN
  if (!accessToken) throw new Error('MP_ACCESS_TOKEN no configurado')
  return new MercadoPagoConfig({ accessToken, options: { timeout: 8000 } })
}

/**
 * Arma el pago de la seña y devuelve el link al checkout de Mercado Pago.
 * `baseUrl` tiene que ser público: Mercado Pago necesita poder volver al
 * sitio y avisarnos por webhook, y a localhost no llega.
 */
export async function createDepositPreference(args: {
  booking: BookingState
  eventId: string
  amount: number
  baseUrl: string
}): Promise<string> {
  const { booking, eventId, amount, baseUrl } = args
  const desde = new Date()
  const hasta = new Date(desde.getTime() + DEPOSIT_HOLD_MINUTES * 60 * 1000)

  /* Mercado Pago no acepta que lo devolvamos solo a una dirección que no puede
     alcanzar, y localhost no lo es: pedir `auto_return` desde la máquina de
     desarrollo hace fallar la preferencia entera. Sin él el pago funciona
     igual, sólo que el cliente vuelve tocando «Volver al sitio». */
  const local = /^https?:\/\/(localhost|127\.0\.0\.1|\[::1\])(:|$)/.test(baseUrl)

  /* Mercado Pago pide nombre y apellido por separado: son datos que su motor
     antifraude usa para rechazar menos pagos buenos. Nosotros pedimos un solo
     campo, así que lo partimos por el primer espacio. */
  const partes = booking.nombre.trim().split(/\s+/)
  const nombre = partes[0] ?? ''
  const apellido = partes.slice(1).join(' ')
  const telefono = booking.whatsapp.replace(/\D/g, '')

  const preference = new Preference(getClient())
  const res = await preference.create({
    body: {
      items: [
        {
          id: eventId,
          title: `Seña — ${booking.service?.name ?? 'Turno'}`,
          description: `${LOCATION_LABELS[booking.location ?? 'local']} · ${booking.time ?? ''}`,
          category_id: 'services',
          quantity: 1,
          currency_id: 'ARS',
          unit_price: amount,
        },
      ],
      payer: {
        name: nombre,
        surname: apellido,
        email: booking.email,
        ...(telefono && { phone: { number: telefono } }),
      },
      /* El id del evento del calendario es lo único que ata este pago a un
         turno: vuelve en la notificación y es lo que confirmamos. Sin base de
         datos, es toda la trazabilidad que tenemos. */
      external_reference: eventId,
      back_urls: {
        success: `${baseUrl}/pago?turno=${eventId}`,
        pending: `${baseUrl}/pago?turno=${eventId}`,
        failure: `${baseUrl}/pago?turno=${eventId}&estado=rechazado`,
      },
      ...(local ? {} : { auto_return: 'approved' }),
      notification_url: `${baseUrl}/api/pagos/webhook`,
      statement_descriptor: 'BARBER HOHLE',
      /* O aprobado o rechazado, nunca «en revisión». Un pago pendiente se
         resuelve a los días, y para entonces el turno hace rato que se venció
         y el horario se lo llevó otro: cobraríamos una seña sin turno que la
         respalde. Preferimos que ese pago se rechace y el cliente reintente. */
      binary_mode: true,
      /* Efectivo y débito automático acreditan a los días, y para entonces el
         turno hace rato que se venció y el horario se lo llevó otro. Sólo
         medios que entran en el momento. */
      payment_methods: {
        excluded_payment_types: [{ id: 'ticket' }, { id: 'atm' }],
        installments: 1,
      },
      // El link de pago muere junto con la reserva del horario.
      expires: true,
      expiration_date_from: desde.toISOString(),
      expiration_date_to: hasta.toISOString(),
    },
  })

  if (!res.init_point) throw new Error('Mercado Pago no devolvió init_point')
  return res.init_point
}

export type PagoInfo = {
  status: string
  eventId: string | null
  amount: number | null
}

/** El estado del pago según Mercado Pago, que es el único que vale. */
export async function getPago(paymentId: string): Promise<PagoInfo> {
  const res = await new Payment(getClient()).get({ id: paymentId })
  return {
    status: res.status ?? 'unknown',
    eventId: res.external_reference ?? null,
    amount: res.transaction_amount ?? null,
  }
}

/**
 * Confirma que la notificación la mandó Mercado Pago y no cualquiera que
 * adivinó la URL. Tira `InvalidWebhookSignatureError` si no cierra.
 */
export function assertWebhookValido(args: {
  xSignature: string | null
  xRequestId: string | null
  dataId: string | null
}): void {
  const secret = process.env.MP_WEBHOOK_SECRET
  /* Sin clave configurada no rechazamos la notificación: la firma es una capa
     de más, no la que decide. Lo que confirma un turno es preguntarle a
     Mercado Pago por ese pago con nuestro token y ver que esté aprobado y que
     apunte a un turno nuestro esperando — el cuerpo del aviso no se usa para
     nada. Igual conviene configurarla: evita que nos hagan gastar consultas. */
  if (!secret) {
    console.warn('[mercadopago] sin MP_WEBHOOK_SECRET — no se verifica la firma')
    return
  }
  WebhookSignatureValidator.validate({
    xSignature: args.xSignature,
    xRequestId: args.xRequestId,
    dataId: args.dataId,
    secret,
    // Margen contra reenvíos viejos de una notificación ya usada.
    toleranceSeconds: 300,
  })
}
