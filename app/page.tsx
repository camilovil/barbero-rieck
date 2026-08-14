import { redirect } from 'next/navigation'
import Portada from '@/components/Portada'
import PieDeLaCasa from '@/components/PieDeLaCasa'
import Splash from '@/components/Splash'
import { CASA_LEMA } from '@/lib/constants'

interface Props {
  searchParams: Promise<{ modalidad?: string; servicio?: string }>
}

export default async function Home({ searchParams }: Props) {
  const params = await searchParams

  /* Un link que ya trae modalidad o servicio viene de un mail o de una
     campaña: esa persona ya eligió y mostrarle la portada sería
     hacerle tocar un botón de más. Va derecho al flujo, con lo que
     venía elegido. */
  if (params.modalidad || params.servicio) {
    const qs = new URLSearchParams()
    if (params.modalidad) qs.set('modalidad', params.modalidad)
    if (params.servicio) qs.set('servicio', params.servicio)
    redirect(`/reservar?${qs.toString()}`)
  }

  return (
    <>
      <Splash pie={CASA_LEMA} />
      <Portada />
      <PieDeLaCasa />
    </>
  )
}
