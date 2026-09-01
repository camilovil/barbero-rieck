import { Suspense } from 'react'
import FondoCueva from '@/components/FondoCueva'
import PagoClient from './PagoClient'
import { datosDeTransferencia } from '@/lib/transferencia'

/* El alias se lee acá, en el servidor, y baja como prop. Un componente de
   cliente no puede leer process.env: recibiría undefined y la pantalla se
   quedaría sin el dato principal sin que nadie se entere.

   Y se lee en cada visita, no una vez. Sin esta línea Next da la pantalla por
   estática y resuelve el alias en el momento del build: quedaría cocido en el
   HTML, y cambiarlo en Vercel no cambiaría nada hasta el siguiente deploy.
   Peor todavía, un build hecho antes de cargar la variable dejaría la pantalla
   sin alias para siempre, que es exactamente lo que pasó la primera vez que se
   probó esto. */
export const dynamic = 'force-dynamic'

export default function PagoPage() {
  const datos = datosDeTransferencia()

  return (
    <>
      <FondoCueva />
      <Suspense fallback={
        <div className="min-h-screen flex items-center justify-center text-sm" style={{ color: 'var(--text-mut)' }}>
          Buscando tu reserva…
        </div>
      }>
        <PagoClient datos={datos} />
      </Suspense>
    </>
  )
}
