import { Suspense } from 'react'
import PagoClient from './PagoClient'

export default function PagoPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center text-sm" style={{background:"var(--app-bg)", color:"var(--text-mut)"}}>
        Verificando pago...
      </div>
    }>
      <PagoClient />
    </Suspense>
  )
}
