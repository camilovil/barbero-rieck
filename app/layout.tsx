import type { Metadata, Viewport } from 'next'
import { Montserrat, JetBrains_Mono } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import ServiceWorkerRegistration from '@/components/ServiceWorkerRegistration'
import { getAppUrl } from '@/lib/url'
import './globals.css'
import './gta-palette.css'

/* Montserrat es la voz única del sistema: el logotipo ya es
   Montserrat en peso alto, así que la interfaz es el mismo
   alfabeto. JetBrains Mono queda reservado para datos —
   horas, precios y rótulos. El resto del proyecto sólo usa
   var(--font-sans) y var(--font-mono). */
const sans = Montserrat({
  subsets: ['latin'],
  variable: '--font-montserrat',
})

const mono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-jetbrains',
})

/* El dominio no se escribe acá: sale de APP_URL, que es la misma
   fuente que usan los links de los mails. Ver lib/url.ts. */
const SITIO = getAppUrl()

export const metadata: Metadata = {
  metadataBase: new URL(SITIO),
  title: 'Barber Höhle · Turnos online',
  description: 'Reservá tu turno con Santiago Rieck. Corte, barba y combo. En el local o a domicilio.',
  /* El manifest lo genera app/manifest.ts y Next inyecta el <link> solo.
     No declararlo acá: si no, salen dos etiquetas apuntando a archivos
     distintos y el navegador toma cualquiera de las dos. */
  appleWebApp: {
    capable: true,
    title: 'Barber Höhle',
    statusBarStyle: 'black-translucent',
  },
  openGraph: {
    title: 'Barber Höhle · Turnos online',
    description: 'Nuevo look. Misma esencia. Reservá tu turno con Santiago Rieck, en el studio o a domicilio.',
    url: SITIO,
    siteName: 'Barber Höhle',
    images: [
      {
        url: '/og-gta-v1.jpg',
        width: 1200,
        height: 630,
        type: 'image/jpeg',
        alt: 'Barber Höhle — Nuevo look, misma esencia.',
      },
    ],
    locale: 'es_AR',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Barber Höhle · Turnos online',
    description: 'Nuevo look. Misma esencia. Reservá tu turno con Santiago Rieck.',
    images: [{ url: '/og-gta-v1.jpg', alt: 'Barber Höhle — Nuevo look, misma esencia.' }],
  },
}

export const viewport: Viewport = {
  themeColor: '#161122',
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={`h-full ${sans.variable} ${mono.variable}`} suppressHydrationWarning>
      <head>
        {/* Dos cosas que tienen que estar resueltas ANTES del primer
            paint, o se ven como un destello:

            1. El panel en papel. Sin clase el sistema es la cueva;
               esto sólo se ocupa del caso contrario. La app del
               cliente no entra acá nunca.
            2. La apertura. Deja `data-apertura="espera"` en el <html>
               la primera vez de cada sesión, y sólo en la portada. El
               CSS cuelga de ese atributo tanto la capa de carga como
               el estado inicial de la portada: sin él no hay apertura
               y se ve la portada quieta, que es lo que tiene que pasar
               en cada navegación posterior.

            La red de seguridad del final es por si el bundle no llega
            a ejecutarse: el atributo lo pone este script, así que
            tiene que ser este script el que sepa sacarlo. Si a los
            2,5 s nadie se hizo cargo, entrega la portada igual. Nadie
            se queda mirando una pantalla negra porque falló un chunk. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  if (location.pathname.indexOf('/admin') === 0) {
                    if (localStorage.getItem('hohle-theme') === 'papel') {
                      document.documentElement.classList.add('papel');
                    }
                    if (localStorage.getItem('hohle-gta') === '1') {
                      document.documentElement.classList.remove('papel');
                      document.documentElement.classList.add('modo-gta');
                    }
                    return;
                  }
                  if (location.pathname !== '/') return;
                  if (sessionStorage.getItem('bh_splash_visto') === '1') return;
                  sessionStorage.setItem('bh_splash_visto', '1');
                  document.documentElement.dataset.apertura = 'espera';
                  setTimeout(function () {
                    if (document.documentElement.dataset.apertura !== 'espera') return;
                    document.documentElement.dataset.apertura = 'entra';
                    var capa = document.querySelector('.splash');
                    if (capa) capa.style.display = 'none';
                  }, 2500);
                } catch (e) {}
              })();
            `,
          }}
        />
        <meta name="mobile-web-app-capable" content="yes" />
        {/* URLs versionadas para renovar los íconos de la campaña.
            Todos llevan fondo opaco, incluso el apple-touch. */}
        <link rel="icon" type="image/svg+xml" href="/icon.svg?v=gta-v1" />
        <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32.png?v=gta-v1" />
        <link rel="icon" type="image/png" sizes="16x16" href="/favicon-16.png?v=gta-v1" />
        <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png?v=gta-v1" />
      </head>
      <body className="min-h-full flex flex-col antialiased">
        {children}
        <ServiceWorkerRegistration />
        <Analytics />
      </body>
    </html>
  )
}
