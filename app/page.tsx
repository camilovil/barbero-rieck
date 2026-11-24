import { redirect } from 'next/navigation'
import Portada from '@/components/Portada'
import SunsetFooter from '@/components/SunsetFooter'
import Splash from '@/components/Splash'
import { CASA_LEMA } from '@/lib/constants'
import SunsetTheme from '@/components/SunsetTheme'

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
    <SunsetTheme>
      <Splash pie={CASA_LEMA} sunset />
      <Portada />
      <SunsetFooter />
    </SunsetTheme>
  )
}
