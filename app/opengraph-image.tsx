import { ImageResponse } from 'next/og'

export const runtime = 'edge'
export const alt = 'Santi Barber — Edición Mundial 2026'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default async function Image() {
  const permanentMarker = await fetch(
    'https://fonts.gstatic.com/s/permanentmarker/v16/Fh4uPib9Iyv2ucM6pGQMWimMp004La2Cfw.woff2'
  ).then(r => r.arrayBuffer())

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#75AADB',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Jersey vertical stripes — left side */}
        {[0,1,2,3,4].map(i => (
          <div key={`l${i}`} style={{
            position: 'absolute',
            left: i * 22,
            top: 0, bottom: 0,
            width: 11,
            background: 'rgba(255,255,255,0.18)',
            display: 'flex',
          }} />
        ))}
        {/* Jersey vertical stripes — right side */}
        {[0,1,2,3,4].map(i => (
          <div key={`r${i}`} style={{
            position: 'absolute',
            right: i * 22,
            top: 0, bottom: 0,
            width: 11,
            background: 'rgba(255,255,255,0.18)',
            display: 'flex',
          }} />
        ))}

        {/* Stars + years */}
        <div style={{ display: 'flex', gap: 64, marginBottom: 18 }}>
          {[['★','1978'],['★','1986'],['★','2022']].map(([star, year]) => (
            <div key={year} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
              <span style={{ fontSize: 44, color: '#F2B63C', lineHeight: 1 }}>{star}</span>
              <span style={{ fontSize: 22, fontWeight: 700, color: '#0B1F47', letterSpacing: 1, fontFamily: 'sans-serif' }}>{year}</span>
            </div>
          ))}
        </div>

        {/* SANTI BARBER */}
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 28, marginBottom: 6 }}>
          <span style={{
            fontFamily: '"Permanent Marker"',
            fontSize: 148,
            color: '#ffffff',
            lineHeight: 1,
            textShadow: '3px 3px 0 rgba(0,0,0,0.15)',
          }}>
            Santi
          </span>
          <span style={{
            fontFamily: '"Permanent Marker"',
            fontSize: 148,
            color: '#0B1F47',
            lineHeight: 1,
            textShadow: '3px 3px 0 rgba(0,0,0,0.15)',
          }}>
            Barber
          </span>
        </div>

        {/* EDICIÓN MUNDIAL */}
        <div style={{
          display: 'flex',
          fontSize: 28,
          fontWeight: 700,
          color: '#ffffff',
          letterSpacing: '8px',
          textTransform: 'uppercase',
          fontFamily: 'sans-serif',
          marginBottom: 28,
        }}>
          EDICIÓN MUNDIAL · 2026
        </div>

        {/* Subtitle */}
        <div style={{
          display: 'flex',
          fontSize: 26,
          color: 'rgba(255,255,255,0.9)',
          fontFamily: 'sans-serif',
          fontWeight: 500,
          marginBottom: 40,
          letterSpacing: 0.5,
        }}>
          Corte · Barba · Combo — en el local o a domicilio
        </div>

        {/* CTA row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 28 }}>
          {/* Gold pill */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            background: '#F2B63C',
            borderRadius: 50,
            padding: '18px 44px',
            fontSize: 24,
            fontWeight: 900,
            color: '#0B1F47',
            letterSpacing: '2px',
            textTransform: 'uppercase',
            fontFamily: 'sans-serif',
          }}>
            <span style={{ fontSize: 26 }}>📅</span>
            RESERVÁ TU TURNO
          </div>

          {/* URL */}
          <div style={{
            display: 'flex',
            fontSize: 24,
            color: 'rgba(255,255,255,0.85)',
            fontFamily: 'monospace',
            fontWeight: 600,
            letterSpacing: 0.5,
          }}>
            barbero-rieck<span style={{ color: '#ffffff', fontWeight: 900 }}>.vercel.app</span>
          </div>
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [
        {
          name: 'Permanent Marker',
          data: permanentMarker,
          style: 'normal',
          weight: 400,
        },
      ],
    }
  )
}
