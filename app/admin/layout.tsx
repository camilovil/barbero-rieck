import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Panel admin · Barber Höhle',
  manifest: '/admin-manifest.json',
  robots: { index: false, follow: false }, // no indexar el admin
}

/* El panel es el único lugar donde el tema se conmuta: la app del
   cliente es la cueva y punto. La clase `papel` la aplica el script
   del layout raíz antes del primer paint —sólo bajo /admin— y la
   sostiene ThemeToggle, que además la limpia al desmontarse para que
   una navegación blanda a la portada no se la lleve puesta. */
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
