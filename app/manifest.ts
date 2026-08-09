import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Barber Höhle — Turnos',
    short_name: 'Barber Höhle',
    description: 'Reservá tu turno con Santiago Rieck. Corte, barba y combo.',
    start_url: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#0A0908',
    theme_color: '#0A0908',
    categories: ['lifestyle', 'beauty'],
    icons: [
      { src: '/favicon.ico', sizes: '48x48', type: 'image/x-icon' },
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
      { src: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
    ],
  }
}
