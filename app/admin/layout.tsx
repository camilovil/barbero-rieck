import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Panel Admin · Santi Barber',
  manifest: '/admin-manifest.json',
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
