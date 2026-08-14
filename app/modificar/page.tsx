import { Suspense } from 'react'
import FondoCueva from '@/components/FondoCueva'
import ModificarClient from './ModificarClient'

export default function ModificarPage() {
  return (
    <>
      <FondoCueva />
      <Suspense fallback={<div className="min-h-screen flex items-center justify-center text-sm" style={{color:'var(--text-mut)'}}>Cargando...</div>}>
        <ModificarClient />
      </Suspense>
    </>
  )
}
