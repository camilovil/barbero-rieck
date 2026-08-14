import { Suspense } from 'react'
import FondoCueva from '@/components/FondoCueva'
import CancelarClient from './CancelarClient'

export default function CancelarPage() {
  return (
    <>
      <FondoCueva />
      <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center text-sm" style={{color:"var(--text-mut)"}}>
        Verificando turno...
      </div>
    }>
        <CancelarClient />
      </Suspense>
    </>
  )
}
