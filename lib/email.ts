import { Resend } from 'resend'
import type { BookingState } from '@/types/booking'

const resend = new Resend(process.env.RESEND_API_KEY)

function formatDate(date: Date): string {
  return date.toLocaleDateString('es-AR', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  })
}

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1)
}

// ─── Email al cliente ────────────────────────────────────────────────────────

function clientHtml(b: BookingState): string {
  const dateStr = b.date ? capitalize(formatDate(b.date)) : '—'
  const modalidad = b.location === 'domicilio'
    ? `A domicilio — ${b.direccion}`
    : 'Barbería Rieck — Av. Corrientes 1234, CABA'

  return `
<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#1a1a1a;font-family:'DM Sans',Arial,sans-serif;color:#f5f0e8">
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;margin:0 auto;padding:40px 20px">
    <tr><td>
      <!-- Header -->
      <div style="text-align:center;padding-bottom:32px;border-bottom:1px solid #2e2e2e">
        <p style="margin:0 0 8px;font-size:28px">✂️</p>
        <h1 style="margin:0;font-size:22px;font-weight:600;letter-spacing:0.05em;color:#f5f0e8">
          Santiago Rieck
        </h1>
        <p style="margin:4px 0 0;font-size:12px;color:#f5f0e8;opacity:0.4;text-transform:uppercase;letter-spacing:0.1em">
          Barbería
        </p>
      </div>

      <!-- Body -->
      <div style="padding:32px 0">
        <h2 style="margin:0 0 8px;font-size:26px;font-weight:500;color:#f5f0e8">
          ¡Turno confirmado, ${b.nombre}!
        </h2>
        <p style="margin:0 0 28px;font-size:15px;color:#f5f0e8;opacity:0.5">
          Te esperamos. Santiago te va a contactar por WhatsApp si necesita algo.
        </p>

        <!-- Detail card -->
        <div style="background:#222222;border:1px solid #2e2e2e;border-radius:12px;padding:24px">
          ${row('Servicio', `${b.service?.name} — $${b.service?.price?.toLocaleString('es-AR')}`)}
          ${row('Duración', `${b.service?.duration} min`)}
          ${row('Fecha', dateStr)}
          ${row('Horario', b.time ?? '—')}
          ${row('Modalidad', modalidad)}
          ${b.nota ? row('Nota', b.nota) : ''}
        </div>
      </div>

      <!-- Footer -->
      <div style="text-align:center;padding-top:24px;border-top:1px solid #2e2e2e">
        <p style="margin:0;font-size:12px;color:#f5f0e8;opacity:0.25">
          Si necesitás cancelar o reprogramar, escribile a Santiago por WhatsApp.
        </p>
      </div>
    </td></tr>
  </table>
</body>
</html>`
}

// ─── Email a Santiago ────────────────────────────────────────────────────────

function santiagoHtml(b: BookingState): string {
  const dateStr = b.date ? capitalize(formatDate(b.date)) : '—'
  const modalidad = b.location === 'domicilio'
    ? `A domicilio — ${b.direccion}`
    : 'En el local'

  return `
<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#1a1a1a;font-family:Arial,sans-serif;color:#f5f0e8">
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;margin:0 auto;padding:40px 20px">
    <tr><td>
      <h2 style="margin:0 0 4px;font-size:22px;font-weight:600">📅 Nuevo turno</h2>
      <p style="margin:0 0 28px;font-size:14px;color:#f5f0e8;opacity:0.5">
        Se acaba de confirmar un turno en la app.
      </p>
      <div style="background:#222222;border:1px solid #2e2e2e;border-radius:12px;padding:24px">
        ${row('Cliente', b.nombre)}
        ${row('WhatsApp', b.whatsapp)}
        ${row('Email', b.email)}
        ${row('Servicio', `${b.service?.name} — $${b.service?.price?.toLocaleString('es-AR')}`)}
        ${row('Fecha', dateStr)}
        ${row('Horario', b.time ?? '—')}
        ${row('Modalidad', modalidad)}
        ${b.nota ? row('Nota', b.nota) : ''}
      </div>
    </td></tr>
  </table>
</body>
</html>`
}

function row(label: string, value: string): string {
  return `
    <div style="display:flex;justify-content:space-between;align-items:flex-start;
                padding:12px 0;border-bottom:1px solid #2e2e2e">
      <span style="font-size:11px;text-transform:uppercase;letter-spacing:0.1em;color:#f5f0e8;opacity:0.35">
        ${label}
      </span>
      <span style="font-size:14px;color:#f5f0e8;text-align:right;max-width:60%">
        ${value}
      </span>
    </div>`
}

// ─── Exports ─────────────────────────────────────────────────────────────────

export async function sendBookingEmails(booking: BookingState): Promise<void> {
  if (!process.env.RESEND_API_KEY) {
    console.log('[email] stub — RESEND_API_KEY not set. Emails que se enviarían:', {
      to: booking.email,
      cc: process.env.SANTIAGO_EMAIL,
    })
    return
  }

  const from = process.env.RESEND_FROM_EMAIL ?? 'turnos@barberiarieck.com'
  const dateStr = booking.date ? capitalize(formatDate(booking.date)) : '—'

  await Promise.all([
    // Confirmación al cliente
    resend.emails.send({
      from,
      to: booking.email,
      subject: `✂️ Turno confirmado — ${dateStr} a las ${booking.time}`,
      html: clientHtml(booking),
    }),
    // Notificación a Santiago
    process.env.SANTIAGO_EMAIL
      ? resend.emails.send({
          from,
          to: process.env.SANTIAGO_EMAIL,
          subject: `📅 Nuevo turno: ${booking.nombre} — ${dateStr} ${booking.time}`,
          html: santiagoHtml(booking),
        })
      : Promise.resolve(),
  ])
}
