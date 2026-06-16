import nodemailer from 'nodemailer'
import type { BookingState } from '@/types/booking'
import type { BookingEvent } from '@/lib/googleCalendar'

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
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'America/Argentina/Buenos_Aires',
  })
}

function formatDateShort(date: Date): string {
  return date.toLocaleDateString('es-AR', {
    weekday: 'long', day: 'numeric', month: 'long', timeZone: 'America/Argentina/Buenos_Aires',
  })
}

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1)
}

function bookingCode(eventId: string): string {
  return 'SR-' + eventId.slice(-4).toUpperCase()
}

const JERSEY: Record<string, string> = {
  'Corte': '7',
  'Corte y barba': '10',
}

// ─── Shared: header celeste + brand ──────────────────────────────────────────

function emailHeader(): string {
  return `
  <!-- Header jersey -->
  <tr>
    <td align="center" style="background:#3F86C4;padding:0">
      <table width="100%" cellpadding="0" cellspacing="0" border="0">
        <tr>
          <td align="center" style="
            background:linear-gradient(160deg,#75AADB 0%,#3F86C4 100%);
            padding:18px 22px 20px;
            border-bottom:2px solid #0B1F47;
          ">
            <!-- Stars -->
            <table cellpadding="0" cellspacing="0" border="0" style="margin:0 auto 6px">
              <tr>
                <td style="padding:0 7px;text-align:center">
                  <div style="font-size:15px;color:#F2B63C;line-height:1">&#9733;</div>
                  <div style="font-family:'Anton',Arial,sans-serif;font-size:8px;letter-spacing:1px;color:rgba(255,255,255,.85);margin-top:2px">1978</div>
                </td>
                <td style="padding:0 7px;text-align:center">
                  <div style="font-size:15px;color:#F2B63C;line-height:1">&#9733;</div>
                  <div style="font-family:'Anton',Arial,sans-serif;font-size:8px;letter-spacing:1px;color:rgba(255,255,255,.85);margin-top:2px">1986</div>
                </td>
                <td style="padding:0 7px;text-align:center">
                  <div style="font-size:15px;color:#F2B63C;line-height:1">&#9733;</div>
                  <div style="font-family:'Anton',Arial,sans-serif;font-size:8px;letter-spacing:1px;color:rgba(255,255,255,.85);margin-top:2px">2022</div>
                </td>
              </tr>
            </table>
            <!-- Brand -->
            <p style="margin:0 0 3px;font-family:'Permanent Marker',cursive;font-size:28px;font-weight:400;color:#ffffff;text-shadow:0 2px 0 rgba(11,31,71,.35)">
              Santi <span style="color:#0B1F47">Barber</span>
            </p>
            <p style="margin:0;font-family:'Anton',Arial,sans-serif;font-size:10px;letter-spacing:3px;text-transform:uppercase;color:rgba(255,255,255,.92)">
              Edici&oacute;n Mundial &middot; 2026
            </p>
          </td>
        </tr>
      </table>
    </td>
  </tr>`
}

// ─── Shared: detail row ───────────────────────────────────────────────────────

function detailRowNew(label: string, value: string, sub?: string, last?: boolean): string {
  return `
  <tr>
    <td style="padding:13px 20px;border-bottom:${last ? 'none' : '1px dashed #DDE6F1'}">
      <p style="margin:0 0 2px;font-family:'Barlow',Arial,sans-serif;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.6px;color:#7D8AA3">${label}</p>
      <p style="margin:0;font-family:'Barlow',Arial,sans-serif;font-size:14px;font-weight:700;color:#0B1F47;line-height:1.3">${value}${sub ? `<span style="display:block;font-size:11px;font-weight:600;color:#7D8AA3;margin-top:1px">${sub}</span>` : ''}</p>
    </td>
  </tr>`
}

// Old detailRow kept for Santiago / reminder emails
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

// ─── Email al cliente — CONFIRMACIÓN ─────────────────────────────────────────

function clientHtml(b: BookingState, cancelLink?: string, modLink?: string, eventId?: string): string {
  const dateStr = b.date ? capitalize(formatDateShort(b.date)) : '—'
  const timeStr = b.time ?? '—'
  const jerseyNo = JERSEY[b.service?.name ?? ''] ?? '★'
  const servicioLabel = `${b.service?.name} &middot; N&deg;${jerseyNo}`
  const servicioSub = `${b.service?.duration} min`
  const lugarMain = b.location === 'domicilio' ? 'A domicilio' : 'Barber&iacute;a Rieck'
  const lugarSub = b.location === 'domicilio' ? (b.direccion || '') : 'Congreso 1865, Belgrano, CABA'
  const totalLabel = b.service ? `$${b.service.price.toLocaleString('es-AR')}` : '—'
  const code = eventId ? bookingCode(eventId) : 'SR-2026'
  const manageUrl = modLink ?? 'https://barbero-rieck.vercel.app'

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Turno confirmado</title>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Anton&family=Permanent+Marker&family=Barlow:wght@400;600;700;800;900&display=swap" rel="stylesheet" />
</head>
<body style="margin:0;padding:0;background:#F5F8FC;font-family:'Barlow',Arial,Helvetica,sans-serif">
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#F5F8FC">
<tr><td align="center" style="padding:32px 16px">

  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:520px;background:#ffffff;border-radius:16px;overflow:hidden;border:2px solid #DDE6F1">

    ${emailHeader()}

    <!-- Body -->
    <tr><td style="padding:32px 24px 8px;text-align:center">

      <!-- Trophy circle -->
      <table cellpadding="0" cellspacing="0" border="0" style="margin:0 auto 16px">
        <tr><td align="center" style="width:80px;height:80px;background:#3F86C4;border-radius:50%">
          <div style="font-size:36px;line-height:80px">&#127942;</div>
        </td></tr>
      </table>

      <!-- Title -->
      <p style="margin:0 0 10px;font-family:'Anton',Arial,sans-serif;font-size:24px;font-weight:400;color:#0B1F47">
        &iexcl;Turno confirmado!
      </p>
      <p style="margin:0 0 24px;font-family:'Barlow',Arial,sans-serif;font-size:13px;font-weight:600;color:#7D8AA3;line-height:1.55;max-width:320px;margin-left:auto;margin-right:auto">
        Te esperamos, ${b.nombre}. Guard&aacute; este mail &ndash; Santiago te escribe por WhatsApp para coordinar.
      </p>

    </td></tr>

    <!-- Detail card -->
    <tr><td style="padding:0 24px 24px">
      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="border:2px solid #DDE6F1;border-radius:12px;overflow:hidden">
        ${detailRowNew('Lugar', lugarMain, lugarSub)}
        ${detailRowNew('Servicio', servicioLabel, servicioSub)}
        ${detailRowNew('D&iacute;a y hora', dateStr, `${timeStr} hs`)}
        <!-- Total row -->
        <tr>
          <td style="padding:13px 20px;background:linear-gradient(160deg,#75AADB,#3F86C4)">
            <table width="100%" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td style="font-family:Arial,sans-serif;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.6px;color:rgba(255,255,255,.9)">Total</td>
                <td align="right" style="font-family:Arial,sans-serif;font-size:22px;font-weight:700;color:#ffffff">${totalLabel}</td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </td></tr>

    <!-- CTA: Agregar al calendario -->
    <tr><td style="padding:0 24px 12px;text-align:center">
      <table cellpadding="0" cellspacing="0" border="0" style="margin:0 auto">
        <tr>
          <td align="center" bgcolor="#0B1F47" style="border-radius:30px">
            <a href="${manageUrl}" style="display:inline-block;padding:14px 28px;background:#0B1F47;color:#ffffff;font-family:'Anton',Arial,sans-serif;font-size:13px;font-weight:400;text-decoration:none;letter-spacing:1.5px;text-transform:uppercase;border-radius:30px">
              &#128197; Agregar al calendario
            </a>
          </td>
        </tr>
      </table>
    </td></tr>

    <!-- Gestionar turno link -->
    <tr><td style="padding:0 24px 20px;text-align:center">
      <a href="${manageUrl}" style="font-family:'Barlow',Arial,sans-serif;font-size:13px;font-weight:700;color:#3F86C4;text-decoration:none">
        Ver o gestionar mi turno &rarr;
      </a>
    </td></tr>

    <!-- Note -->
    <tr><td style="padding:0 24px 28px">
      <table width="100%" cellpadding="0" cellspacing="0" border="0">
        <tr>
          <td style="background:#EEF6FD;border-radius:10px;padding:13px 16px">
            <p style="margin:0;font-family:'Barlow',Arial,sans-serif;font-size:11.5px;font-weight:600;color:#7D8AA3;line-height:1.5">
              <span style="color:#D6991C">&#9733;</span>
              Pod&eacute;s cancelar o reprogramar sin costo hasta <strong style="color:#0B1F47">24 hs antes</strong>.
              C&oacute;digo de turno: <strong style="color:#0B1F47">${code}</strong>.
            </p>
          </td>
        </tr>
      </table>
    </td></tr>

    <!-- Footer -->
    <tr><td style="background:#0B1F47;padding:20px 24px;text-align:center">
      <p style="margin:0 0 4px;font-family:'Permanent Marker',cursive;font-size:18px;font-weight:400;color:#ffffff">
        Santi <span style="color:#75AADB">Barber</span>
      </p>
      <p style="margin:3px 0;font-family:Arial,sans-serif;font-size:11px;color:rgba(255,255,255,.55)">
        Congreso 1865, Belgrano, CABA &middot; Lun a S&aacute;b
      </p>
      <p style="margin:0;font-family:Arial,sans-serif;font-size:11px;color:rgba(255,255,255,.55)">
        WhatsApp ${process.env.SANTIAGO_WHATSAPP ?? ''} &middot; @santii_barber07
      </p>
    </td></tr>

  </table>

</td></tr>
</table>
</body>
</html>`
}

// ─── Email al cliente — CANCELACIÓN ──────────────────────────────────────────

function clientCancelHtml(
  nombre: string,
  dateStr: string,
  time: string,
  servicio: string,
  duration: string,
  lugar: string,
  lugarSub: string,
  code: string,
  rebookUrl: string,
  reasonBlock = '',
): string {
  const jerseyNo = JERSEY[servicio] ?? '★'
  const servicioLabel = `${servicio} &middot; N&deg;${jerseyNo}`

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Turno cancelado</title>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Anton&family=Permanent+Marker&family=Barlow:wght@400;600;700;800;900&display=swap" rel="stylesheet" />
</head>
<body style="margin:0;padding:0;background:#F5F8FC;font-family:'Barlow',Arial,Helvetica,sans-serif">
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#F5F8FC">
<tr><td align="center" style="padding:32px 16px">

  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:520px;background:#ffffff;border-radius:16px;overflow:hidden;border:2px solid #DDE6F1">

    ${emailHeader()}

    <!-- Body -->
    <tr><td style="padding:32px 24px 8px;text-align:center">

      <!-- Cancel circle -->
      <table cellpadding="0" cellspacing="0" border="0" style="margin:0 auto 16px">
        <tr><td align="center" style="width:80px;height:80px;background:#DC5B4B;border-radius:50%">
          <div style="font-size:36px;line-height:80px;color:#ffffff">&#10005;</div>
        </td></tr>
      </table>

      <!-- Title -->
      <p style="margin:0 0 10px;font-family:'Anton',Arial,sans-serif;font-size:24px;font-weight:400;color:#0B1F47">
        Turno cancelado
      </p>
      <p style="margin:0 0 24px;font-family:'Barlow',Arial,sans-serif;font-size:13px;font-weight:600;color:#7D8AA3;line-height:1.55;max-width:340px;margin-left:auto;margin-right:auto">
        Liberamos el horario del <strong style="color:#0B1F47">${dateStr} a las ${time} hs</strong>. No se aplic&oacute; ning&uacute;n cargo.
      </p>

    </td></tr>

    <!-- Detail card -->
    <tr><td style="padding:0 24px 24px">
      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="border:2px solid #DDE6F1;border-radius:12px;overflow:hidden">
        ${detailRowNew('Servicio', servicioLabel, duration)}
        ${detailRowNew('Lugar', lugar, lugarSub)}
        ${detailRowNew('C&oacute;digo', code, undefined, true)}
      </table>
    </td></tr>

    ${reasonBlock}

    <!-- CTA: Reservar otro turno -->
    <tr><td style="padding:0 24px 20px;text-align:center">
      <table cellpadding="0" cellspacing="0" border="0" style="margin:0 auto">
        <tr>
          <td align="center" bgcolor="#3F86C4" style="border-radius:30px">
            <a href="${rebookUrl}" style="display:inline-block;padding:14px 28px;background:linear-gradient(160deg,#75AADB,#3F86C4);color:#ffffff;font-family:'Anton',Arial,sans-serif;font-size:13px;font-weight:400;text-decoration:none;letter-spacing:1.5px;text-transform:uppercase;border-radius:30px">
              &#9733; Reservar otro turno
            </a>
          </td>
        </tr>
      </table>
    </td></tr>

    <!-- Note -->
    <tr><td style="padding:0 24px 28px">
      <p style="margin:0;font-family:'Barlow',Arial,sans-serif;font-size:12px;font-weight:600;color:#7D8AA3;text-align:center;line-height:1.5">
        Cuando quieras volv&eacute;s a reservar &mdash; siempre hay lugar para una buena pinta. &iexcl;Vamos Argentina! &#127942;
      </p>
    </td></tr>

    <!-- Footer -->
    <tr><td style="background:#0B1F47;padding:20px 24px;text-align:center">
      <p style="margin:0 0 4px;font-family:'Permanent Marker',cursive;font-size:18px;font-weight:400;color:#ffffff">
        Santi <span style="color:#75AADB">Barber</span>
      </p>
      <p style="margin:3px 0;font-family:Arial,sans-serif;font-size:11px;color:rgba(255,255,255,.55)">
        Congreso 1865, Belgrano, CABA &middot; Lun a S&aacute;b
      </p>
      <p style="margin:0;font-family:Arial,sans-serif;font-size:11px;color:rgba(255,255,255,.55)">
        WhatsApp ${process.env.SANTIAGO_WHATSAPP ?? ''} &middot; @santii_barber07
      </p>
    </td></tr>

  </table>

</td></tr>
</table>
</body>
</html>`
}

// ─── Email a Santiago — NUEVO TURNO ─────────────────────────────────────────

function santiagoHtml(b: BookingState): string {
  const dateStr = b.date ? capitalize(formatDate(b.date)) : '—'
  const modalIcon = b.location === 'domicilio' ? '🏠' : '✂️'
  const modalLabel = b.location === 'domicilio' ? `A domicilio — ${b.direccion || ''}` : 'En el estudio'

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <link href="https://fonts.googleapis.com/css2?family=Anton&family=Permanent+Marker&family=Barlow:wght@400;600;700;800&display=swap" rel="stylesheet">
</head>
<body style="margin:0;padding:0;background:#f0f4f8;font-family:'Barlow',Arial,sans-serif">
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f0f4f8">
<tr><td align="center" style="padding:32px 16px">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:520px;background:#ffffff;border-radius:16px;overflow:hidden;border:2px solid #DDE6F1">

    ${emailHeader()}

    <!-- Titulo -->
    <tr><td style="padding:28px 28px 8px;text-align:center">
      <table cellpadding="0" cellspacing="0" border="0" style="margin:0 auto 14px">
        <tr><td align="center" style="width:72px;height:72px;background:linear-gradient(160deg,#75AADB,#0B1F47);border-radius:50%">
          <div style="font-size:34px;line-height:72px">📅</div>
        </td></tr>
      </table>
      <p style="margin:0 0 6px;font-family:'Anton',Arial,sans-serif;font-size:24px;letter-spacing:.4px;color:#0B1F47">NUEVO TURNO</p>
      <p style="margin:0;font-size:13px;color:#7D8AA3;font-weight:600">
        ${b.nombre} reservó para el <strong style="color:#0B1F47">${dateStr}</strong>
      </p>
    </td></tr>

    <!-- Hora destacada -->
    <tr><td style="padding:20px 28px 8px">
      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:linear-gradient(135deg,#75AADB,#0B1F47);border-radius:14px">
        <tr>
          <td style="padding:20px 24px;text-align:center">
            <p style="margin:0 0 4px;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.15em;color:rgba(255,255,255,.7)">${dateStr}</p>
            <p style="margin:0;font-family:'Anton',Arial,sans-serif;font-size:40px;color:#ffffff;line-height:1">${b.time}</p>
            <p style="margin:6px 0 0;font-size:12px;color:rgba(255,255,255,.75)">${b.service?.name} · ${b.service?.duration} min · ${modalIcon} ${b.location === 'domicilio' ? 'Domicilio' : 'Estudio'}</p>
          </td>
        </tr>
      </table>
    </td></tr>

    <!-- Detalle cliente -->
    <tr><td style="padding:8px 28px 24px">
      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="border:2px solid #DDE6F1;border-radius:12px;overflow:hidden">
        ${detailRowNew('Cliente', b.nombre)}
        ${detailRowNew('WhatsApp', b.whatsapp ? `<a href="https://wa.me/${b.whatsapp.replace(/\D/g,'')}" style="color:#25D366;text-decoration:none">${b.whatsapp} ↗</a>` : '—')}
        ${detailRowNew('Email', b.email)}
        ${detailRowNew('Modalidad', modalLabel)}
        ${b.nota ? detailRowNew('Nota', `"${b.nota}"`, undefined, true) : detailRowNew('Servicio', `${b.service?.name}`, undefined, true)}
      </table>
    </td></tr>

    ${b.location === 'domicilio' && b.direccion ? `
    <tr><td style="padding:0 28px 20px;text-align:center">
      <a href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(b.direccion)}"
        style="display:inline-block;padding:12px 24px;background:#0B1F47;color:#ffffff;font-family:'Anton',Arial,sans-serif;font-size:12px;letter-spacing:1px;text-decoration:none;border-radius:30px;text-transform:uppercase">
        📍 Ver en Google Maps
      </a>
    </td></tr>` : ''}

    <!-- Footer -->
    <tr><td style="background:#0B1F47;padding:18px 28px;text-align:center">
      <p style="margin:0;font-size:11px;color:rgba(255,255,255,.45);letter-spacing:.08em;font-family:Arial,sans-serif">
        SANTI BARBER · <a href="https://barbero-rieck.vercel.app/admin" style="color:#75AADB;text-decoration:none">Ver panel →</a>
      </p>
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

function modificarUrl(eventId: string, email: string): string {
  return `${getAppUrl()}/modificar?id=${eventId}&email=${encodeURIComponent(email)}`
}

// ─── Exports ─────────────────────────────────────────────────────────────────

export async function sendBookingEmails(booking: BookingState, eventId: string): Promise<void> {
  if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) {
    console.log('[email] stub — GMAIL_USER/GMAIL_APP_PASSWORD not set. Link de cancelación:', cancelUrl(eventId, booking.email))
    return
  }

  const transporter = getTransporter()
  const from = `"Santi Barber" <${process.env.GMAIL_USER}>`
  const dateStr = booking.date ? capitalize(formatDate(booking.date)) : '—'
  const icsContent = generateICS(booking)
  const cancelLink = cancelUrl(eventId, booking.email)
  const modLink = modificarUrl(eventId, booking.email)

  await Promise.all([
    transporter.sendMail({
      from,
      to: booking.email,
      subject: `✂️ Turno confirmado — ${dateStr} a las ${booking.time}`,
      html: clientHtml(booking, cancelLink, modLink, eventId),
      attachments: [{
        filename: 'turno-santi-barber.ics',
        content: Buffer.from(icsContent),
        contentType: 'text/calendar',
      }],
    }),
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
  const from = `"Santi Barber" <${process.env.GMAIL_USER}>`
  const jerseyNo = JERSEY[servicio.split(' — ')[0]] ?? '★'
  const lugar = location === 'domicilio'
    ? { main: 'A domicilio', sub: '' }
    : { main: 'Barbería Rieck', sub: 'Belgrano, CABA' }
  const waNumber = process.env.SANTIAGO_WHATSAPP ? process.env.SANTIAGO_WHATSAPP.replace(/\D/g,'') : ''

  const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <link href="https://fonts.googleapis.com/css2?family=Anton&family=Barlow:wght@400;600;700;800&family=Permanent+Marker&display=swap" rel="stylesheet">
</head>
<body style="margin:0;padding:0;background:#F5F8FC;font-family:'Barlow',Arial,sans-serif">
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#F5F8FC">
<tr><td align="center" style="padding:32px 16px">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:520px;background:#ffffff;border-radius:16px;overflow:hidden;border:2px solid #DDE6F1">

    ${emailHeader()}

    <!-- Título -->
    <tr><td style="padding:28px 28px 8px;text-align:center">
      <div style="width:72px;height:72px;margin:0 auto 14px;border-radius:50%;background:linear-gradient(160deg,#75AADB,#0B1F47);display:inline-flex;align-items:center;justify-content:center;font-size:34px;line-height:1">
        ⏰
      </div>
      <p style="margin:0 0 6px;font-family:'Anton',Arial,sans-serif;font-size:26px;letter-spacing:.5px;color:#0B1F47">
        ¡MAÑANA ES TU TURNO!
      </p>
      <p style="margin:0;font-size:14px;color:#555;font-weight:600">
        Hola <strong style="color:#0B1F47">${nombre}</strong>, te recordamos tu turno de mañana con Santiago.
      </p>
    </td></tr>

    <!-- Fecha y hora destacadas -->
    <tr><td style="padding:20px 28px 8px">
      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="border:2px solid #75AADB;border-radius:12px;overflow:hidden">
        <tr>
          <td width="55%" style="padding:18px 16px;background:#f5f9ff;border-right:1px solid #DDE6F1;text-align:center">
            <p style="margin:0 0 4px;font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:.1em;color:#75AADB">Fecha</p>
            <p style="margin:0;font-size:15px;font-weight:800;color:#0B1F47;line-height:1.3">${capitalize(dateStr)}</p>
          </td>
          <td width="45%" style="padding:18px 16px;background:#f5f9ff;text-align:center">
            <p style="margin:0 0 4px;font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:.1em;color:#75AADB">Horario</p>
            <p style="margin:0;font-family:'Anton',Arial,sans-serif;font-size:28px;color:#0B1F47;line-height:1">${time}</p>
          </td>
        </tr>
      </table>
    </td></tr>

    <!-- Detalles -->
    <tr><td style="padding:8px 28px 20px">
      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="border:2px solid #DDE6F1;border-radius:12px;overflow:hidden">
        ${detailRowNew('Servicio', `${servicio.split(' — ')[0]} &middot; N&deg;${jerseyNo}`)}
        ${detailRowNew('Lugar', lugar.main, lugar.sub)}
      </table>
    </td></tr>

    ${waNumber ? `
    <!-- CTA WhatsApp -->
    <tr><td style="padding:0 28px 24px;text-align:center">
      <a href="https://wa.me/${waNumber}" style="display:inline-block;padding:13px 28px;background:#25D366;color:#fff;font-family:'Anton',Arial,sans-serif;font-size:13px;letter-spacing:1px;text-decoration:none;border-radius:30px;text-transform:uppercase">
        💬 Escribir a Santiago
      </a>
    </td></tr>` : ''}

    <!-- Footer -->
    <tr><td style="padding:20px 28px;text-align:center;background:#0B1F47;border-radius:0 0 14px 14px">
      <p style="margin:0 0 4px;font-size:11px;color:rgba(255,255,255,.5)">Si necesitás cancelar o reprogramar, hacelo con al menos 24 hs de anticipación.</p>
      <p style="margin:0;font-size:10px;color:rgba(255,255,255,.3)">Santi Barber · Edición Mundial 2026</p>
    </td></tr>

  </table>
</td></tr>
</table>
</body>
</html>`

  await transporter.sendMail({
    from,
    to: email,
    subject: `⏰ Recordatorio: mañana ${time} — Santi Barber`,
    html,
  })
}

export async function sendCancellationEmails(
  nombre: string,
  email: string,
  dateStr: string,
  time: string,
  servicio: string,
  eventId?: string,
  location?: string,
  direccion?: string,
  duration?: string,
  reason?: string,
): Promise<void> {
  if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) {
    console.log('[email] stub — cancelación de', nombre)
    return
  }

  const transporter = getTransporter()
  const from = `"Santi Barber" <${process.env.GMAIL_USER}>`
  const waNumber = process.env.SANTIAGO_WHATSAPP ?? ''
  const rebookUrl = getAppUrl()
  const code = eventId ? bookingCode(eventId) : 'SR-2026'
  const lugarMain = location === 'domicilio' ? 'A domicilio' : 'Barbería Rieck'
  const lugarSub = location === 'domicilio' ? (direccion || '') : 'Congreso 1865, Belgrano, CABA'

  const reasonBlock = reason
    ? `<tr><td style="padding:0 28px 20px">
        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#fff8f0;border:1.5px solid #fcd5a0;border-radius:10px;padding:14px 16px">
          <tr><td style="font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:.08em;color:#c47a1e;padding-bottom:4px">Motivo</td></tr>
          <tr><td style="font-size:13px;color:#7a4a0a">${reason}</td></tr>
        </table>
      </td></tr>`
    : ''

  const cancelHtmlClient = clientCancelHtml(
    nombre, dateStr, time, servicio,
    duration ? `${duration} min` : '',
    lugarMain, lugarSub, code, rebookUrl,
    reasonBlock,
  )

  const santiagoCancelHtml = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <link href="https://fonts.googleapis.com/css2?family=Anton&family=Barlow:wght@400;600;700;800&display=swap" rel="stylesheet">
</head>
<body style="margin:0;padding:0;background:#f0f4f8;font-family:'Barlow',Arial,sans-serif">
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f0f4f8">
<tr><td align="center" style="padding:32px 16px">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:520px;background:#ffffff;border-radius:16px;overflow:hidden;border:2px solid #DDE6F1">

    ${emailHeader()}

    <tr><td style="padding:28px 28px 8px;text-align:center">
      <table cellpadding="0" cellspacing="0" border="0" style="margin:0 auto 14px">
        <tr><td align="center" style="width:72px;height:72px;background:linear-gradient(160deg,#DC5B4B,#9b1c1c);border-radius:50%">
          <div style="font-size:34px;line-height:72px;color:#fff">✕</div>
        </td></tr>
      </table>
      <p style="margin:0 0 6px;font-family:'Anton',Arial,sans-serif;font-size:24px;letter-spacing:.4px;color:#0B1F47">TURNO CANCELADO</p>
      <p style="margin:0;font-size:13px;color:#7D8AA3;font-weight:600">
        <strong style="color:#0B1F47">${nombre}</strong> canceló su turno. El horario quedó libre.
      </p>
    </td></tr>

    <tr><td style="padding:20px 28px 24px">
      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="border:2px solid #DDE6F1;border-radius:12px;overflow:hidden">
        ${detailRowNew('Fecha', dateStr)}
        ${detailRowNew('Horario', time)}
        ${detailRowNew('Servicio', servicio)}
        ${detailRowNew('Email', email, undefined, !waNumber)}
        ${waNumber ? detailRowNew('WhatsApp', `<a href="https://wa.me/${waNumber.replace(/\D/g,'')}" style="color:#25D366;text-decoration:none">${waNumber} ↗</a>`, undefined, true) : ''}
      </table>
    </td></tr>

    ${reason ? `
    <tr><td style="padding:0 28px 20px">
      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#fff8f0;border:1.5px solid #fcd5a0;border-radius:10px;padding:14px 16px">
        <tr><td style="font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:.08em;color:#c47a1e;padding-bottom:4px">Motivo indicado</td></tr>
        <tr><td style="font-size:13px;color:#7a4a0a">${reason}</td></tr>
      </table>
    </td></tr>` : ''}

    <tr><td style="background:#0B1F47;padding:18px 28px;text-align:center">
      <p style="margin:0;font-size:11px;color:rgba(255,255,255,.45);letter-spacing:.08em;font-family:Arial,sans-serif">
        SANTI BARBER · <a href="https://barbero-rieck.vercel.app/admin" style="color:#75AADB;text-decoration:none">Ver panel →</a>
      </p>
    </td></tr>

  </table>
</td></tr>
</table>
</body>
</html>`

  await Promise.all([
    transporter.sendMail({
      from,
      to: email,
      subject: `Tu turno fue cancelado — ${dateStr} · ${time}`,
      html: cancelHtmlClient,
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

// ─── Reprogramación de turno ─────────────────────────────────────────────────

export async function sendRescheduleEmails(
  nombre: string,
  email: string,
  oldDateStr: string,
  oldTime: string,
  newDateStr: string,
  newTime: string,
  servicio: string,
  newEventId: string,
): Promise<void> {
  if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) return

  const transporter = getTransporter()
  const from = `"Santi Barber" <${process.env.GMAIL_USER}>`
  const code = bookingCode(newEventId)

  const clientHtml = `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<link href="https://fonts.googleapis.com/css2?family=Anton&family=Barlow:wght@400;600;700;800&family=Permanent+Marker&display=swap" rel="stylesheet">
</head>
<body style="margin:0;padding:0;background:#f0f4f8;font-family:'Barlow',Arial,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f0f4f8">
    <tr><td align="center" style="padding:32px 16px">
      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:520px">

        ${emailHeader()}

        <!-- Título -->
        <tr><td style="background:#ffffff;padding:32px 28px 12px;text-align:center">
          <div style="width:64px;height:64px;margin:0 auto 16px;border-radius:50%;background:linear-gradient(160deg,#75AADB,#0B1F47);display:flex;align-items:center;justify-content:center;font-size:32px;line-height:64px;text-align:center">
            🔄
          </div>
          <p style="margin:0;font-family:'Anton',Arial,sans-serif;font-size:26px;letter-spacing:.5px;color:#0B1F47">
            TURNO REPROGRAMADO
          </p>
          <p style="margin:8px 0 0;font-family:'Barlow',Arial,sans-serif;font-size:14px;color:#555;line-height:1.5">
            Hola <strong>${nombre}</strong>, tu turno fue reprogramado por Santiago.
          </p>
        </td></tr>

        <!-- Detalle anterior -->
        <tr><td style="background:#ffffff;padding:8px 28px 4px">
          <p style="margin:0 0 8px;font-family:'Anton',Arial,sans-serif;font-size:11px;letter-spacing:.15em;text-transform:uppercase;color:#999">Turno anterior</p>
          <table width="100%" cellpadding="0" cellspacing="0" border="0" style="border:1.5px solid #e8ecf0;border-radius:10px;overflow:hidden">
            <tr>
              <td style="padding:12px 16px;font-size:13px;font-weight:700;color:#aaa;text-decoration:line-through;border-right:1px solid #e8ecf0;text-align:center">
                ${capitalize(oldDateStr)}
              </td>
              <td style="padding:12px 16px;font-family:'Anton',Arial,sans-serif;font-size:20px;color:#aaa;text-decoration:line-through;text-align:center">
                ${oldTime}
              </td>
            </tr>
          </table>
        </td></tr>

        <!-- Nuevo horario -->
        <tr><td style="background:#ffffff;padding:12px 28px 24px">
          <p style="margin:0 0 8px;font-family:'Anton',Arial,sans-serif;font-size:11px;letter-spacing:.15em;text-transform:uppercase;color:#0B1F47">Nuevo horario ✓</p>
          <table width="100%" cellpadding="0" cellspacing="0" border="0" style="border:2px solid #75AADB;border-radius:10px;overflow:hidden">
            <tr>
              <td style="padding:16px;font-size:14px;font-weight:800;color:#0B1F47;border-right:1px solid #75AADB;text-align:center;background:#f5f9ff">
                ${capitalize(newDateStr)}
              </td>
              <td style="padding:16px;font-family:'Anton',Arial,sans-serif;font-size:26px;color:#0B1F47;text-align:center;background:#f5f9ff">
                ${newTime}
              </td>
            </tr>
          </table>
        </td></tr>

        <!-- Servicio -->
        <tr><td style="background:#ffffff;padding:0 28px 20px">
          <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f8fafc;border:1.5px dashed #c8d8ea;border-radius:10px">
            <tr>
              <td style="padding:14px 16px;font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:.08em;color:#75AADB">Servicio</td>
              <td style="padding:14px 16px;font-size:14px;font-weight:700;color:#0B1F47;text-align:right">${servicio.split(' — ')[0]}</td>
            </tr>
          </table>
        </td></tr>

        <!-- Código -->
        <tr><td style="background:#ffffff;padding:0 28px 28px;text-align:center">
          <p style="margin:0;font-size:11px;color:#aaa">Código de turno: <strong style="font-family:'Anton',Arial,sans-serif;letter-spacing:1px;color:#0B1F47">${code}</strong></p>
          <p style="margin:8px 0 0;font-size:11px;color:#aaa">Podés cancelar o reprogramar hasta 24 hs antes del turno.</p>
        </td></tr>

        <!-- Footer -->
        <tr><td style="padding:20px 28px;text-align:center;background:#0B1F47;border-radius:0 0 16px 16px">
          <p style="margin:0;font-size:11px;color:rgba(255,255,255,.5)">Santi Barber · Edición Mundial 2026</p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`

  const santiagoRescheduleHtml = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <link href="https://fonts.googleapis.com/css2?family=Anton&family=Barlow:wght@400;600;700;800&display=swap" rel="stylesheet">
</head>
<body style="margin:0;padding:0;background:#f0f4f8;font-family:'Barlow',Arial,sans-serif">
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f0f4f8">
<tr><td align="center" style="padding:32px 16px">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:520px;background:#ffffff;border-radius:16px;overflow:hidden;border:2px solid #DDE6F1">

    ${emailHeader()}

    <tr><td style="padding:28px 28px 8px;text-align:center">
      <table cellpadding="0" cellspacing="0" border="0" style="margin:0 auto 14px">
        <tr><td align="center" style="width:72px;height:72px;background:linear-gradient(160deg,#75AADB,#0B1F47);border-radius:50%">
          <div style="font-size:34px;line-height:72px">🔄</div>
        </td></tr>
      </table>
      <p style="margin:0 0 6px;font-family:'Anton',Arial,sans-serif;font-size:24px;letter-spacing:.4px;color:#0B1F47">TURNO REPROGRAMADO</p>
      <p style="margin:0;font-size:13px;color:#7D8AA3;font-weight:600">
        <strong style="color:#0B1F47">${nombre}</strong> · ${servicio.split(' — ')[0]}
      </p>
    </td></tr>

    <tr><td style="padding:20px 28px 8px">
      <p style="margin:0 0 8px;font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:.12em;color:#aaa">Antes</p>
      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="border:1.5px solid #e8ecf0;border-radius:10px;overflow:hidden">
        <tr>
          <td style="padding:12px 16px;font-size:13px;font-weight:700;color:#bbb;text-decoration:line-through;border-right:1px solid #e8ecf0;text-align:center">${capitalize(oldDateStr)}</td>
          <td style="padding:12px 16px;font-family:'Anton',Arial,sans-serif;font-size:20px;color:#bbb;text-decoration:line-through;text-align:center">${oldTime}</td>
        </tr>
      </table>
    </td></tr>

    <tr><td style="padding:12px 28px 24px">
      <p style="margin:0 0 8px;font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:.12em;color:#0B1F47">Nuevo horario ✓</p>
      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="border:2px solid #75AADB;border-radius:10px;overflow:hidden;background:#f5f9ff">
        <tr>
          <td style="padding:16px;font-size:14px;font-weight:800;color:#0B1F47;border-right:1px solid #75AADB;text-align:center">${capitalize(newDateStr)}</td>
          <td style="padding:16px;font-family:'Anton',Arial,sans-serif;font-size:26px;color:#0B1F47;text-align:center">${newTime}</td>
        </tr>
      </table>
    </td></tr>

    <tr><td style="background:#0B1F47;padding:18px 28px;text-align:center">
      <p style="margin:0;font-size:11px;color:rgba(255,255,255,.45);letter-spacing:.08em;font-family:Arial,sans-serif">
        SANTI BARBER · <a href="https://barbero-rieck.vercel.app/admin" style="color:#75AADB;text-decoration:none">Ver panel →</a>
      </p>
    </td></tr>

  </table>
</td></tr>
</table>
</body>
</html>`

  await Promise.all([
    transporter.sendMail({
      from,
      to: email,
      subject: `🔄 Turno reprogramado — ${capitalize(newDateStr)} a las ${newTime}`,
      html: clientHtml,
    }),
    process.env.SANTIAGO_EMAIL
      ? transporter.sendMail({
          from,
          to: process.env.SANTIAGO_EMAIL,
          subject: `🔄 Reprogramado: ${nombre} → ${capitalize(newDateStr)} ${newTime}`,
          html: santiagoRescheduleHtml,
        })
      : Promise.resolve(),
  ])
}

// ─── Resumen diario para Santiago ─────────────────────────────────────────────

export async function sendDailySummaryEmail(events: BookingEvent[], date: Date): Promise<void> {
  if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD || !process.env.SANTIAGO_EMAIL) return

  const transporter = getTransporter()
  const from = `"Santi Barber" <${process.env.GMAIL_USER}>`
  const dateStr = capitalize(date.toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'America/Argentina/Buenos_Aires' }))

  const turnosHtml = events.length === 0
    ? `<tr><td colspan="4" style="padding:24px;text-align:center;font-size:14px;color:#888;font-family:Arial,sans-serif">
        🎉 Sin turnos para hoy — día libre
       </td></tr>`
    : events.map((ev, i) => {
        const time = new Date(ev.start).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Argentina/Buenos_Aires' })
        const waNumber = ev.whatsapp.replace(/https:\/\/wa\.me\//,'').replace(/\D/g,'')
        const isLast = i === events.length - 1
        const modalIcon = ev.modalidad?.toLowerCase().includes('domicilio') ? '🏠' : '✂️'
        return `
        <tr style="${isLast ? '' : 'border-bottom:1px solid #e8f0f8'}">
          <td style="padding:14px 14px;font-size:16px;font-weight:900;color:#0B1F47;white-space:nowrap;font-family:'Arial Black',Arial,sans-serif">${time}</td>
          <td style="padding:14px 8px;font-size:14px;font-weight:700;color:#1a1a2e;font-family:Arial,sans-serif">${ev.nombre}</td>
          <td style="padding:14px 8px;font-size:12px;color:#666;font-family:Arial,sans-serif">${modalIcon} ${ev.servicio.split(' — ')[0]}</td>
          <td style="padding:14px 14px;font-size:12px;font-family:Arial,sans-serif">${waNumber ? `<a href="https://wa.me/${waNumber}" style="color:#25D366;text-decoration:none;font-weight:700">WhatsApp ↗</a>` : '—'}</td>
        </tr>`
      }).join('')

  const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <link href="https://fonts.googleapis.com/css2?family=Anton&display=swap" rel="stylesheet">
</head>
<body style="margin:0;padding:0;background:#f0f4f8;font-family:Arial,Helvetica,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f0f4f8">
    <tr><td align="center" style="padding:32px 16px 40px">
      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;border-radius:18px;overflow:hidden;box-shadow:0 8px 32px rgba(11,31,71,.13)">

        <!-- Header Argentina -->
        ${emailHeader()}

        <!-- Título sección -->
        <tr>
          <td style="background:#ffffff;padding:28px 28px 8px">
            <p style="margin:0;font-family:'Anton',Arial,sans-serif;font-size:22px;letter-spacing:.5px;color:#0B1F47;text-transform:uppercase">
              Agenda del día
            </p>
            <p style="margin:6px 0 0;font-size:13px;color:#888;font-family:Arial,sans-serif">${dateStr}</p>
          </td>
        </tr>

        <!-- Stat grande -->
        <tr>
          <td style="background:#ffffff;padding:16px 28px 24px">
            <table cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td style="background:linear-gradient(135deg,#75AADB,#0B1F47);border-radius:14px;padding:16px 28px;text-align:center">
                  <p style="margin:0;font-family:'Anton',Arial,sans-serif;font-size:36px;color:#ffffff;line-height:1">${events.length}</p>
                  <p style="margin:4px 0 0;font-size:11px;color:rgba(255,255,255,.75);letter-spacing:.15em;text-transform:uppercase;font-family:Arial,sans-serif">
                    ${events.length === 1 ? 'turno hoy' : 'turnos hoy'}
                  </p>
                </td>
                ${events.length > 0 ? `
                <td style="padding-left:16px;vertical-align:middle">
                  <p style="margin:0;font-size:13px;color:#555;font-family:Arial,sans-serif;line-height:1.5">
                    Primer turno: <strong style="color:#0B1F47">${new Date(events[0].start).toLocaleTimeString('es-AR',{hour:'2-digit',minute:'2-digit',timeZone:'America/Argentina/Buenos_Aires'})}</strong><br>
                    Último turno: <strong style="color:#0B1F47">${new Date(events[events.length-1].start).toLocaleTimeString('es-AR',{hour:'2-digit',minute:'2-digit',timeZone:'America/Argentina/Buenos_Aires'})}</strong>
                  </p>
                </td>` : ''}
              </tr>
            </table>
          </td>
        </tr>

        <!-- Tabla de turnos -->
        <tr>
          <td style="background:#ffffff;padding:0 28px 28px">
            <table width="100%" cellpadding="0" cellspacing="0" border="0"
              style="border:2px solid #e8f0f8;border-radius:12px;overflow:hidden">
              <tr style="background:#f5f8fc">
                <td style="padding:10px 14px;font-size:9px;color:#75AADB;text-transform:uppercase;letter-spacing:.12em;font-weight:700;font-family:Arial,sans-serif">Hora</td>
                <td style="padding:10px 8px;font-size:9px;color:#75AADB;text-transform:uppercase;letter-spacing:.12em;font-weight:700;font-family:Arial,sans-serif">Cliente</td>
                <td style="padding:10px 8px;font-size:9px;color:#75AADB;text-transform:uppercase;letter-spacing:.12em;font-weight:700;font-family:Arial,sans-serif">Servicio</td>
                <td style="padding:10px 14px;font-size:9px;color:#75AADB;text-transform:uppercase;letter-spacing:.12em;font-weight:700;font-family:Arial,sans-serif">Contacto</td>
              </tr>
              ${turnosHtml}
            </table>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="background:#0B1F47;padding:18px 28px;text-align:center">
            <p style="margin:0;font-size:11px;color:rgba(255,255,255,.45);letter-spacing:.08em;font-family:Arial,sans-serif">
              SANTI BARBER · PANEL ADMIN · <a href="https://barbero-rieck.vercel.app/admin" style="color:#75AADB;text-decoration:none">Ver panel →</a>
            </p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`

  await transporter.sendMail({
    from,
    to: process.env.SANTIAGO_EMAIL,
    subject: `📋 ${events.length} ${events.length === 1 ? 'turno' : 'turnos'} hoy — ${dateStr}`,
    html,
  })
}
