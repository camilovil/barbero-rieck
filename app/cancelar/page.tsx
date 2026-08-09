import { Suspense } from 'react'
import CancelarClient from './CancelarClient'

export default function CancelarPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center text-sm" style={{background:"var(--app-bg)", color:"var(--text-mut)"}}>
        Verificando turno...
      </div>
    }>
      <CancelarClient />
    </Suspense>
  )
}
