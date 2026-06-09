import type { Metadata, Viewport } from 'next'
import { Anton, Barlow, Permanent_Marker } from 'next/font/google'
import ServiceWorkerRegistration from '@/components/ServiceWorkerRegistration'
import './globals.css'

const anton = Anton({
  subsets: ['latin'],
  weight: ['400'],
  variable: '--font-anton',
})

const barlow = Barlow({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800', '900'],
  variable: '--font-barlow',
})

const permanentMarker = Permanent_Marker({
  subsets: ['latin'],
  weight: ['400'],
  variable: '--font-permanent-marker',
})

export const metadata: Metadata = {
  metadataBase: new URL('https://barbero-rieck.vercel.app'),
  title: 'Santi Barber · Turnos online · Edición Mundial 2026',
  description: 'Reservá tu turno con Santiago Rieck. Corte, barba y combo. En el local o a domicilio.',
  manifest: '/site.webmanifest',
  appleWebApp: {
    capable: true,
    title: 'Santi Barber',
    statusBarStyle: 'black-translucent',
  },
  openGraph: {
    title: 'Santi Barber · Turnos online',
    description: 'Reservá tu turno con Santiago Rieck. Corte, barba y combo. En el local o a domicilio.',
    url: 'https://barbero-rieck.vercel.app',
    siteName: 'Santi Barber',
    images: [
      {
        url: '/opengraph-image',
        width: 1200,
        height: 630,
        alt: 'Santi Barber — Edición Mundial 2026',
      },
    ],
    locale: 'es_AR',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Santi Barber · Turnos online',
    description: 'Reservá tu turno con Santiago Rieck. Corte, barba y combo.',
    images: ['/opengraph-image'],
  },
}

export const viewport: Viewport = {
  themeColor: '#0B1F47',
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={`h-full ${anton.variable} ${barlow.variable} ${permanentMarker.variable}`}>
      <head>
        <meta name="mobile-web-app-capable" content="yes" />
        {/* Favicon SVG moderno */}
        <link rel="icon" type="image/svg+xml" href="/icon.svg" />
        {/* Favicon clásico */}
        <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32.png" />
        <link rel="icon" type="image/png" sizes="16x16" href="/favicon-16.png" />
        {/* iPhone / iPad — icono al agregar a pantalla de inicio */}
        <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
      </head>
      <body className="min-h-full flex flex-col antialiased">
        {children}
        <ServiceWorkerRegistration />
      </body>
    </html>
  )
}
