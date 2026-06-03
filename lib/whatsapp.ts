import type { BookingState } from '@/types/booking'

function formatDate(date: Date): string {
  return date.toLocaleDateString('es-AR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })
}

export async function sendBookingNotification(booking: BookingState): Promise<void> {
  if (!process.env.TWILIO_ACCOUNT_SID) {
    // TODO: configure Twilio env vars to enable real WhatsApp messages
    console.log('[whatsapp] stub notification:', {
      to: process.env.SANTIAGO_WHATSAPP,
      message: buildMessage(booking),
    })
    return
  }

  // TODO: uncomment and install twilio package when ready
  // const twilio = require('twilio')(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN)
  // await twilio.messages.create({
  //   from: `whatsapp:${process.env.TWILIO_WHATSAPP_FROM}`,
  //   to: `whatsapp:${process.env.SANTIAGO_WHATSAPP}`,
  //   body: buildMessage(booking),
  // })
}

function buildMessage(booking: BookingState): string {
  const dateStr = booking.date ? formatDate(booking.date) : '—'
  const lines = [
    `📅 *Nuevo turno confirmado*`,
    `Cliente: ${booking.nombre}`,
    `WhatsApp: ${booking.whatsapp}`,
    `Servicio: ${booking.service?.name} ($${booking.service?.price})`,
    `Fecha: ${dateStr} a las ${booking.time}`,
    `Modalidad: ${booking.location === 'domicilio' ? `A domicilio — ${booking.direccion}` : 'En local'}`,
    booking.nota ? `Nota: ${booking.nota}` : null,
  ]
  return lines.filter(Boolean).join('\n')
}
