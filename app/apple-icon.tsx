import { ImageResponse } from 'next/og'

export const size = { width: 180, height: 180 }
export const contentType = 'image/png'

export default function AppleIcon() {
  return new ImageResponse(
    <div style={{
      width: 180, height: 180,
      background: '#1a1a1a',
      borderRadius: 40,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 4,
    }}>
      <div style={{ fontSize: 80, lineHeight: 1 }}>✂️</div>
      <div style={{
        fontSize: 18,
        fontWeight: 700,
        color: '#f5f0e8',
        letterSpacing: 2,
      }}>RIECK</div>
    </div>,
    { ...size }
  )
}
