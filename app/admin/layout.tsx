import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Panel Admin · Santi Barber',
  manifest: '/admin-manifest.json',
  robots: { index: false, follow: false }, // no indexar el admin
  openGraph: {
    title: 'Panel Admin · Santi Barber',
    description: 'Gestión de turnos — Santi Barber',
    images: [{ url: '/og-image.png', width: 1200, height: 630 }],
  },
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {/* Aplica dark mode antes del primer render para evitar flash.
          Admin siempre arranca en dark salvo que el usuario lo haya cambiado explícitamente. */}
      <script
        dangerouslySetInnerHTML={{
          __html: `
            (function() {
              var saved = localStorage.getItem('santi-wiz-theme');
              var isDark = saved ? saved === 'dark' : true;
              document.documentElement.classList.toggle('dark', isDark);
            })();
          `,
        }}
      />
      {children}
    </>
  )
}
