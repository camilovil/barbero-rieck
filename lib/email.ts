import nodemailer from 'nodemailer'
import type { BookingState } from '@/types/booking'

function getTransporter() {
  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_APP_PASSWORD,
    },
  })
}

function formatDate(date: Date): string {
  return date.toLocaleDateString('es-AR', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  })
}

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1)
}

// ─── Helpers de tabla (compatible con todos los clientes de email) ────────────

function detailRow(label: string, value: string): string {
  return `
  <tr>
    <td width="38%" style="padding:13px 16px 13px 0;border-bottom:1px solid #2a2a2a;
        font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.09em;
        color:#888;vertical-align:top">
      ${label}
    </td>
    <td style="padding:13px 0 13px 16px;border-bottom:1px solid #2a2a2a;
        font-size:14px;color:#f5f0e8;vertical-align:top;text-align:right">
      ${value}
    </td>
  </tr>`
}

// ─── Email al cliente ────────────────────────────────────────────────────────

function clientHtml(b: BookingState, cancelLink?: string): string {
  const dateStr = b.date ? capitalize(formatDate(b.date)) : '—'
  const modalidad = b.location === 'domicilio'
    ? `A domicilio — ${b.direccion}`
    : 'Estudio de Santiago — <a href="https://maps.app.goo.gl/u8RhmS8WoqdQ61sx5" style="color:#888;text-decoration:underline">Congreso 1865, Belgrano</a>'

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Turno confirmado</title>
</head>
<body style="margin:0;padding:0;background:#111111;font-family:Arial,Helvetica,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#111111">
    <tr><td align="center" style="padding:40px 16px">

      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:520px">

        <!-- Header -->
        <tr><td align="center" style="padding-bottom:32px;border-bottom:1px solid #2a2a2a">
          <img src="https://barbero-rieck.vercel.app/logo.png" alt="Barbería Rieck" width="64" height="64"
            style="border-radius:50%;display:block;margin:0 auto 12px" />
          <p style="margin:0;font-size:20px;font-weight:700;letter-spacing:0.08em;
              color:#f5f0e8;text-transform:uppercase">Santiago Rieck</p>
          <p style="margin:5px 0 0;font-size:11px;color:#666;letter-spacing:0.12em;
              text-transform:uppercase">Barbería</p>
        </td></tr>

        <!-- Greeting -->
        <tr><td style="padding:36px 0 8px">
          <p style="margin:0;font-size:26px;font-weight:700;color:#f5f0e8;line-height:1.2">
            ¡Turno confirmado,<br>${b.nombre}!
          </p>
        </td></tr>
        <tr><td style="padding-bottom:28px">
          <p style="margin:0;font-size:15px;color:#888;line-height:1.5">
            Te esperamos. Santiago te va a contactar por<br>WhatsApp si necesita algo.
          </p>
        </td></tr>

        <!-- Highlight: fecha y hora -->
        <tr><td style="padding-bottom:24px">
          <table width="100%" cellpadding="0" cellspacing="0" border="0">
            <tr>
              <td width="50%" style="padding:20px;background:#1e1e1e;border:1px solid #2e2e2e;
                  border-radius:10px 0 0 10px;text-align:center">
                <p style="margin:0 0 4px;font-size:11px;color:#666;text-transform:uppercase;letter-spacing:0.09em">Fecha</p>
                <p style="margin:0;font-size:16px;font-weight:700;color:#f5f0e8">${dateStr}</p>
              </td>
              <td width="50%" style="padding:20px;background:#1e1e1e;border:1px solid #2e2e2e;
                  border-left:none;border-radius:0 10px 10px 0;text-align:center">
                <p style="margin:0 0 4px;font-size:11px;color:#666;text-transform:uppercase;letter-spacing:0.09em">Horario</p>
                <p style="margin:0;font-size:24px;font-weight:700;color:#f5f0e8">${b.time}</p>
              </td>
            </tr>
          </table>
        </td></tr>

        <!-- Detail card -->
        <tr><td style="background:#1a1a1a;border:1px solid #2a2a2a;border-radius:10px;padding:0 20px">
          <table width="100%" cellpadding="0" cellspacing="0" border="0">
            ${detailRow('Servicio', `${b.service?.name} — ${b.service?.priceLabel ?? '$' + b.service?.price?.toLocaleString('es-AR')}`)}
            ${detailRow('Duración', `${b.service?.duration} min`)}
            ${detailRow('Modalidad', modalidad)}
            ${b.nota ? detailRow('Nota', b.nota) : ''}
          </table>
        </td></tr>

        <!-- ICS hint -->
        <tr><td style="padding:20px 0 0;text-align:center">
          <p style="margin:0;font-size:13px;color:#555">
            📎 Abrí el adjunto para agregar el turno a tu calendario
          </p>
        </td></tr>

        <!-- Cancel link -->
        ${cancelLink ? `
        <tr><td style="padding:16px 0 0;text-align:center">
          <a href="${cancelLink}" style="font-size:12px;color:#555;text-decoration:underline">
            Cancelar turno
          </a>
          <p style="margin:4px 0 0;font-size:11px;color:#333">Disponible hasta 24 hs antes del turno</p>
        </td></tr>` : ''}

        <!-- Spam warning -->
        <tr><td style="padding:16px 0 0;text-align:center">
          <p style="margin:0;font-size:11px;color:#444">
            Si no ves este mail, revisá tu carpeta de spam o correo no deseado.
          </p>
        </td></tr>

        <!-- Footer -->
        <tr><td style="padding:24px 0 0;border-top:1px solid #1e1e1e;margin-top:24px;text-align:center">
          <p style="margin:0;font-size:12px;color:#333">
            ¿Dudas? Escribile a Santiago por WhatsApp.
          </p>
        </td></tr>

      </table>
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
    : 'En el estudio'

  return `<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><title>Nuevo turno</title></head>
<body style="margin:0;padding:0;background:#111111;font-family:Arial,Helvetica,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#111111">
    <tr><td align="center" style="padding:40px 16px">
      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:520px">

        <!-- Header badge -->
        <tr><td style="padding-bottom:24px">
          <table cellpadding="0" cellspacing="0" border="0">
            <tr>
              <td style="background:#1e1e1e;border:1px solid #2e2e2e;border-radius:6px;
                  padding:8px 16px;font-size:13px;font-weight:700;color:#f5f0e8">
                📅 Nuevo turno
              </td>
            </tr>
          </table>
        </td></tr>

        <!-- Date highlight -->
        <tr><td style="padding-bottom:24px">
          <table width="100%" cellpadding="0" cellspacing="0" border="0">
            <tr>
              <td style="padding:20px;background:#1e1e1e;border:1px solid #2e2e2e;border-radius:10px">
                <p style="margin:0 0 4px;font-size:11px;color:#666;text-transform:uppercase;letter-spacing:0.09em">
                  ${dateStr}
                </p>
                <p style="margin:0;font-size:28px;font-weight:700;color:#f5f0e8">${b.time} hs</p>
                <p style="margin:6px 0 0;font-size:14px;color:#888">${b.service?.name} · ${b.service?.duration} min</p>
              </td>
            </tr>
          </table>
        </td></tr>

        <!-- Client detail card -->
        <tr><td style="background:#1a1a1a;border:1px solid #2a2a2a;border-radius:10px;padding:0 20px">
          <table width="100%" cellpadding="0" cellspacing="0" border="0">
            ${detailRow('Cliente', b.nombre)}
            ${detailRow('WhatsApp', b.whatsapp)}
            ${detailRow('Email', b.email)}
            ${detailRow('Servicio', `${b.service?.name} — ${b.service?.priceLabel ?? '$' + b.service?.price?.toLocaleString('es-AR')}`)}
            ${detailRow('Modalidad', modalidad)}
            ${b.nota ? detailRow('Nota', b.nota) : ''}
          </table>
        </td></tr>

        <tr><td style="padding-top:24px;text-align:center">
          <p style="margin:0;font-size:12px;color:#444">Barbería Rieck · Sistema de turnos</p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`
}

// ─── ICS (adjunto de calendario) ─────────────────────────────────────────────

function generateICS(b: BookingState): string {
  const [h, m] = (b.time ?? '00:00').split(':').map(Number)

  const start = new Date(b.date!)
  start.setUTCHours(h + 3, m, 0, 0)
  const end = new Date(start)
  end.setUTCMinutes(end.getUTCMinutes() + (b.service?.duration ?? 60))

  const fmt = (d: Date) => d.toISOString().replace(/[-:.]/g, '').slice(0, 15) + 'Z'
  const uid = `${fmt(start)}-${b.nombre.replace(/\s/g, '')}-barberiarieck`

  const location = b.location === 'domicilio'
    ? b.direccion
    : 'Estudio de Santiago — Congreso 1865, Belgrano'

  const description = [
    `Turno con Santiago Rieck`,
    `Servicio: ${b.service?.name}`,
    b.nota ? `Nota: ${b.nota}` : null,
    `WhatsApp: ${b.whatsapp}`,
  ].filter(Boolean).join('\\n')

  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Barbería Rieck//Turnos//ES',
    'CALSCALE:GREGORIAN',
    'METHOD:REQUEST',
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTART:${fmt(start)}`,
    `DTEND:${fmt(end)}`,
    `SUMMARY:✂️ ${b.service?.name} — Barbería Rieck`,
    `DESCRIPTION:${description}`,
    `LOCATION:${location}`,
    'STATUS:CONFIRMED',
    'SEQUENCE:0',
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n')
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getAppUrl(): string {
  if (process.env.APP_URL) return process.env.APP_URL
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`
  return 'http://localhost:3002'
}

function cancelUrl(eventId: string, email: string): string {
  return `${getAppUrl()}/cancelar?id=${eventId}&email=${encodeURIComponent(email)}`
}

// ─── Exports ─────────────────────────────────────────────────────────────────

export async function sendBookingEmails(booking: BookingState, eventId: string): Promise<void> {
  if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) {
    console.log('[email] stub — GMAIL_USER/GMAIL_APP_PASSWORD not set. Link de cancelación:', cancelUrl(eventId, booking.email))
    return
  }

  const transporter = getTransporter()
  const from = `"Barbería Rieck" <${process.env.GMAIL_USER}>`
  const dateStr = booking.date ? capitalize(formatDate(booking.date)) : '—'
  const icsContent = generateICS(booking)
  const cancelLink = cancelUrl(eventId, booking.email)

  await Promise.all([
    // Confirmación al cliente + adjunto .ics
    transporter.sendMail({
      from,
      to: booking.email,
      subject: `✂️ Turno confirmado — ${dateStr} a las ${booking.time}`,
      html: clientHtml(booking, cancelLink),
      attachments: [{
        filename: 'turno-barberia-rieck.ics',
        content: Buffer.from(icsContent),
        contentType: 'text/calendar',
      }],
    }),
    // Notificación a Santiago
    process.env.SANTIAGO_EMAIL
      ? transporter.sendMail({
          from,
          to: process.env.SANTIAGO_EMAIL,
          subject: `📅 Nuevo turno: ${booking.nombre} — ${dateStr} ${booking.time}`,
          html: santiagoHtml(booking),
        })
      : Promise.resolve(),
  ])
}

export async function sendReminderEmail(
  nombre: string,
  email: string,
  dateStr: string,
  time: string,
  servicio: string,
  location: string,
  whatsapp: string,
): Promise<void> {
  if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) return

  const transporter = getTransporter()
  const from = `"Barbería Rieck" <${process.env.GMAIL_USER}>`
  const modalidad = location === 'domicilio' ? 'A domicilio' : 'Estudio de Santiago — <a href="https://maps.app.goo.gl/u8RhmS8WoqdQ61sx5" style="color:#888;text-decoration:underline">Congreso 1865, Belgrano</a>'
  const waNumber = process.env.SANTIAGO_WHATSAPP ? process.env.SANTIAGO_WHATSAPP.replace(/\D/g,'') : ''

  const html = `<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#111111;font-family:Arial,Helvetica,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#111111">
    <tr><td align="center" style="padding:40px 16px">
      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:520px">

        <tr><td align="center" style="padding-bottom:32px;border-bottom:1px solid #2a2a2a">
          <img src="https://barbero-rieck.vercel.app/logo.png" alt="Barbería Rieck" width="64" height="64"
            style="border-radius:50%;display:block;margin:0 auto 12px" />
          <p style="margin:0;font-size:20px;font-weight:700;letter-spacing:0.08em;color:#f5f0e8;text-transform:uppercase">Santiago Rieck</p>
          <p style="margin:5px 0 0;font-size:11px;color:#666;letter-spacing:0.12em;text-transform:uppercase">Barbería</p>
        </td></tr>

        <tr><td style="padding:36px 0 8px">
          <p style="margin:0;font-size:26px;font-weight:700;color:#f5f0e8;line-height:1.2">
            ⏰ Recordatorio,<br>${nombre}!
          </p>
        </td></tr>
        <tr><td style="padding-bottom:28px">
          <p style="margin:0;font-size:15px;color:#888;line-height:1.5">
            Mañana tenés turno con Santiago.<br>¡Te esperamos!
          </p>
        </td></tr>

        <tr><td style="padding-bottom:24px">
          <table width="100%" cellpadding="0" cellspacing="0" border="0">
            <tr>
              <td width="50%" style="padding:20px;background:#1e1e1e;border:1px solid #2e2e2e;border-radius:10px 0 0 10px;text-align:center">
                <p style="margin:0 0 4px;font-size:11px;color:#666;text-transform:uppercase;letter-spacing:0.09em">Fecha</p>
                <p style="margin:0;font-size:16px;font-weight:700;color:#f5f0e8">${dateStr}</p>
              </td>
              <td width="50%" style="padding:20px;background:#1e1e1e;border:1px solid #2e2e2e;border-left:none;border-radius:0 10px 10px 0;text-align:center">
                <p style="margin:0 0 4px;font-size:11px;color:#666;text-transform:uppercase;letter-spacing:0.09em">Horario</p>
                <p style="margin:0;font-size:24px;font-weight:700;color:#f5f0e8">${time}</p>
              </td>
            </tr>
          </table>
        </td></tr>

        <tr><td style="background:#1a1a1a;border:1px solid #2a2a2a;border-radius:10px;padding:0 20px">
          <table width="100%" cellpadding="0" cellspacing="0" border="0">
            ${detailRow('Servicio', servicio)}
            ${detailRow('Modalidad', modalidad)}
          </table>
        </td></tr>

        ${waNumber ? `
        <tr><td style="padding:24px 0 0;text-align:center">
          <a href="https://wa.me/${waNumber}" style="display:inline-block;padding:12px 28px;background:#25D366;color:#fff;font-size:14px;font-weight:700;text-decoration:none;border-radius:8px">
            💬 Escribir a Santiago
          </a>
        </td></tr>` : ''}

        <tr><td style="padding:16px 0 0;text-align:center">
          <p style="margin:0;font-size:11px;color:#444">
            Si no ves este mail, revisá tu carpeta de spam o correo no deseado.
          </p>
        </td></tr>

        <tr><td style="padding:24px 0 0;border-top:1px solid #1e1e1e;text-align:center">
          <p style="margin:0;font-size:12px;color:#333">¿Dudas? Escribile a Santiago por WhatsApp.</p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`

  await transporter.sendMail({
    from,
    to: email,
    subject: `⏰ Recordatorio: mañana ${time} — Barbería Rieck`,
    html,
  })
}

export async function sendCancellationEmails(
  nombre: string,
  email: string,
  dateStr: string,
  time: string,
  servicio: string,
): Promise<void> {
  if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) {
    console.log('[email] stub — cancelación de', nombre)
    return
  }

  const transporter = getTransporter()
  const from = `"Barbería Rieck" <${process.env.GMAIL_USER}>`

  const clientCancelHtml = `<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#111;font-family:Arial,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;margin:0 auto;padding:40px 20px">
    <tr><td>
      <p style="margin:0 0 10px;font-size:30px">✂️</p>
      <p style="margin:0;font-size:20px;font-weight:700;color:#f5f0e8;text-transform:uppercase;letter-spacing:0.08em">Santiago Rieck</p>
      <p style="margin:4px 0 32px;font-size:11px;color:#555;text-transform:uppercase;letter-spacing:0.1em;padding-bottom:32px;border-bottom:1px solid #222">Barbería</p>
      <h2 style="margin:0 0 8px;font-size:24px;font-weight:700;color:#f5f0e8">Tu turno fue cancelado</h2>
      <p style="margin:0 0 28px;font-size:15px;color:#777">${nombre}, cancelamos tu turno del <strong style="color:#f5f0e8">${dateStr} a las ${time}</strong>.</p>
      <div style="background:#1a1a1a;border:1px solid #2a2a2a;border-radius:10px;padding:20px;margin-bottom:28px">
        <p style="margin:0;font-size:14px;color:#888">Servicio: <span style="color:#f5f0e8">${servicio}</span></p>
      </div>
      <p style="margin:0;font-size:14px;color:#555">Si querés reservar otro turno, entrá a la app.</p>
      <p style="margin:28px 0 0;font-size:12px;color:#333;padding-top:24px;border-top:1px solid #1e1e1e">Barbería Rieck · Sistema de turnos</p>
    </td></tr>
  </table>
</body></html>`

  const santiagoCancelHtml = `<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#111;font-family:Arial,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;margin:0 auto;padding:40px 20px">
    <tr><td>
      <div style="display:inline-block;padding:8px 16px;background:#1e1e1e;border:1px solid #2e2e2e;border-radius:6px;font-size:13px;font-weight:700;color:#f5f0e8;margin-bottom:24px">
        ❌ Turno cancelado
      </div>
      <h2 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#f5f0e8">Un cliente canceló su turno</h2>
      <p style="margin:0 0 24px;font-size:14px;color:#777">El siguiente turno fue cancelado por el cliente.</p>
      <div style="background:#1a1a1a;border:1px solid #2a2a2a;border-radius:10px;padding:20px">
        <table width="100%" cellpadding="0" cellspacing="0">
          ${detailRow('Cliente', nombre)}
          ${detailRow('Email', email)}
          ${detailRow('Fecha', dateStr)}
          ${detailRow('Horario', time)}
          ${detailRow('Servicio', servicio)}
        </table>
      </div>
      <p style="margin:24px 0 0;font-size:12px;color:#333;text-align:center">El horario quedó libre automáticamente.</p>
    </td></tr>
  </table>
</body></html>`

  await Promise.all([
    transporter.sendMail({
      from,
      to: email,
      subject: `Turno cancelado — ${dateStr} a las ${time}`,
      html: clientCancelHtml,
    }),
    process.env.SANTIAGO_EMAIL
      ? transporter.sendMail({
          from,
          to: process.env.SANTIAGO_EMAIL,
          subject: `❌ Turno cancelado: ${nombre} — ${dateStr} ${time}`,
          html: santiagoCancelHtml,
        })
      : Promise.resolve(),
  ])
}
