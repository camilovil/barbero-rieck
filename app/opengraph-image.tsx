import { ImageResponse } from 'next/og'
import { readFile } from 'fs/promises'
import { join } from 'path'

export const runtime = 'nodejs'
export const alt = 'Santi Barber — Edición Mundial 2026'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default async function Image() {
  const fontData = await readFile(join(process.cwd(), 'public/fonts/PermanentMarker.woff2'))

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
        {/* Jersey stripes left */}
        {[0,1,2,3,4].map(i => (
          <div key={`l${i}`} style={{ position:'absolute', left: i*22, top:0, bottom:0, width:11, background:'rgba(255,255,255,0.18)', display:'flex' }} />
        ))}
        {/* Jersey stripes right */}
        {[0,1,2,3,4].map(i => (
          <div key={`r${i}`} style={{ position:'absolute', right: i*22, top:0, bottom:0, width:11, background:'rgba(255,255,255,0.18)', display:'flex' }} />
        ))}

        {/* Stars + years */}
        <div style={{ display:'flex', gap:64, marginBottom:20 }}>
          {['1978','1986','2022'].map(year => (
            <div key={year} style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:6 }}>
              <span style={{ fontSize:44, lineHeight:1 }}>⭐</span>
              <span style={{ fontSize:20, fontWeight:700, color:'#0B1F47', fontFamily:'sans-serif' }}>{year}</span>
            </div>
          ))}
        </div>

        {/* SANTI BARBER */}
        <div style={{ display:'flex', gap:24, marginBottom:10 }}>
          <span style={{ fontFamily:'"Permanent Marker"', fontSize:148, color:'#ffffff', lineHeight:1, textShadow:'4px 4px 0 rgba(0,0,0,0.2)' }}>
            Santi
          </span>
          <span style={{ fontFamily:'"Permanent Marker"', fontSize:148, color:'#0B1F47', lineHeight:1, textShadow:'4px 4px 0 rgba(0,0,0,0.2)' }}>
            Barber
          </span>
        </div>

        {/* EDICIÓN MUNDIAL */}
        <div style={{ display:'flex', fontSize:27, fontWeight:700, color:'#fff', letterSpacing:7, textTransform:'uppercase', fontFamily:'sans-serif', marginBottom:24 }}>
          EDICIÓN MUNDIAL · 2026
        </div>

        {/* Subtitle */}
        <div style={{ display:'flex', fontSize:24, color:'rgba(255,255,255,0.88)', fontFamily:'sans-serif', marginBottom:38 }}>
          Corte · Barba · Combo — en el local o a domicilio
        </div>

        {/* CTA */}
        <div style={{ display:'flex', alignItems:'center', gap:28 }}>
          <div style={{ display:'flex', alignItems:'center', gap:10, background:'#F2B63C', borderRadius:50, padding:'16px 42px', fontSize:22, fontWeight:900, color:'#0B1F47', letterSpacing:2, textTransform:'uppercase', fontFamily:'sans-serif' }}>
            📅 RESERVÁ TU TURNO
          </div>
          <div style={{ display:'flex', fontSize:22, color:'rgba(255,255,255,0.8)', fontFamily:'monospace' }}>
            barbero-rieck.vercel.app
          </div>
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [{ name: 'Permanent Marker', data: fontData, style: 'normal', weight: 400 }],
    }
  )
}
