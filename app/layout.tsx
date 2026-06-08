import type { Metadata, Viewport } from 'next'
import { Playfair_Display, DM_Sans, Permanent_Marker } from 'next/font/google'
import ServiceWorkerRegistration from '@/components/ServiceWorkerRegistration'
import './globals.css'

const playfair = Playfair_Display({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-playfair',
})

const dmSans = DM_Sans({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600'],
  variable: '--font-dm-sans',
})

const permanentMarker = Permanent_Marker({
  subsets: ['latin'],
  weight: ['400'],
  variable: '--font-permanent-marker',
})

export const metadata: Metadata = {
  title: 'Barbería Rieck — Turnos online',
  description: 'Reservá tu turno con Santiago Rieck. Corte, barba y combo. En el local o a domicilio.',
  appleWebApp: {
    capable: true,
    title: 'Barbería Rieck',
    statusBarStyle: 'black-translucent',
  },
}

export const viewport: Viewport = {
  themeColor: '#1a1a1a',
  width: 'device-width',
  initialScale: 1,
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={`h-full ${playfair.variable} ${dmSans.variable} ${permanentMarker.variable}`}>
      <head>
        {/* PWA — iOS */}
        <meta name="mobile-web-app-capable" content="yes" />
        <link rel="apple-touch-startup-image" href="/apple-icon" />
        {/* Genera los iconos 192/512 para el manifest */}
        <link rel="icon" sizes="192x192" href="/icon-192.png" />
        <link rel="icon" sizes="512x512" href="/icon-512.png" />
      </head>
      <body className="min-h-full flex flex-col bg-[#1a1a1a] antialiased">
        {children}
        <ServiceWorkerRegistration />
      </body>
    </html>
  )
}
