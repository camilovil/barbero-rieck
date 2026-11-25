import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Barber Höhle — Turnos',
    short_name: 'Barber Höhle',
    description: 'Reservá tu turno con Santiago Rieck. Corte, barba y combo.',
    start_url: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#161122',
    theme_color: '#161122',
    categories: ['lifestyle', 'beauty'],
    icons: [
      { src: '/favicon.ico?v=gta-v1', sizes: '48x48', type: 'image/x-icon' },
      { src: '/icon-192.png?v=gta-v1', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icon-512.png?v=gta-v1', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/maskable-512.png?v=gta-v1', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
      { src: '/apple-touch-icon.png?v=gta-v1', sizes: '180x180', type: 'image/png' },
    ],
  }
}
