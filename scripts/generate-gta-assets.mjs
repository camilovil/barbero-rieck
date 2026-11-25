/* Generación estática de assets: no agrega trabajo a las reservas ni al
   build. Reutiliza el monograma vectorial y el arte de la campaña. */
import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import React from 'react'
import { ImageResponse } from 'next/og.js'
import sharp from 'sharp'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const publicPath = name => resolve(root, 'public', name)
const currentIcon = await readFile(publicPath('icon.svg'), 'utf8')
const paths = currentIcon.match(/<path d="[^"]+"\s*\/>/g)
if (paths?.length !== 2) throw new Error('Falta el monograma original de Höhle')

function iconSvg(maskable = false) {
  const transform = maskable
    ? 'translate(80.2 346.5) scale(.24 -.24)'
    : 'translate(21.6 375.6) scale(.32 -.32)'
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <defs>
    <linearGradient id="ink" x1="0" y1="1" x2="0" y2="0"><stop offset=".15" stop-color="#fff4e6"/><stop offset=".55" stop-color="#ffc99c"/><stop offset="1" stop-color="#ffacd1"/></linearGradient>
    <linearGradient id="sun" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#ffc99c"/><stop offset="1" stop-color="#a34c8c"/></linearGradient>
    <pattern id="lines" width="512" height="28" patternUnits="userSpaceOnUse"><rect y="4" width="512" height="24" fill="white"/></pattern>
    <mask id="stripes"><rect width="512" height="512" fill="url(#lines)"/></mask>
  </defs>
  <rect width="512" height="512" fill="#161122"/>
  <circle cx="256" cy="230" r="193" fill="url(#sun)" opacity=".22" mask="url(#stripes)"/>
  <g fill="url(#ink)">
    <g transform="${transform}">${paths.join('')}</g>
  </g>
</svg>\n`
}

const icon = iconSvg()
await writeFile(publicPath('icon.svg'), icon)
const sizes = [16, 32, 48, 180, 192, 512]
const pngs = new Map()
for (const size of sizes) {
  const png = await sharp(Buffer.from(icon)).resize(size, size).ensureAlpha().png().toBuffer()
  pngs.set(size, png)
  const name = size === 180 ? 'apple-touch-icon.png'
    : size <= 48 ? `favicon-${size}.png` : `icon-${size}.png`
  if (size !== 48) await writeFile(publicPath(name), png)
}
await sharp(Buffer.from(iconSvg(true))).removeAlpha().png().toFile(publicPath('maskable-512.png'))

/* ICO multirresolución con las mismas imágenes PNG, sin dependencias extra. */
const icoSizes = [16, 32, 48]
const icoHeader = Buffer.alloc(6 + icoSizes.length * 16)
icoHeader.writeUInt16LE(1, 2)
icoHeader.writeUInt16LE(icoSizes.length, 4)
let offset = icoHeader.length
for (const [index, size] of icoSizes.entries()) {
  const entry = 6 + index * 16
  const png = pngs.get(size)
  icoHeader[entry] = size
  icoHeader[entry + 1] = size
  icoHeader.writeUInt16LE(1, entry + 4)
  icoHeader.writeUInt16LE(32, entry + 6)
  icoHeader.writeUInt32LE(png.length, entry + 8)
  icoHeader.writeUInt32LE(offset, entry + 12)
  offset += png.length
}
const ico = Buffer.concat([icoHeader, ...icoSizes.map(size => pngs.get(size))])
await writeFile(publicPath('favicon.ico'), ico)
await writeFile(resolve(root, 'app/favicon.ico'), ico)

/* Fuente oficial de Google Fonts, sólo para rasterizar el asset estático.
   No se copia la fuente al sitio ni se hace esta consulta al compartir. */
const cssResponse = await fetch('https://fonts.googleapis.com/css2?family=Montserrat:wght@800&display=swap')
if (!cssResponse.ok) throw new Error('No se pudo cargar Montserrat para generar la portada')
const css = await cssResponse.text()
const fontUrl = [...css.matchAll(/url\((https:\/\/[^)]+)\)/g)].at(-1)?.[1]
if (!fontUrl) throw new Error('No se encontró la fuente de Montserrat')
const fontResponse = await fetch(fontUrl)
if (!fontResponse.ok) throw new Error('No se pudo descargar la fuente')
const fontData = await fontResponse.arrayBuffer()
const hero = await sharp(publicPath('sunset-barbershop.webp')).resize(1200, 630, { fit: 'cover' }).jpeg({ quality: 92 }).toBuffer()
const logo = await readFile(publicPath('logo-white.png'))
const h = React.createElement
const element = h('div', {
  style: { width: '100%', height: '100%', display: 'flex', position: 'relative', background: '#161122', color: '#fff4e6', fontFamily: 'Montserrat' },
},
  h('img', { src: `data:image/jpeg;base64,${hero.toString('base64')}`, width: 1200, height: 630, style: { position: 'absolute', inset: 0, objectFit: 'cover' } }),
  h('div', { style: { display: 'flex', position: 'absolute', left: 0, top: 0, width: 1200, height: 630, backgroundImage: 'linear-gradient(90deg, rgba(22,17,34,0.98) 0%, rgba(22,17,34,0.82) 35%, rgba(22,17,34,0.12) 78%)' } }),
  h('div', { style: { display: 'flex', position: 'absolute', left: 0, top: 0, width: 1200, height: 630, backgroundImage: 'linear-gradient(0deg, rgba(22,17,34,0.95), rgba(22,17,34,0) 40%)' } }),
  h('img', { src: `data:image/png;base64,${logo.toString('base64')}`, width: 330, height: 55, style: { position: 'absolute', left: 56, top: 56 } }),
  h('div', { style: { display: 'flex', flexDirection: 'column', position: 'absolute', left: 52, top: 214, fontSize: 78, lineHeight: .99, letterSpacing: -4, fontWeight: 800 } },
    h('div', {}, 'NUEVO LOOK.'), h('div', {}, 'MISMA'), h('div', { style: { color: '#ffacd1' } }, 'ESENCIA.'),
  ),
  h('div', { style: { display: 'flex', position: 'absolute', left: 58, right: 58, bottom: 47, justifyContent: 'space-between', alignItems: 'center', fontSize: 20 } },
    h('span', {}, 'Reservá tu turno'), h('span', { style: { color: '#ffc99c' } }, 'barberhohle.com'),
  ),
)
const response = new ImageResponse(element, { width: 1200, height: 630, fonts: [{ name: 'Montserrat', data: fontData, style: 'normal', weight: 800 }] })
const ogPng = Buffer.from(await response.arrayBuffer())
await writeFile(publicPath('og-image.png'), ogPng)
await sharp(ogPng).jpeg({ quality: 93, chromaSubsampling: '4:4:4' }).toFile(publicPath('og-gta-v1.jpg'))
console.log('Favicons, íconos de instalación y Open Graph generados.')

/* La story HD se exporta por separado desde su PNG original aprobado. */
if (process.argv[2]) {
  await mkdir(resolve(root, 'assets/social'), { recursive: true })
  await sharp(resolve(process.argv[2])).resize(2160, 3840, { fit: 'cover', kernel: 'lanczos3' }).png({ compressionLevel: 9 }).toFile(resolve(root, 'assets/social/hohle-modo-gta-story-hd.png'))
  console.log('Story PNG 2160 × 3840 exportada desde el original.')
}
