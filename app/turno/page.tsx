import { Suspense } from 'react'
import FondoCueva from '@/components/FondoCueva'
import TurnoClient from './TurnoClient'

export default function TurnoPage() {
  return (
    <>
      <FondoCueva />
      <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center text-sm" style={{color:"var(--text-mut)"}}>
        Buscando tu turno...
      </div>
    }>
        <TurnoClient />
      </Suspense>
    </>
  )
}
