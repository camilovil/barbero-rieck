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
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  })
}

function formatDateShort(date: Date): string {
  return date.toLocaleDateString('es-AR', {
    weekday: 'long', day: 'numeric', month: 'long',
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
  const lugarSub = b.location === 'domicilio' ? (b.direccion || '') : 'Av. Corrientes 1234, CABA'
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
      <p style="margin:0 0 24px;font-family:Arial,sans-serif;font-size:13px;color:#7D8AA3;line-height:1.55;max-width:320px;margin-left:auto;margin-right:auto">
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
      <a href="${manageUrl}" style="font-family:Arial,sans-serif;font-size:13px;font-weight:700;color:#3F86C4;text-decoration:none">
        Ver o gestionar mi turno &rarr;
      </a>
    </td></tr>

    <!-- Note -->
    <tr><td style="padding:0 24px 28px">
      <table width="100%" cellpadding="0" cellspacing="0" border="0">
        <tr>
          <td style="background:#EEF6FD;border-radius:10px;padding:13px 16px">
            <p style="margin:0;font-family:Arial,sans-serif;font-size:11.5px;color:#7D8AA3;line-height:1.5">
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
        Av. Corrientes 1234, CABA &middot; Lun a S&aacute;b
      </p>
      <p style="margin:0;font-family:Arial,sans-serif;font-size:11px;color:rgba(255,255,255,.55)">
        WhatsApp +54 9 11 5555 1234 &middot; @santibarber
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
      <p style="margin:0 0 24px;font-family:Arial,sans-serif;font-size:13px;color:#7D8AA3;line-height:1.55;max-width:340px;margin-left:auto;margin-right:auto">
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
      <p style="margin:0;font-family:Arial,sans-serif;font-size:12px;color:#7D8AA3;text-align:center;line-height:1.5">
        Cuando quieras volv&eacute;s a reservar &mdash; siempre hay lugar para una buena pinta. &iexcl;Vamos Argentina! &#127942;
      </p>
    </td></tr>

    <!-- Footer -->
    <tr><td style="background:#0B1F47;padding:20px 24px;text-align:center">
      <p style="margin:0 0 4px;font-family:'Permanent Marker',cursive;font-size:18px;font-weight:400;color:#ffffff">
        Santi <span style="color:#75AADB">Barber</span>
      </p>
      <p style="margin:3px 0;font-family:Arial,sans-serif;font-size:11px;color:rgba(255,255,255,.55)">
        Av. Corrientes 1234, CABA &middot; Lun a S&aacute;b
      </p>
      <p style="margin:0;font-family:Arial,sans-serif;font-size:11px;color:rgba(255,255,255,.55)">
        WhatsApp +54 9 11 5555 1234 &middot; @santibarber
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
            ${b.location === 'domicilio' && b.direccion ? detailRow('Dirección', b.direccion) : ''}
            ${b.nota ? detailRow('Nota', b.nota) : ''}
          </table>
        </td></tr>

        ${b.location === 'domicilio' && b.direccion ? `
        <tr><td style="padding:20px 0 0;text-align:center">
          <a href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(b.direccion)}"
            style="display:inline-block;padding:11px 24px;background:#1e1e1e;border:1px solid #2e2e2e;color:#f5f0e8;font-size:13px;font-weight:600;text-decoration:none;border-radius:8px">
            📍 Ver en Google Maps
          </a>
        </td></tr>` : ''}

        <!-- Links para compartir -->
        <tr><td style="padding:20px 0 0">
          <p style="margin:0 0 10px;font-size:11px;color:#555;text-transform:uppercase;letter-spacing:0.08em">Links para compartir</p>
          <table cellpadding="0" cellspacing="0" border="0" style="width:100%">
            <tr>
              <td style="padding:2px 4px 2px 0">
                <a href="https://barbero-rieck.vercel.app?modalidad=local&servicio=corte"
                  style="display:block;padding:8px 10px;background:#1e1e1e;border:1px solid #2e2e2e;border-radius:6px;font-size:11px;color:#888;text-decoration:none;text-align:center">
                  ✂️ Corte — local
                </a>
              </td>
              <td style="padding:2px 4px 2px 0">
                <a href="https://barbero-rieck.vercel.app?modalidad=local&servicio=corte-barba"
                  style="display:block;padding:8px 10px;background:#1e1e1e;border:1px solid #2e2e2e;border-radius:6px;font-size:11px;color:#888;text-decoration:none;text-align:center">
                  ✂️ Corte+barba — local
                </a>
              </td>
            </tr>
            <tr>
              <td style="padding:2px 4px 2px 0">
                <a href="https://barbero-rieck.vercel.app?modalidad=domicilio&servicio=corte"
                  style="display:block;padding:8px 10px;background:#1e1e1e;border:1px solid #2e2e2e;border-radius:6px;font-size:11px;color:#888;text-decoration:none;text-align:center">
                  🏠 Corte — domicilio
                </a>
              </td>
              <td style="padding:2px 4px 2px 0">
                <a href="https://barbero-rieck.vercel.app?modalidad=domicilio&servicio=corte-barba"
                  style="display:block;padding:8px 10px;background:#1e1e1e;border:1px solid #2e2e2e;border-radius:6px;font-size:11px;color:#888;text-decoration:none;text-align:center">
                  🏠 Corte+barba — domicilio
                </a>
              </td>
            </tr>
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
          <img src="https://barbero-rieck.vercel.app/logo.png" alt="Santi Barber" width="64" height="64"
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
  const lugarSub = location === 'domicilio' ? (direccion || '') : 'CABA'

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
      ${waNumber ? `
      <p style="margin:20px 0 0;text-align:center">
        <a href="https://wa.me/${waNumber.replace(/\D/g,'')}" style="display:inline-block;padding:11px 24px;background:#25D366;color:#fff;font-size:13px;font-weight:700;text-decoration:none;border-radius:8px">
          💬 Contactar al cliente
        </a>
      </p>` : ''}
      <p style="margin:24px 0 0;font-size:12px;color:#333;text-align:center">El horario quedó libre automáticamente.</p>
    </td></tr>
  </table>
</body></html>`

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

  const santiagoHtml = `<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#111;font-family:Arial,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#111">
    <tr><td align="center" style="padding:32px 16px">
      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:480px">
        <tr><td style="background:#1e1e1e;border:1px solid #2a2a2a;border-radius:12px;padding:24px">
          <p style="margin:0 0 4px;font-size:18px;font-weight:700;color:#f5f0e8">🔄 Turno reprogramado</p>
          <p style="margin:0 0 20px;font-size:13px;color:#888">${nombre} · ${servicio.split(' — ')[0]}</p>
          <p style="margin:0 0 6px;font-size:12px;color:#666;text-transform:uppercase;letter-spacing:.08em">Antes</p>
          <p style="margin:0 0 16px;font-size:15px;color:#888;text-decoration:line-through">${capitalize(oldDateStr)} — ${oldTime}</p>
          <p style="margin:0 0 6px;font-size:12px;color:#75AADB;text-transform:uppercase;letter-spacing:.08em">Ahora</p>
          <p style="margin:0;font-size:18px;font-weight:700;color:#f5f0e8">${capitalize(newDateStr)} — ${newTime}</p>
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
          html: santiagoHtml,
        })
      : Promise.resolve(),
  ])
}

// ─── Resumen diario para Santiago ─────────────────────────────────────────────

export async function sendDailySummaryEmail(events: BookingEvent[], date: Date): Promise<void> {
  if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD || !process.env.SANTIAGO_EMAIL) return

  const transporter = getTransporter()
  const from = `"Santi Barber" <${process.env.GMAIL_USER}>`
  const dateStr = capitalize(date.toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }))

  const turnosHtml = events.length === 0
    ? `<tr><td colspan="4" style="padding:20px;text-align:center;font-size:14px;color:#555">No hay turnos para hoy 🎉</td></tr>`
    : events.map(ev => {
        const time = new Date(ev.start).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })
        const waNumber = ev.whatsapp.replace(/https:\/\/wa\.me\//,'').replace(/\D/g,'')
        return `
        <tr style="border-bottom:1px solid #2a2a2a">
          <td style="padding:14px 12px;font-size:15px;font-weight:700;color:#f5f0e8;white-space:nowrap">${time}</td>
          <td style="padding:14px 12px;font-size:14px;color:#f5f0e8">${ev.nombre}</td>
          <td style="padding:14px 12px;font-size:13px;color:#888">${ev.servicio.split(' — ')[0]}</td>
          <td style="padding:14px 12px;font-size:13px;color:#888">${waNumber ? `<a href="https://wa.me/${waNumber}" style="color:#25D366;text-decoration:none">WhatsApp</a>` : '—'}</td>
        </tr>`
      }).join('')

  const html = `<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#111111;font-family:Arial,Helvetica,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#111111">
    <tr><td align="center" style="padding:40px 16px">
      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px">

        <tr><td align="center" style="padding-bottom:32px;border-bottom:1px solid #2a2a2a">
          <img src="https://barbero-rieck.vercel.app/logo.png" alt="Santi Barber" width="64" height="64"
            style="border-radius:50%;display:block;margin:0 auto 12px" />
          <p style="margin:0;font-size:20px;font-weight:700;letter-spacing:0.08em;color:#f5f0e8;text-transform:uppercase">Santiago Rieck</p>
          <p style="margin:5px 0 0;font-size:11px;color:#666;letter-spacing:0.12em;text-transform:uppercase">Barbería</p>
        </td></tr>

        <tr><td style="padding:32px 0 8px">
          <p style="margin:0;font-size:24px;font-weight:700;color:#f5f0e8">📋 Turnos de hoy</p>
          <p style="margin:6px 0 0;font-size:14px;color:#666">${dateStr}</p>
        </td></tr>

        <tr><td style="padding:20px 0">
          <div style="background:#1e1e1e;border:1px solid #2a2a2a;border-radius:10px;overflow:hidden;display:inline-block;width:100%">
            <table width="100%" cellpadding="0" cellspacing="0" border="0">
              <tr style="background:#1a1a1a;border-bottom:1px solid #2e2e2e">
                <td style="padding:10px 12px;font-size:10px;color:#555;text-transform:uppercase;letter-spacing:0.1em">Hora</td>
                <td style="padding:10px 12px;font-size:10px;color:#555;text-transform:uppercase;letter-spacing:0.1em">Cliente</td>
                <td style="padding:10px 12px;font-size:10px;color:#555;text-transform:uppercase;letter-spacing:0.1em">Servicio</td>
                <td style="padding:10px 12px;font-size:10px;color:#555;text-transform:uppercase;letter-spacing:0.1em">Contacto</td>
              </tr>
              ${turnosHtml}
            </table>
          </div>
        </td></tr>

        <tr><td style="padding:0 0 8px;text-align:center">
          <p style="margin:0;font-size:24px;font-weight:700;color:#f5f0e8">${events.length}</p>
          <p style="margin:4px 0 0;font-size:12px;color:#555">${events.length === 1 ? 'turno hoy' : 'turnos hoy'}</p>
        </td></tr>

        <tr><td style="padding:24px 0 0;border-top:1px solid #1e1e1e;text-align:center">
          <p style="margin:0;font-size:12px;color:#333">Santi Barber · Sistema de turnos</p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`

  await transporter.sendMail({
    from,
    to: process.env.SANTIAGO_EMAIL,
    subject: `📋 Turnos de hoy — ${dateStr} (${events.length} ${events.length === 1 ? 'turno' : 'turnos'})`,
    html,
  })
}
