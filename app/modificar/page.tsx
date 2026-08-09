import { Suspense } from 'react'
import ModificarClient from './ModificarClient'

export default function ModificarPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center text-sm" style={{color:'var(--text-meta)'}}>Cargando...</div>}>
      <ModificarClient />
    </Suspense>
  )
}
