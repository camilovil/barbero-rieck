import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Barbería Rieck — Turnos',
    short_name: 'Barbería Rieck',
    description: 'Reservá tu turno con Santiago Rieck. Corte, barba y combo.',
    start_url: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#1a1a1a',
    theme_color: '#1a1a1a',
    categories: ['lifestyle', 'beauty'],
    icons: [
      { src: '/icon', sizes: '32x32', type: 'image/png' },
      { src: '/apple-icon', sizes: '180x180', type: 'image/png', purpose: 'maskable' },
    ],
    screenshots: [],
  }
}
