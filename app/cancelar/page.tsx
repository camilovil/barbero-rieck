import { Suspense } from 'react'
import CancelarClient from './CancelarClient'

export default function CancelarPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#1a1a1a] flex items-center justify-center text-[#f5f0e8]/40 text-sm">
        Verificando turno...
      </div>
    }>
      <CancelarClient />
    </Suspense>
  )
}
