import { ImageResponse } from 'next/og'

export const runtime = 'edge'
export const alt = 'Santi Barber — Edición Mundial 2026'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default async function Image() {
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
          background: 'linear-gradient(160deg, #75AADB 0%, #0B1F47 60%)',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Background diagonal stripes */}
        <div style={{
          position: 'absolute', inset: 0,
          background: 'repeating-linear-gradient(135deg, rgba(255,255,255,.03) 0px, rgba(255,255,255,.03) 2px, transparent 2px, transparent 40px)',
          display: 'flex',
        }} />

        {/* Left celeste stripe */}
        <div style={{
          position: 'absolute', left: 0, top: 0, bottom: 0, width: 12,
          background: '#75AADB', display: 'flex',
        }} />
        {/* Right celeste stripe */}
        <div style={{
          position: 'absolute', right: 0, top: 0, bottom: 0, width: 12,
          background: '#75AADB', display: 'flex',
        }} />

        {/* Stars row */}
        <div style={{
          display: 'flex', gap: 24, marginBottom: 20, color: '#F2B63C', fontSize: 32,
        }}>
          <span>★</span><span>★</span><span>★</span>
        </div>

        {/* Brand name */}
        <div style={{
          fontSize: 90, fontWeight: 900, color: '#fff', letterSpacing: '-2px',
          lineHeight: 1, marginBottom: 14, display: 'flex',
        }}>
          Santi Barber
        </div>

        {/* Tag line */}
        <div style={{
          fontSize: 28, fontWeight: 700, color: 'rgba(255,255,255,.8)',
          letterSpacing: '6px', textTransform: 'uppercase', marginBottom: 40,
          display: 'flex',
        }}>
          EDICIÓN MUNDIAL · 2026
        </div>

        {/* Gold divider */}
        <div style={{ width: 120, height: 4, background: '#F2B63C', borderRadius: 2, marginBottom: 36, display: 'flex' }} />

        {/* CTA pill */}
        <div style={{
          background: 'rgba(255,255,255,.12)',
          border: '2px solid rgba(255,255,255,.25)',
          borderRadius: 50, padding: '14px 40px',
          fontSize: 22, fontWeight: 700, color: '#fff',
          letterSpacing: '2px', textTransform: 'uppercase', display: 'flex',
        }}>
          Reservá tu turno
        </div>
      </div>
    ),
    { ...size }
  )
}
