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

export async function sendRescheduleNotification(
  nombre: string,
  oldDateStr: string,
  oldTime: string,
  newDateStr: string,
  newTime: string,
  servicio: string,
): Promise<void> {
  const message = [
    `🔄 *Turno reprogramado*`,
    `Cliente: ${nombre}`,
    `Servicio: ${servicio.split(' — ')[0]}`,
    `Antes: ${oldDateStr} a las ${oldTime}`,
    `Ahora: ${newDateStr} a las ${newTime}`,
  ].join('\n')

  if (!process.env.TWILIO_ACCOUNT_SID) {
    console.log('[whatsapp] stub reschedule notification:', message)
    return
  }
  // TODO: activar cuando Twilio esté configurado
  // const twilio = require('twilio')(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN)
  // await twilio.messages.create({
  //   from: `whatsapp:${process.env.TWILIO_WHATSAPP_FROM}`,
  //   to: `whatsapp:${process.env.SANTIAGO_WHATSAPP}`,
  //   body: message,
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
