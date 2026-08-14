import { Suspense } from 'react'
import FondoCueva from '@/components/FondoCueva'
import PagoClient from './PagoClient'

export default function PagoPage() {
  return (
    <>
      <FondoCueva />
      <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center text-sm" style={{color:"var(--text-mut)"}}>
        Verificando pago...
      </div>
    }>
        <PagoClient />
      </Suspense>
    </>
  )
}
