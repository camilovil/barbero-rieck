import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import nodemailer from 'nodemailer'
import type { BookingState } from '@/types/booking'
import type { BookingEvent } from '@/lib/googleCalendar'
import {
  capitalize,
  fechaCorta as shortDate,
  fechaLarga as formatDate,
  hhmm,
  nombreServicio as serviceName,
  precioServicio as priceOf,
} from './format'
import {
  BARBER_ADDRESS,
  CANCELLATION_MIN_HOURS,
  DEPOSIT_HOLD_MINUTES,
  INSTAGRAM_HANDLE,
  INSTAGRAM_URL,
  LOCATION_LABELS,
  SERVICES,
  TIME_SLOTS,
} from './constants'

/* ═══════════════════════════════════════════════════════════════
   MAILS — sistema Barber Höhle, tema «Höhle»

   Mismo sistema que la web: filetes de 1px, escala tipográfica
   extrema y la trama diagonal como única textura. El mail va en la
   cueva —fondo oscuro y una sola luz cálida— como pide el turno 8b,
   con el papel de reserva para las piezas internas de trabajo.

   Tres cosas que el mail obliga y la web no:

   1. Tablas, no flex. Outlook usa el motor de Word y no entiende
      flex ni grid.
   2. Estilos en línea. No hay hoja de estilos ni variables CSS.
   3. Las webfonts casi no cargan: Apple Mail sí, Gmail y Outlook
      no. Por eso el titular va en 700 y no en 800 — Arial no tiene
      800 y el cliente lo sintetiza deforme. La capa mono es la que
      mejor sobrevive, y es la que lleva los datos.

   Cuarta, propia del tema: el oro no puede ser el único portador de
   un dato. Los clientes que fuerzan su propio esquema de color
   pueden reescribir fondos y textos, así que todo lo que el oro
   marca va dicho TAMBIÉN en palabras — que es la regla 03.
   ═══════════════════════════════════════════════════════════════ */

const TINTA = '#0C0C0D'
const PAPEL = '#F6F5F3'
const CANVAS = '#EDECE8'
const GRIS_1 = '#2A2A28'    // cuerpo, sobre papel
const GRIS_2 = '#6E6C67'    // secundario, sobre papel
const GRIS_4 = '#A8A7A3'    // terciario, sobre papel
const FILETE = '#DBD9D3'
const FILETE_S = '#EAE9E5'

/* La cueva. Mismos valores que html.dark en globals.css. */
const CUEVA = '#0A0908'     // fondo
const CUEVA_P = '#121110'   // panel
const CREMA = '#F1EAE0'     // texto principal
const CREMA_2 = '#B3A695'   // secundario
const CREMA_3 = '#8A7F71'   // dato en mono
const FILETE_D = '#241F19'
const ORO = '#C9974A'       // acento
const ORO_ALTO = '#E8B96B'  // realce

const SANS = `Montserrat,'Helvetica Neue',Helvetica,Arial,sans-serif`
const MONO = `'JetBrains Mono','SF Mono',Menlo,Consolas,'Courier New',monospace`

const FONTS_LINK =
  `<link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">`

function getTransporter() {
  return nodemailer.createTransport({
    service: 'gmail',
    auth: { user: process.env.GMAIL_USER, pass: process.env.GMAIL_APP_PASSWORD },
  })
}

// ─── Formato ─────────────────────────────────────────────────────


function money(n: number): string {
  return `$${n.toLocaleString('es-AR')}`
}

/* El evento de calendario guarda "Corte y barba — $19.000", sin la
   duración. Se busca por nombre en el catálogo en vez de mostrar un
   guion en el mail. */
function durationOf(servicio: string): string {
  const nombre = serviceName(servicio).trim().toLowerCase()
  for (const lista of Object.values(SERVICES)) {
    const s = lista.find(x => x.name.toLowerCase() === nombre)
    if (s) return `${s.duration} min`
  }
  return ''
}

function bookingCode(eventId: string): string {
  return 'HO-' + eventId.slice(-4).toUpperCase()
}

function getAppUrl(): string {
  if (process.env.APP_URL) return process.env.APP_URL
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`
  return 'http://localhost:3000'
}

/* ─── El logotipo ─────────────────────────────────────────────────
 *
 * Va incrustado como adjunto en línea, no como <img src="https://…">.
 * La imagen remota dependía de tres cosas y las tres fallaban: que
 * APP_URL estuviera puesta (no lo estaba, así que el mail salía
 * apuntando a http://localhost:3000 y Gmail no podía bajar nada),
 * que el dominio existiera, y que el cliente de correo aceptara
 * imágenes remotas —Outlook y Gmail las bloquean de entrada para
 * remitentes nuevos, que es justo lo que somos—.
 *
 * Con cid: el logo viaja dentro del mail y se ve siempre, también
 * probando desde local y antes de que haya dominio. */
const LOGO_CID = 'logo-hohle'
const LOGO_SRC = `cid:${LOGO_CID}`

let logoCache: Buffer | null | undefined

function logoAttachment() {
  if (logoCache === undefined) {
    try {
      logoCache = readFileSync(join(process.cwd(), 'public', 'logo-white.png'))
    } catch (err) {
      // Sin logo el mail sigue siendo legible: el monograma "Hö" es texto.
      console.error('[email] no se pudo leer public/logo-white.png —', err)
      logoCache = null
    }
  }
  return logoCache
    ? [{ filename: 'barber-hohle.png', content: logoCache, cid: LOGO_CID, contentDisposition: 'inline' as const }]
    : []
}

function cancelUrl(eventId: string, email: string): string {
  return `${getAppUrl()}/cancelar?id=${eventId}&email=${encodeURIComponent(email)}`
}

function modificarUrl(eventId: string, email: string): string {
  return `${getAppUrl()}/modificar?id=${eventId}&email=${encodeURIComponent(email)}`
}

function mapsUrl(address: string): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`
}

function esc(s: string): string {
  return (s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

// ─── Piezas del sistema ──────────────────────────────────────────

/** Las dos pieles del sistema, resueltas para el mail. */
interface Ink {
  bg: string        // fondo de la ventana
  surface: string   // fondo de la pieza
  text: string
  mut: string       // secundario
  rule: string      // filete fuerte
  ruleSoft: string  // filete de separación
  acento: string    // el acento como relleno — un botón por pieza
  onAcento: string  // texto encima del relleno
  acentoTxt: string // el acento como texto: rótulos de estado
}

const LIGHT: Ink = {
  bg: CANVAS, surface: PAPEL, text: TINTA, mut: GRIS_2,
  rule: FILETE, ruleSoft: FILETE_S,
  acento: TINTA, onAcento: PAPEL, acentoTxt: TINTA,
}
const DARK: Ink = {
  bg: CUEVA, surface: CUEVA, text: CREMA, mut: CREMA_2,
  rule: FILETE_D, ruleSoft: FILETE_D,
  acento: ORO, onAcento: CUEVA, acentoTxt: ORO_ALTO,
}

/**
 * Rótulo: mono en versalitas con tracking abierto.
 * `estado` lo sube al acento — en la cueva, al oro. Es para el
 * rótulo que dice en qué estado está el turno, que es lo que se
 * busca al abrir el mail. El estado va dicho en palabras igual: el
 * oro sólo lo refuerza, nunca lo reemplaza (regla 03).
 */
function rotulo(text: string, ink: Ink, opts: { estado?: boolean } = {}): string {
  const color = opts.estado ? ink.acentoTxt : ink.mut
  return `<p style="margin:0;font-family:${MONO};font-size:10px;font-weight:500;letter-spacing:.18em;text-transform:uppercase;color:${color};line-height:1.4">${esc(text)}</p>`
}

/**
 * Titular en display. 700 y no 800: Arial no tiene 800 y el cliente
 * de mail lo sintetiza. `lines` ya viene con HTML (puede traer <br>).
 */
function display(lines: string, ink: Ink, opts: { struck?: boolean; size?: number } = {}): string {
  const size = opts.size ?? 40
  /* Tachado: baja al terciario de su propia piel. Con el gris de
     papel sobre la cueva el titular quedaba frío y fuera del tema. */
  const color = opts.struck ? (ink === DARK ? CREMA_3 : GRIS_4) : ink.text
  const deco = opts.struck ? 'text-decoration:line-through;' : ''
  return `<p class="display" style="margin:12px 0 0;font-family:${SANS};font-size:${size}px;font-weight:700;line-height:.98;letter-spacing:-1.6px;color:${color};${deco}">${lines}</p>`
}

function parrafo(text: string, ink: Ink): string {
  return `<p style="margin:16px 0 0;font-family:${SANS};font-size:13px;font-weight:400;line-height:1.6;color:${ink === DARK ? ink.mut : GRIS_1}">${esc(text)}</p>`
}

/** Fila clave-valor. `mono` para datos: horas, precios, códigos. */
function kv(label: string, value: string, ink: Ink, opts: { mono?: boolean; last?: boolean } = {}): string {
  const border = opts.last ? '' : `border-bottom:1px solid ${ink.ruleSoft};`
  const vFont = opts.mono ? MONO : SANS
  return `<tr>
    <td style="padding:9px 0;${border}font-family:${SANS};font-size:12.5px;font-weight:400;color:${ink.mut};line-height:1.4">${esc(label)}</td>
    <td align="right" style="padding:9px 0;${border}font-family:${vFont};font-size:12.5px;font-weight:500;color:${ink.text};line-height:1.4">${esc(value)}</td>
  </tr>`
}

function kvTable(rows: string, ink: Ink): string {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
    style="margin-top:22px;border-top:1px solid ${ink.text};border-collapse:collapse">${rows}</table>`
}

/** Botón primario — relleno pleno del acento, radio 2px. En la cueva
 *  es el oro, y va uno solo por pieza: es la regla 01. */
function btnSolid(href: string, label: string, ink: Ink): string {
  return `<a href="${href}" style="display:block;padding:15px 20px;text-align:center;background:${ink.acento};color:${ink.onAcento};border-radius:2px;font-family:${SANS};font-size:13px;font-weight:600;text-decoration:none;line-height:1">${esc(label)}</a>`
}

/** Botón secundario — sólo un filete. */
function btnGhost(href: string, label: string, ink: Ink): string {
  return `<a href="${href}" style="display:block;padding:14px 20px;text-align:center;border:1px solid ${ink.text};color:${ink.text};border-radius:2px;font-family:${SANS};font-size:13px;font-weight:600;text-decoration:none;line-height:1">${esc(label)}</a>`
}

/** Dos botones lado a lado, en tabla para que Outlook los respete. */
function btnPair(a: string, b: string): string {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:22px">
    <tr>
      <td class="col" width="49%" valign="top">${a}</td>
      <td class="col-gap" width="2%"></td>
      <td class="col col-b" width="49%" valign="top">${b}</td>
    </tr>
  </table>`
}

/**
 * La trama diagonal. Outlook no entiende gradientes, así que el
 * `background-color` queda de reserva: en vez de la diagonal se ve
 * una banda lisa, que sigue perteneciendo al sistema.
 */
function trama(ink: Ink): string {
  const line = ink === DARK ? ORO : TINTA
  const flat = ink === DARK ? CUEVA_P : FILETE_S
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:26px">
    <tr><td height="14" style="height:14px;line-height:14px;font-size:0;background-color:${flat};background-image:repeating-linear-gradient(115deg,${line} 0 1px,transparent 1px 10px)">&nbsp;</td></tr>
  </table>`
}

/** El Instagram va en el pie de los mails al cliente: es donde
 *  después va a buscar los cortes. */
function instagram(ink: Ink): string {
  return `<a href="${INSTAGRAM_URL}" style="color:${ink.text};text-decoration:underline">${INSTAGRAM_HANDLE}</a>`
}

function pie(html: string, ink: Ink): string {
  return `<p style="margin:16px 0 0;font-family:${MONO};font-size:10.5px;font-weight:400;line-height:1.7;color:${ink === DARK ? CREMA_3 : GRIS_2}">${html}</p>`
}

/** El logotipo, en blanco: siempre se apoya sobre la cueva. */
function logotipo(src: string): string {
  return `<img src="${src}" width="124" alt="barber Höhle" style="display:block;width:124px;max-width:124px;height:auto;border:0">`
}

/** Banda de marca — la cueva, con el logotipo entero y el monograma. */
function marca(logoSrc: string): string {
  return `<tr><td style="padding:20px 28px;background-color:${CUEVA}">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
      <tr>
        <td align="left">${logotipo(logoSrc)}</td>
        <td align="right" style="font-family:${SANS};font-size:17px;font-weight:700;letter-spacing:-.9px;color:${ORO_ALTO}">Hö</td>
      </tr>
    </table>
  </td></tr>`
}

/**
 * Envoltorio común. `preheader` es el texto que el cliente muestra
 * al lado del asunto en la bandeja: si no se pone, toma la primera
 * línea del cuerpo y se lee cualquier cosa.
 */
function shell(opts: { ink: Ink; preheader: string; body: string; conMarca?: boolean; logoSrc?: string }): string {
  const { ink, preheader, body } = opts
  const conMarca = opts.conMarca ?? true
  const logoSrc = opts.logoSrc ?? LOGO_SRC
  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="only light">
<meta name="supported-color-schemes" content="only light">
${FONTS_LINK}
<style>
  /* Progresivo: los clientes que soportan media queries (Apple Mail,
     Gmail app, la mayoría de los móviles) aprietan el margen y apilan
     las columnas. Los que no —Outlook de escritorio— igual se ven
     bien, porque la base ya entra en el ancho fijo de 600. */
  @media only screen and (max-width:480px) {
    .pad { padding: 18px !important; }
    .col { display: block !important; width: 100% !important; max-width: 100% !important; }
    .col-gap { display: none !important; }
    .col-b { padding-top: 10px !important; }
    .display { font-size: 34px !important; letter-spacing: -1.2px !important; }
  }
</style>
</head>
<body style="margin:0;padding:0;background-color:${ink.bg};-webkit-font-smoothing:antialiased">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;height:0;width:0">${esc(preheader)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="${ink.bg}" style="background-color:${ink.bg}">
<tr><td align="center" style="padding:24px 12px">
  <!--[if mso]><table role="presentation" width="600" align="center" cellpadding="0" cellspacing="0" border="0"><tr><td><![endif]-->
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="${ink.surface}"
    style="width:100%;max-width:600px;margin:0 auto;background-color:${ink.surface};border:1px solid ${ink === DARK ? FILETE_D : FILETE};border-radius:4px">
    ${conMarca ? marca(logoSrc) : ''}
    <tr><td class="pad" style="padding:28px">
      ${body}
    </td></tr>
  </table>
  <!--[if mso]></td></tr></table><![endif]-->
</td></tr>
</table>
</body>
</html>`
}

// ─── Mails al cliente ────────────────────────────────────────────

/**
 * 03 · confirmación y recordatorio.
 * Único en tinta: es el mail que se abre en la calle, de noche.
 * Mismo molde para los dos momentos, cambia el rótulo y el copy.
 */
function clienteTurno(opts: {
  rotuloTxt: string
  titulo: string
  texto: string
  servicio: string
  duracion: string
  lugarMain: string
  lugarSub: string
  aPagar: string
  code: string
  comoLlegar: string | null
  modLink: string | null
  logoSrc?: string
}): string {
  const ink = DARK
  const rows = [
    kv('Servicio', opts.duracion ? `${opts.servicio} · ${opts.duracion}` : opts.servicio, ink),
    kv('Dónde', opts.lugarSub ? `${opts.lugarMain} · ${opts.lugarSub}` : opts.lugarMain, ink),
    kv('A pagar en el lugar', opts.aPagar, ink, { mono: true, last: true }),
  ].join('')

  const acciones = opts.comoLlegar && opts.modLink
    ? btnPair(btnSolid(opts.comoLlegar, 'Cómo llegar', ink), btnGhost(opts.modLink, 'Reprogramar', ink))
    : opts.modLink
    ? `<div style="margin-top:22px">${btnGhost(opts.modLink, 'Reprogramar', ink)}</div>`
    : ''

  /* Sin código de reserva el pie decía "Reserva  · cancelás…", con el
     hueco a la vista. La condición de cancelación vale igual. */
  const pieTxt = [
    opts.code ? `Reserva ${opts.code} &middot; c` : 'C',
    `ancelás o reprogramás hasta ${CANCELLATION_MIN_HOURS} h antes.<br>${instagram(ink)}`,
  ].join('')

  return shell({
    ink,
    conMarca: false,
    logoSrc: opts.logoSrc,
    preheader: `${opts.titulo.replace(/<br>/g, ' ')} · ${opts.servicio}`,
    body: `
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
        <tr>
          <td align="left">${logotipo(opts.logoSrc ?? LOGO_SRC)}</td>
          <td align="right" style="font-family:${SANS};font-size:17px;font-weight:700;letter-spacing:-.9px;color:${ORO_ALTO}">Hö</td>
        </tr>
      </table>
      ${trama(ink)}
      <div style="margin-top:26px">${rotulo(opts.rotuloTxt, ink, { estado: true })}</div>
      ${display(opts.titulo, ink)}
      ${parrafo(opts.texto, ink)}
      ${kvTable(rows, ink)}
      ${acciones}
      ${pie(pieTxt, ink)}
    `,
  })
}

/** 04 · cancelación. El tachado hace el trabajo del rojo. */
/* Sirve para el turno cancelado y para la reserva que se venció sin seña:
   son el mismo mail —un turno tachado y un camino de vuelta— y sólo cambian
   las palabras. Los valores por omisión son los de la cancelación. */
function clienteCancelado(opts: {
  titulo: string
  texto: string
  rows: string
  code: string
  motivo?: string
  logoSrc?: string
  rotuloTxt?: string
  preheader?: string
  cta?: string
  pieTxt?: string
}): string {
  /* Va en la cueva como el resto de lo que ve el cliente (turno 8b).
     El tachado sigue haciendo el trabajo del rojo: el oro está
     reservado a lo que pide acción, y acá no hay nada que hacer. */
  const ink = DARK
  const motivoBloque = opts.motivo
    ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:20px">
         <tr><td style="padding:14px 16px;background-color:${CUEVA_P};border-radius:3px;font-family:${SANS};font-size:12px;line-height:1.55;color:${ink.mut}">
           <span style="font-family:${MONO};font-size:9.5px;letter-spacing:.12em;text-transform:uppercase;color:${CREMA_3}">Motivo</span><br>${esc(opts.motivo)}
         </td></tr>
       </table>`
    : ''

  return shell({
    ink,
    logoSrc: opts.logoSrc,
    preheader: opts.preheader ?? `Tu turno quedó cancelado. El horario volvió a la agenda.`,
    body: `
      ${rotulo(opts.rotuloTxt ?? 'Turno cancelado', ink)}
      ${display(opts.titulo, ink, { struck: true })}
      ${parrafo(opts.texto, ink)}
      ${kvTable(opts.rows, ink)}
      ${motivoBloque}
      <div style="margin-top:22px">${btnSolid(getAppUrl(), opts.cta ?? 'Elegir otro horario', ink)}</div>
      ${trama(ink)}
      ${pie(`Reserva ${opts.code} &middot; ${opts.pieTxt ?? 'cerrada.'}<br>${esc(BARBER_ADDRESS)} &middot; ${instagram(ink)}`, ink)}
    `,
  })
}

// ─── Mails internos ──────────────────────────────────────────────

/**
 * 06 · molde interno. Sin persuasión: es un tablero. Sirve para
 * altas, cambios y cancelaciones — cambia el bloque del medio.
 */
function interno(opts: {
  rotuloTxt: string
  nombre: string
  bloque: string
  rows: string
  nota?: string
  acciones: string
  pieTxt: string
  logoSrc?: string
}): string {
  const ink = LIGHT
  const notaBloque = opts.nota
    ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:20px">
         <tr><td style="padding:14px 16px;background-color:${CANVAS};border-radius:3px;font-family:${SANS};font-size:12px;line-height:1.55;color:${GRIS_1}">
           <span style="font-family:${MONO};font-size:9.5px;letter-spacing:.12em;text-transform:uppercase;color:${GRIS_2}">Nota del cliente</span><br>${esc(opts.nota)}
         </td></tr>
       </table>`
    : ''

  return shell({
    ink,
    logoSrc: opts.logoSrc,
    preheader: `${opts.rotuloTxt} · ${opts.nombre}`,
    body: `
      <div style="padding-bottom:16px;border-bottom:1px solid ${TINTA}">
        ${rotulo(opts.rotuloTxt, ink)}
        <p class="display" style="margin:8px 0 0;font-family:${SANS};font-size:28px;font-weight:700;line-height:1;letter-spacing:-1px;color:${TINTA}">${esc(opts.nombre)}</p>
      </div>
      ${opts.bloque}
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:20px;border-collapse:collapse">${opts.rows}</table>
      ${notaBloque}
      ${opts.acciones}
      ${pie(opts.pieTxt, ink)}
    `,
  })
}

/** Bloque de un solo turno — para altas y cancelaciones. */
function bloqueTurno(fecha: string, hora: string, sub: string, opts: { struck?: boolean } = {}): string {
  if (opts.struck) {
    return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:20px">
      <tr><td style="padding:16px;border:1px solid ${FILETE};border-radius:3px">
        <p style="margin:0;font-family:${MONO};font-size:9.5px;letter-spacing:.12em;text-transform:uppercase;color:${GRIS_2}">Estaba tomado</p>
        <p style="margin:10px 0 0;font-family:${SANS};font-size:22px;font-weight:600;line-height:1.15;letter-spacing:-.5px;color:${GRIS_4};text-decoration:line-through">${esc(fecha)}<br>${esc(hora)}</p>
        <p style="margin:10px 0 0;font-family:${SANS};font-size:11.5px;line-height:1.5;color:${GRIS_2}">${esc(sub)}</p>
      </td></tr>
    </table>`
  }
  /* El turno vigente es el único bloque en cueva del mail interno:
     es lo que hay que mirar. El rótulo va en oro, el dato en crema. */
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:20px">
    <tr><td bgcolor="${CUEVA}" style="padding:16px;background-color:${CUEVA};border-radius:3px">
      <p style="margin:0;font-family:${MONO};font-size:9.5px;letter-spacing:.12em;text-transform:uppercase;color:${ORO_ALTO}">Cuándo</p>
      <p style="margin:10px 0 0;font-family:${SANS};font-size:22px;font-weight:700;line-height:1.15;letter-spacing:-.5px;color:${CREMA}">${esc(fecha)}<br>${esc(hora)}</p>
      <p style="margin:10px 0 0;font-family:${SANS};font-size:11.5px;line-height:1.5;color:${CREMA_2}">${esc(sub)}</p>
    </td></tr>
  </table>`
}

/** Antes / ahora, lado a lado. El cambio se entiende sin leer. */
function bloqueCambio(
  antes: { fecha: string; hora: string; sub: string },
  ahora: { fecha: string; hora: string; sub: string },
): string {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:20px">
    <tr>
      <td class="col" width="48%" valign="top" style="padding:16px;border:1px solid ${FILETE};border-radius:3px">
        <p style="margin:0;font-family:${MONO};font-size:9.5px;letter-spacing:.12em;text-transform:uppercase;color:${GRIS_2}">Antes</p>
        <p style="margin:10px 0 0;font-family:${SANS};font-size:19px;font-weight:600;line-height:1.15;letter-spacing:-.4px;color:${GRIS_4};text-decoration:line-through">${esc(antes.fecha)}<br>${esc(antes.hora)}</p>
        <p style="margin:10px 0 0;font-family:${SANS};font-size:11.5px;line-height:1.5;color:${GRIS_2}">${esc(antes.sub)}</p>
      </td>
      <td class="col-gap" width="4%"></td>
      <td class="col col-b" width="48%" valign="top" bgcolor="${CUEVA}" style="padding:16px;background-color:${CUEVA};border-radius:3px">
        <p style="margin:0;font-family:${MONO};font-size:9.5px;letter-spacing:.12em;text-transform:uppercase;color:${ORO_ALTO}">Ahora</p>
        <p style="margin:10px 0 0;font-family:${SANS};font-size:19px;font-weight:700;line-height:1.15;letter-spacing:-.4px;color:${CREMA}">${esc(ahora.fecha)}<br>${esc(ahora.hora)}</p>
        <p style="margin:10px 0 0;font-family:${SANS};font-size:11.5px;line-height:1.5;color:${CREMA_2}">${esc(ahora.sub)}</p>
      </td>
    </tr>
  </table>`
}

// ─── ICS ─────────────────────────────────────────────────────────

function generateICS(b: BookingState): string {
  if (!b.date || !b.time) return ''
  const [h, m] = b.time.split(':').map(Number)
  const start = new Date(b.date)
  start.setHours(h, m, 0, 0)
  const end = new Date(start.getTime() + (b.service?.duration ?? 60) * 60000)
  const fmt = (d: Date) => d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')
  const uid = `${start.getTime()}@barberhohle`
  const location = b.location === 'domicilio' ? (b.direccion || 'A domicilio') : BARBER_ADDRESS
  const description = `Servicio: ${b.service?.name ?? ''} (${b.service?.duration ?? 60} min)`

  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Barber Höhle//Turnos//ES',
    'CALSCALE:GREGORIAN',
    'METHOD:REQUEST',
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTART:${fmt(start)}`,
    `DTEND:${fmt(end)}`,
    `SUMMARY:${b.service?.name ?? 'Turno'} — Barber Höhle`,
    `DESCRIPTION:${description}`,
    `LOCATION:${location}`,
    'STATUS:CONFIRMED',
    'BEGIN:VALARM',
    'TRIGGER:-PT2H',
    'ACTION:DISPLAY',
    'DESCRIPTION:Recordatorio de turno',
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n')
}

// ─── Envíos ──────────────────────────────────────────────────────

const FROM = () => `"Barber Höhle" <${process.env.GMAIL_USER}>`

export async function sendBookingEmails(booking: BookingState, eventId: string): Promise<void> {
  if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) {
    console.log('[email] stub — falta GMAIL_USER/GMAIL_APP_PASSWORD. Link de cancelación:', cancelUrl(eventId, booking.email))
    return
  }

  const transporter = getTransporter()
  const esDomicilio = booking.location === 'domicilio'
  const lugarMain = LOCATION_LABELS[booking.location ?? 'local']
  const lugarSub = esDomicilio ? (booking.direccion || '') : BARBER_ADDRESS
  const dateLong = booking.date ? capitalize(formatDate(booking.date)) : '—'
  const dateShort = booking.date ? shortDate(booking.date) : '—'
  const code = bookingCode(eventId)
  const precio = booking.service ? money(booking.service.price) : '—'

  const clienteHtml = clienteTurno({
    rotuloTxt: 'Turno confirmado',
    titulo: `${esc(dateShort)}<br>${esc(booking.time ?? '')}`,
    texto: `${booking.nombre.split(' ')[0]}, tu lugar quedó tomado. ${esDomicilio ? 'Santiago va hasta tu dirección.' : 'Llegá cinco minutos antes.'}`,
    servicio: booking.service?.name ?? '—',
    duracion: `${booking.service?.duration ?? 60} min`,
    lugarMain,
    lugarSub,
    aPagar: precio,
    code,
    comoLlegar: esDomicilio ? null : mapsUrl(BARBER_ADDRESS),
    modLink: modificarUrl(eventId, booking.email),
  })

  const internoHtml = interno({
    rotuloTxt: 'Turno nuevo',
    nombre: booking.nombre,
    bloque: bloqueTurno(dateShort, booking.time ?? '—', `${booking.service?.name ?? ''} · ${booking.service?.duration ?? 60} min`),
    rows: [
      kv('Dónde', lugarSub ? `${lugarMain} · ${lugarSub}` : lugarMain, LIGHT),
      kv('WhatsApp', booking.whatsapp, LIGHT, { mono: true }),
      kv('Mail', booking.email, LIGHT),
      kv('A cobrar', precio, LIGHT, { mono: true, last: true }),
    ].join(''),
    nota: booking.nota || undefined,
    acciones: `<div style="margin-top:22px">${btnSolid(`${getAppUrl()}/admin`, 'Ver en la agenda', LIGHT)}</div>`,
    pieTxt: `Reserva ${code} &middot; ${esc(dateLong)}.`,
  })

  const icsContent = generateICS(booking)

  await Promise.all([
    transporter.sendMail({
      from: FROM(),
      to: booking.email,
      subject: `Turno confirmado · ${dateShort} · ${booking.time}`,
      html: clienteHtml,
      attachments: [
        ...logoAttachment(),
        ...(icsContent
          ? [{ filename: 'turno-barber-hohle.ics', content: Buffer.from(icsContent), contentType: 'text/calendar' }]
          : []),
      ],
    }),
    process.env.SANTIAGO_EMAIL
      ? transporter.sendMail({
          from: FROM(),
          to: process.env.SANTIAGO_EMAIL,
          subject: `Turno nuevo · ${booking.nombre} · ${dateShort} ${booking.time}`,
          html: internoHtml,
          attachments: logoAttachment(),
        })
      : Promise.resolve(),
  ])
}

/* El recordatorio llega la víspera: es el momento en que alguien se
   da cuenta de que no llega. Antes decía "cancelás o reprogramás
   hasta 24 h antes" sin dar ningún link para hacerlo, y el turno a
   domicilio no mostraba la dirección. Por eso recibe el eventId. */
export async function sendReminderEmail(opts: {
  nombre: string
  email: string
  eventId: string
  time: string
  servicio: string
  location: string
  direccion?: string
}): Promise<void> {
  if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) return

  const esDomicilio = opts.location === 'domicilio'
  const precio = priceOf(opts.servicio)
  const html = clienteTurno({
    rotuloTxt: 'Recordatorio',
    titulo: `Mañana<br>${esc(opts.time)}`,
    texto: `${opts.nombre.split(' ')[0]}, tu lugar está tomado. ${esDomicilio ? 'Santiago va hasta tu dirección.' : 'Llegá cinco minutos antes.'} Si te surge algo, avisá con ${CANCELLATION_MIN_HOURS} h de anticipación.`,
    servicio: serviceName(opts.servicio),
    duracion: durationOf(opts.servicio),
    lugarMain: esDomicilio ? LOCATION_LABELS.domicilio : LOCATION_LABELS.local,
    lugarSub: esDomicilio ? (opts.direccion ?? '') : BARBER_ADDRESS,
    aPagar: precio ? money(precio) : '—',
    code: bookingCode(opts.eventId),
    comoLlegar: esDomicilio ? null : mapsUrl(BARBER_ADDRESS),
    modLink: modificarUrl(opts.eventId, opts.email),
  })

  await getTransporter().sendMail({
    from: FROM(),
    to: opts.email,
    subject: `Mañana te esperamos · ${opts.time}`,
    html,
    attachments: logoAttachment(),
  })
}

/* La reserva se venció sin que entrara la seña y el horario volvió a la
   agenda. Sale un solo mail, al cliente: para Santiago no pasó nada —nunca
   tuvo un turno— y avisarle de cada reserva abandonada sería ruido. */
export async function sendExpiredHoldEmail(opts: {
  nombre: string
  email: string
  start: Date
  servicio: string
  eventId: string
  location?: string
  direccion?: string
}): Promise<void> {
  if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) {
    console.log('[email] stub — reserva vencida de', opts.nombre)
    return
  }

  const esDomicilio = opts.location === 'domicilio'
  const lugarMain = esDomicilio ? LOCATION_LABELS.domicilio : LOCATION_LABELS.local
  const lugarSub = esDomicilio ? (opts.direccion || '') : BARBER_ADDRESS
  const dateShort = shortDate(opts.start)
  const time = hhmm(opts.start)

  const html = clienteCancelado({
    rotuloTxt: 'Reserva no confirmada',
    preheader: 'No llegó la seña y el horario volvió a la agenda.',
    titulo: `${esc(dateShort)}<br>${esc(time)}`,
    texto: `${opts.nombre.split(' ')[0]}, te guardamos el horario ${DEPOSIT_HOLD_MINUTES} minutos y la seña no llegó, así que volvió a la agenda. Si todavía lo querés, reservalo de nuevo — si llegaste a pagar, escribile a Santiago y lo resolvemos.`,
    rows: [
      kv('Servicio', [serviceName(opts.servicio), durationOf(opts.servicio)].filter(Boolean).join(' · '), DARK),
      kv('Dónde', lugarSub ? `${lugarMain} · ${lugarSub}` : lugarMain, DARK, { last: true }),
    ].join(''),
    code: bookingCode(opts.eventId),
    cta: 'Reservar de nuevo',
    pieTxt: 'vencida sin seña.',
  })

  await getTransporter().sendMail({
    from: FROM(),
    to: opts.email,
    subject: `Reserva no confirmada · ${dateShort} · ${time}`,
    html,
    attachments: logoAttachment(),
  })
}

/* `canceladoPor` viene dicho, no adivinado: antes se deducía de si
   había motivo escrito, así que una cancelación de Santiago sin
   motivo le llegaba al cliente como "Cancelado por: vos, desde la
   web" — y el cliente no había hecho nada.

   Recibe la fecha como Date por lo mismo que `sendRescheduleEmails`:
   el titular va a 40px y "sábado, 8 de agosto" ocupaba cuatro
   renglones en un teléfono. */
export async function sendCancellationEmails(opts: {
  nombre: string
  email: string
  start: Date
  servicio: string
  canceladoPor: 'santiago' | 'cliente'
  eventId?: string
  location?: string
  direccion?: string
  duration?: string
  motivo?: string
}): Promise<void> {
  if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) {
    console.log('[email] stub — cancelación de', opts.nombre)
    return
  }

  const transporter = getTransporter()
  const esDomicilio = opts.location === 'domicilio'
  const lugarMain = esDomicilio ? LOCATION_LABELS.domicilio : LOCATION_LABELS.local
  const lugarSub = esDomicilio ? (opts.direccion || '') : BARBER_ADDRESS
  const code = opts.eventId ? bookingCode(opts.eventId) : '—'
  const porTxt = opts.canceladoPor === 'santiago' ? 'Santiago' : 'Vos, desde la web'
  const dateShort = shortDate(opts.start)
  const dateLong = capitalize(formatDate(opts.start))
  const time = hhmm(opts.start)

  const clienteHtml = clienteCancelado({
    titulo: `${esc(dateShort)}<br>${esc(time)}`,
    texto: 'El horario ya volvió a la agenda. Cuando quieras, elegís otro en un minuto.',
    rows: [
      /* DARK y no LIGHT: este mail va en la cueva. Con la tinta de papel
         el valor quedaba en #0C0C0D sobre #0A0908 —1.02:1—, o sea que
         el servicio, el lugar y quién canceló no se veían. */
      kv('Servicio', [serviceName(opts.servicio), opts.duration || durationOf(opts.servicio)].filter(Boolean).join(' · '), DARK),
      kv('Dónde', lugarSub ? `${lugarMain} · ${lugarSub}` : lugarMain, DARK),
      kv('Cancelado por', porTxt, DARK, { last: true }),
    ].join(''),
    code,
    motivo: opts.motivo,
  })

  const internoHtml = interno({
    rotuloTxt: 'Turno cancelado',
    nombre: opts.nombre,
    bloque: bloqueTurno(dateShort, time, `${serviceName(opts.servicio)}${opts.duration ? ` · ${opts.duration}` : ''}`, { struck: true }),
    rows: [
      kv('Dónde', lugarSub ? `${lugarMain} · ${lugarSub}` : lugarMain, LIGHT),
      kv('Mail', opts.email, LIGHT),
      kv('Cancelado por', porTxt, LIGHT, { last: true }),
    ].join(''),
    nota: opts.motivo,
    acciones: `<div style="margin-top:22px">${btnSolid(`${getAppUrl()}/admin`, 'Ver en la agenda', LIGHT)}</div>`,
    pieTxt: `Reserva ${code} &middot; ${esc(dateLong)} &middot; el horario volvió a estar disponible.`,
  })

  await Promise.all([
    transporter.sendMail({
      from: FROM(),
      to: opts.email,
      subject: `Turno cancelado · ${dateShort} · ${time}`,
      html: clienteHtml,
      attachments: logoAttachment(),
    }),
    process.env.SANTIAGO_EMAIL
      ? transporter.sendMail({
          from: FROM(),
          to: process.env.SANTIAGO_EMAIL,
          subject: `Cancelado · ${opts.nombre} · ${dateShort} ${time}`,
          html: internoHtml,
          attachments: logoAttachment(),
        })
      : Promise.resolve(),
  ])
}

/* Recibe fechas, no cadenas ya formateadas: antes le llegaba
   "miércoles, 5 de agosto de 2026" y eso, puesto en el titular a
   40px, ocupaba cuatro renglones en un teléfono. El formato lo
   decide el mail. */
export async function sendRescheduleEmails(opts: {
  nombre: string
  email: string
  oldDate: Date
  oldTime: string
  newDate: Date
  newTime: string
  servicio: string
  newEventId: string
  location?: string
  direccion?: string
}): Promise<void> {
  if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) return

  const transporter = getTransporter()
  const code = bookingCode(opts.newEventId)
  const nombreSrv = serviceName(opts.servicio)
  const precioNum = priceOf(opts.servicio)
  const oldDateStr = shortDate(opts.oldDate)
  const newDateStr = shortDate(opts.newDate)
  const newDateLong = capitalize(formatDate(opts.newDate))

  /* La modalidad se respeta. Antes esto estaba clavado en el estudio:
     a un cliente a domicilio le llegaba el mail de reprogramación
     diciéndole "Studio Höhle · Congreso 1865" y un botón "Cómo
     llegar" — o sea, la dirección equivocada. */
  const esDomicilio = opts.location === 'domicilio'

  const clienteHtml = clienteTurno({
    rotuloTxt: 'Turno reprogramado',
    titulo: `${esc(newDateStr)}<br>${esc(opts.newTime)}`,
    texto: `${opts.nombre.split(' ')[0]}, movimos tu turno al ${newDateLong}. El anterior (${oldDateStr} · ${opts.oldTime}) quedó liberado.`,
    servicio: nombreSrv,
    duracion: durationOf(opts.servicio),
    lugarMain: esDomicilio ? LOCATION_LABELS.domicilio : LOCATION_LABELS.local,
    lugarSub: esDomicilio ? (opts.direccion ?? '') : BARBER_ADDRESS,
    aPagar: precioNum ? money(precioNum) : '—',
    code,
    comoLlegar: esDomicilio ? null : mapsUrl(BARBER_ADDRESS),
    modLink: modificarUrl(opts.newEventId, opts.email),
  })

  const internoHtml = interno({
    rotuloTxt: 'Turno modificado',
    nombre: opts.nombre,
    bloque: bloqueCambio(
      { fecha: oldDateStr, hora: opts.oldTime, sub: nombreSrv },
      { fecha: newDateStr, hora: opts.newTime, sub: nombreSrv },
    ),
    rows: [
      kv('Mail', opts.email, LIGHT),
      kv('Servicio', nombreSrv, LIGHT),
      kv('Dónde', esDomicilio ? `${LOCATION_LABELS.domicilio} · ${opts.direccion ?? ''}`.trim() : `${LOCATION_LABELS.local} · ${BARBER_ADDRESS}`, LIGHT),
      kv('Horario liberado', `${oldDateStr} · ${opts.oldTime}`, LIGHT, { mono: true, last: true }),
    ].join(''),
    acciones: `<div style="margin-top:22px">${btnSolid(`${getAppUrl()}/admin`, 'Ver en la agenda', LIGHT)}</div>`,
    pieTxt: `Reserva ${code} &middot; el horario anterior volvió a la agenda.`,
  })

  await Promise.all([
    transporter.sendMail({
      from: FROM(),
      to: opts.email,
      subject: `Turno reprogramado · ${newDateStr} · ${opts.newTime}`,
      html: clienteHtml,
      attachments: logoAttachment(),
    }),
    process.env.SANTIAGO_EMAIL
      ? transporter.sendMail({
          from: FROM(),
          to: process.env.SANTIAGO_EMAIL,
          subject: `Cambio · ${opts.nombre} pasó a ${newDateStr} ${opts.newTime}`,
          html: internoHtml,
          attachments: logoAttachment(),
        })
      : Promise.resolve(),
  ])
}

/**
 * 05 · agenda del día. Es un tablero: el asunto ya trae el resumen
 * para que se lea sin abrir, y los huecos van marcados porque son
 * lo único accionable.
 */
function buildDailySummaryHtml(events: BookingEvent[], date: Date, logoSrc?: string): string {
  const ink = LIGHT
  const dateLong = capitalize(formatDate(date))

  const hora = (iso: string) => hhmm(iso)

  const ordenados = [...events].sort((a, b) => a.start.localeCompare(b.start))
  const previsto = ordenados.reduce((sum, e) => sum + priceOf(e.servicio), 0)

  /* Ocupación por minutos, no por cantidad: los servicios duran
     entre 40 y 120 min y contar turnos sueltos la subestimaría. */
  const minutosOcupados = ordenados.reduce(
    (sum, e) => sum + (new Date(e.end).getTime() - new Date(e.start).getTime()) / 60000, 0)
  const primero = TIME_SLOTS.local[0]
  const ultimo = TIME_SLOTS.local[TIME_SLOTS.local.length - 1]
  const minutosJornada =
    (Number(ultimo.slice(0, 2)) * 60 + Number(ultimo.slice(3)) + 30) -
    (Number(primero.slice(0, 2)) * 60 + Number(primero.slice(3)))
  const ocupacion = minutosJornada > 0 ? Math.min(100, Math.round(minutosOcupados / minutosJornada * 100)) : 0

  /* Un hueco es un horario libre ENTRE turnos. Hay que mirar el
     intervalo completo, no la hora de inicio: un corte y barba ocupa
     60 min, así que la media hora siguiente tampoco está libre. Los
     horarios de las puntas no son huecos — todavía no arrancó el día
     o ya terminó. */
  const min = (hhmmStr: string) => Number(hhmmStr.slice(0, 2)) * 60 + Number(hhmmStr.slice(3, 5))
  const ocupados = ordenados.map(e => ({
    desde: min(hora(e.start)),
    hasta: min(hora(e.end)),
  }))
  const jornadaDesde = ocupados.length ? Math.min(...ocupados.map(o => o.desde)) : 0
  const jornadaHasta = ocupados.length ? Math.max(...ocupados.map(o => o.hasta)) : 0
  const huecos = ordenados.length >= 2
    ? TIME_SLOTS.local.filter(slot => {
        const m = min(slot)
        if (m < jornadaDesde || m >= jornadaHasta) return false
        return !ocupados.some(o => m >= o.desde && m < o.hasta)
      })
    : []

  const stat = (n: string, label: string, negativo = false) => `
    <td width="25%" valign="top" bgcolor="${negativo ? CUEVA : PAPEL}" style="padding:12px 10px;background-color:${negativo ? CUEVA : PAPEL};border:1px solid ${FILETE}">
      <p style="margin:0;font-family:${SANS};font-size:24px;font-weight:700;line-height:1;letter-spacing:-.9px;color:${negativo ? CREMA : TINTA}">${esc(n)}</p>
      <p style="margin:6px 0 0;font-family:${MONO};font-size:9.5px;line-height:1.4;letter-spacing:.08em;color:${negativo ? CREMA_3 : GRIS_2}">${esc(label)}</p>
    </td>`

  const filaTurno = (e: BookingEvent) => {
    const esDom = e.modalidad?.toLowerCase().includes('domicilio')
    return `<tr>
      <td width="60" style="padding:11px 0;border-bottom:1px solid ${FILETE_S};font-family:${MONO};font-size:12.5px;font-weight:500;color:${TINTA}">${esc(hora(e.start))}</td>
      <td style="padding:11px 0;border-bottom:1px solid ${FILETE_S};font-family:${SANS};font-size:12.5px;line-height:1.35;color:${TINTA}">${esc(e.nombre)} · ${esc(serviceName(e.servicio))}</td>
      <td width="86" align="right" style="padding:11px 0;border-bottom:1px solid ${FILETE_S};font-family:${MONO};font-size:10px;letter-spacing:.06em;color:${GRIS_2}">${esDom ? 'DOMICILIO' : 'LOCAL'}</td>
    </tr>`
  }

  const filaHueco = (s: string) => `<tr>
    <td width="60" style="padding:11px 0;border-bottom:1px solid ${FILETE_S};background-color:${FILETE_S};background-image:repeating-linear-gradient(115deg,${FILETE} 0 1px,transparent 1px 8px);font-family:${MONO};font-size:12.5px;font-weight:500;color:${GRIS_2}">${esc(s)}</td>
    <td style="padding:11px 0;border-bottom:1px solid ${FILETE_S};background-color:${FILETE_S};background-image:repeating-linear-gradient(115deg,${FILETE} 0 1px,transparent 1px 8px);font-family:${SANS};font-size:12.5px;color:${GRIS_2}">Libre</td>
    <td width="86" align="right" style="padding:11px 0;border-bottom:1px solid ${FILETE_S};background-color:${FILETE_S};background-image:repeating-linear-gradient(115deg,${FILETE} 0 1px,transparent 1px 8px);font-family:${MONO};font-size:10px;letter-spacing:.06em;color:${GRIS_2}">HUECO</td>
  </tr>`

  /* Turnos y huecos en un solo orden de lectura: la agenda tal como
     va a transcurrir el día. */
  const filas = [
    ...ordenados.map(e => ({ hora: hora(e.start), html: filaTurno(e) })),
    ...huecos.map(s => ({ hora: s, html: filaHueco(s) })),
  ].sort((a, b) => a.hora.localeCompare(b.hora)).map(f => f.html).join('')

  const cuerpo = events.length === 0
    ? `<p style="margin:24px 0 0;font-family:${MONO};font-size:10px;letter-spacing:.18em;text-transform:uppercase;color:${GRIS_2};line-height:1.8">Sin turnos para hoy</p>`
    : `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:22px;border-collapse:collapse">
        <tr>
          <td width="60" style="padding:8px 0;border-bottom:1px solid ${TINTA};font-family:${MONO};font-size:9.5px;letter-spacing:.1em;color:${GRIS_2}">HORA</td>
          <td style="padding:8px 0;border-bottom:1px solid ${TINTA};font-family:${MONO};font-size:9.5px;letter-spacing:.1em;color:${GRIS_2}">CLIENTE · SERVICIO</td>
          <td width="86" align="right" style="padding:8px 0;border-bottom:1px solid ${TINTA};font-family:${MONO};font-size:9.5px;letter-spacing:.1em;color:${GRIS_2}">DÓNDE</td>
        </tr>
        ${filas}
      </table>`

  const html = shell({
    ink,
    logoSrc,
    preheader: `${events.length} turnos · ${money(previsto)} previstos`,
    body: `
      <div style="padding-bottom:16px;border-bottom:1px solid ${TINTA}">
        ${rotulo('Agenda del día', ink)}
        <p class="display" style="margin:8px 0 0;font-family:${SANS};font-size:28px;font-weight:700;line-height:1;letter-spacing:-1px;color:${TINTA}">${esc(dateLong)}</p>
      </div>

      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:20px;border-collapse:collapse">
        <tr>
          ${stat(String(events.length), 'TURNOS')}
          ${stat(`${ocupacion}%`, 'OCUPACIÓN')}
          ${stat(money(previsto), 'PREVISTO')}
          ${stat(String(huecos.length), 'HUECOS', huecos.length > 0)}
        </tr>
      </table>

      ${cuerpo}

      <div style="margin-top:20px">${btnSolid(`${getAppUrl()}/admin`, 'Abrir la agenda', ink)}</div>
      ${pie('Se envía todos los días a la mañana, sólo si hay turnos cargados.', ink)}
    `,
  })

  return html
}

export async function sendDailySummaryEmail(events: BookingEvent[], date: Date): Promise<void> {
  if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD || !process.env.SANTIAGO_EMAIL) return

  const previsto = events.reduce((sum, e) => sum + priceOf(e.servicio), 0)

  await getTransporter().sendMail({
    from: FROM(),
    to: process.env.SANTIAGO_EMAIL,
    subject: `${shortDate(date)} · ${events.length} ${events.length === 1 ? 'turno' : 'turnos'} · ${money(previsto)} previstos`,
    html: buildDailySummaryHtml(events, date),
    attachments: logoAttachment(),
  })
}

// ─── Vista previa ────────────────────────────────────────────────

/**
 * Devuelve las plantillas reales con datos de muestra, para
 * /email-preview. Antes esa página reimplementaba los mails a mano y
 * se desincronizaba en cada cambio; ahora renderiza lo que se manda.
 */
export function previewEmails(): { id: string; nombre: string; asunto: string; html: string; alto: number }[] {
  const fecha = new Date()
  fecha.setDate(fecha.getDate() + 3)
  const dateShort = shortDate(fecha)
  const dateLong = capitalize(formatDate(fecha))
  const code = 'HO-4821'
  const precio = money(19000)

  /* En el mail real el logo viaja adjunto y se referencia con cid:,
     que sólo resuelve dentro de un cliente de correo. Acá el iframe
     es un navegador, así que se lo sirve por HTTP. Es lo único que
     la vista previa cambia respecto de lo que se manda. */
  const logoSrc = `${getAppUrl()}/logo-white.png`

  const fechaNueva = new Date(fecha.getTime() + 86400000)
  const dateShortNueva = shortDate(fechaNueva)

  const at = (h: number, m: number) => {
    const d = new Date(fecha)
    d.setHours(h, m, 0, 0)
    return d.toISOString()
  }
  const eventosDemo: BookingEvent[] = [
    { id: 'a1', nombre: 'Julián R.', email: 'j@correo.com', whatsapp: '+5491100000001',
      servicio: 'Corte — $16.000', modalidad: LOCATION_LABELS.local, direccion: '', nota: '',
      start: at(11, 0), end: at(11, 40) },
    { id: 'a2', nombre: 'Nico F.', email: 'n@correo.com', whatsapp: '+5491100000002',
      servicio: 'Corte y barba — $19.000', modalidad: LOCATION_LABELS.local, direccion: '', nota: '',
      start: at(12, 0), end: at(13, 0) },
    { id: 'a3', nombre: 'Emiliano V.', email: 'e@correo.com', whatsapp: '+5491100000003',
      servicio: 'Corte (incluye barba) — $40.000', modalidad: LOCATION_LABELS.domicilio,
      direccion: 'Av. Cabildo 2200, Belgrano', nota: '',
      start: at(15, 0), end: at(17, 0) },
  ]

  return [
    {
      id: 'cliente-confirmacion',
      nombre: 'Cliente · turno confirmado',
      asunto: `Turno confirmado · ${dateShort} · 18:30`,
      alto: 600,
      html: clienteTurno({
        rotuloTxt: 'Turno confirmado',
        titulo: `${dateShort}<br>18:30`,
        texto: 'Tomás, tu lugar quedó tomado. Llegá cinco minutos antes.',
        servicio: 'Corte y barba',
        duracion: '60 min',
        lugarMain: LOCATION_LABELS.local,
        lugarSub: BARBER_ADDRESS,
        aPagar: precio,
        code,
        comoLlegar: mapsUrl(BARBER_ADDRESS),
        modLink: `${getAppUrl()}/modificar`,
        logoSrc,
      }),
    },
    {
      id: 'cliente-recordatorio',
      nombre: 'Cliente · recordatorio 24 h',
      asunto: 'Mañana te esperamos · 18:30',
      alto: 560,
      html: clienteTurno({
        rotuloTxt: 'Recordatorio',
        titulo: 'Mañana<br>18:30',
        texto: `Tomás, tu lugar está tomado. Llegá cinco minutos antes. Si te surge algo, avisá con ${CANCELLATION_MIN_HOURS} h de anticipación.`,
        servicio: 'Corte y barba',
        duracion: '60 min',
        lugarMain: LOCATION_LABELS.local,
        lugarSub: BARBER_ADDRESS,
        aPagar: precio,
        code,
        comoLlegar: mapsUrl(BARBER_ADDRESS),
        modLink: `${getAppUrl()}/modificar`,
        logoSrc,
      }),
    },
    {
      id: 'cliente-cancelado',
      nombre: 'Cliente · turno cancelado',
      asunto: `Turno cancelado · ${dateShort} · 18:30`,
      alto: 650,
      html: clienteCancelado({
        titulo: `${dateShort}<br>18:30`,
        texto: 'El horario ya volvió a la agenda. Cuando quieras, elegís otro en un minuto.',
        rows: [
          kv('Servicio', 'Corte y barba · 60 min', DARK),
          kv('Dónde', `${LOCATION_LABELS.local} · ${BARBER_ADDRESS}`, DARK),
          kv('Cancelado por', 'Vos, desde la web', DARK, { last: true }),
        ].join(''),
        code,
        logoSrc,
      }),
    },
    {
      id: 'cliente-reserva-vencida',
      nombre: 'Cliente · reserva no confirmada',
      asunto: `Reserva no confirmada · ${dateShort} · 18:30`,
      alto: 650,
      html: clienteCancelado({
        rotuloTxt: 'Reserva no confirmada',
        preheader: 'No llegó la seña y el horario volvió a la agenda.',
        titulo: `${dateShort}<br>18:30`,
        texto: `Tomás, te guardamos el horario ${DEPOSIT_HOLD_MINUTES} minutos y la seña no llegó, así que volvió a la agenda. Si todavía lo querés, reservalo de nuevo — si llegaste a pagar, escribile a Santiago y lo resolvemos.`,
        rows: [
          kv('Servicio', 'Corte y barba · 60 min', DARK),
          kv('Dónde', `${LOCATION_LABELS.local} · ${BARBER_ADDRESS}`, DARK, { last: true }),
        ].join(''),
        code,
        cta: 'Reservar de nuevo',
        pieTxt: 'vencida sin seña.',
        logoSrc,
      }),
    },
    {
      id: 'interno-nuevo',
      nombre: 'Santiago · turno nuevo',
      asunto: `Turno nuevo · Tomás Álvarez · ${dateShort} 18:30`,
      alto: 790,
      html: interno({
        rotuloTxt: 'Turno nuevo',
        nombre: 'Tomás Álvarez',
        bloque: bloqueTurno(dateShort, '18:30', 'Corte y barba · 60 min'),
        rows: [
          kv('Dónde', `${LOCATION_LABELS.local} · ${BARBER_ADDRESS}`, LIGHT),
          kv('WhatsApp', '+54 9 11 5555 4444', LIGHT, { mono: true }),
          kv('Mail', 'tomas@correo.com', LIGHT),
          kv('A cobrar', precio, LIGHT, { mono: true, last: true }),
        ].join(''),
        nota: 'Barba bien perfilada, prolija a los costados.',
        acciones: `<div style="margin-top:22px">${btnSolid(`${getAppUrl()}/admin`, 'Ver en la agenda', LIGHT)}</div>`,
        pieTxt: `Reserva ${code} &middot; ${dateLong}.`,
        logoSrc,
      }),
    },
    {
      id: 'interno-cambio',
      nombre: 'Santiago · turno modificado',
      asunto: `Cambio · Tomás Álvarez pasó a ${dateShortNueva} 19:15`,
      alto: 670,
      html: interno({
        rotuloTxt: 'Turno modificado',
        nombre: 'Tomás Álvarez',
        bloque: bloqueCambio(
          { fecha: dateShort, hora: '18:30', sub: 'Corte y barba' },
          { fecha: dateShortNueva, hora: '19:15', sub: 'Corte y barba' },
        ),
        rows: [
          kv('Mail', 'tomas@correo.com', LIGHT),
          kv('Servicio', 'Corte y barba', LIGHT),
          kv('Dónde', `${LOCATION_LABELS.local} · ${BARBER_ADDRESS}`, LIGHT),
          kv('Horario liberado', `${dateShort} · 18:30`, LIGHT, { mono: true, last: true }),
        ].join(''),
        acciones: `<div style="margin-top:22px">${btnSolid(`${getAppUrl()}/admin`, 'Ver en la agenda', LIGHT)}</div>`,
        pieTxt: `Reserva ${code} &middot; el horario anterior volvió a la agenda.`,
        logoSrc,
      }),
    },
    {
      id: 'interno-agenda',
      nombre: 'Santiago · agenda del día',
      asunto: `${dateShort} · 3 turnos · ${money(75000)} previstos`,
      alto: 810,
      html: buildDailySummaryHtml(eventosDemo, fecha, logoSrc),
    },
  ]
}
