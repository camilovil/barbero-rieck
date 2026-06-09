import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Panel Admin · Santi Barber',
  manifest: '/admin-manifest.json',
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return children
}
