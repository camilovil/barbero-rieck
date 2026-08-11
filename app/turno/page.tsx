import { Suspense } from 'react'
import TurnoClient from './TurnoClient'

export default function TurnoPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center text-sm" style={{background:"var(--app-bg)", color:"var(--text-mut)"}}>
        Buscando tu turno...
      </div>
    }>
      <TurnoClient />
    </Suspense>
  )
}
