import type { Metadata, Viewport } from 'next'
import { Montserrat, JetBrains_Mono } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import ServiceWorkerRegistration from '@/components/ServiceWorkerRegistration'
import './globals.css'

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

export const metadata: Metadata = {
  metadataBase: new URL('https://barbero-rieck.vercel.app'),
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
    description: 'Reservá tu turno con Santiago Rieck. Corte, barba y combo. En el local o a domicilio.',
    url: 'https://barbero-rieck.vercel.app',
    siteName: 'Barber Höhle',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'Barber Höhle — Turnos online',
      },
    ],
    locale: 'es_AR',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Barber Höhle · Turnos online',
    description: 'Reservá tu turno con Santiago Rieck. Corte, barba y combo.',
    images: ['/og-image.png'],
  },
}

export const viewport: Viewport = {
  themeColor: '#0A0908',
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
        {/* El ícono nunca lleva transparencia: fondo tinta con glifo papel
            en todo, salvo apple-touch, que va invertido para no
            desaparecer en el dock oscuro de iOS. */}
        <link rel="icon" type="image/svg+xml" href="/icon.svg" />
        <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32.png" />
        <link rel="icon" type="image/png" sizes="16x16" href="/favicon-16.png" />
        <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
      </head>
      <body className="min-h-full flex flex-col antialiased">
        {children}
        <ServiceWorkerRegistration />
        <Analytics />
      </body>
    </html>
  )
}
