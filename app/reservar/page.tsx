import BookingFlow from '@/components/BookingFlow'
import AppHeader from '@/components/AppHeader'
import PieDeLaCasa from '@/components/PieDeLaCasa'
import { isDepositEnabled, isViaticoEnabled } from '@/lib/flags'

interface Props {
  searchParams: Promise<{ modalidad?: string; servicio?: string }>
}

/* El flujo de reserva. Vivía en la raíz hasta que la portada tomó ese
   lugar; se mudó entero, sin tocarle nada, y la raíz redirige acá
   cuando el link ya trae modalidad o servicio.

   Acá NO va la roca: la foto de marca ya se usó en la portada, que es
   la pantalla de marca. Esto es la herramienta —elegir y confirmar— y
   el fondo negro plano es lo que deja leer la grilla de horarios. */
export default async function Reservar({ searchParams }: Props) {
  const params = await searchParams
  const initialLocation =
    params.modalidad === 'domicilio' ? 'domicilio' : params.modalidad === 'local' ? 'local' : null
  const initialServicio = params.servicio ?? null

  return (
    <div className="min-h-screen flex flex-col">
      <AppHeader />

      {/* El flujo es la página. Ocupa exactamente lo que queda de
          pantalla bajo la cabecera y no cambia de alto entre pasos:
          nunca hay que scrollear para llegar al botón. */}
      <main
        className="px-4 sm:px-6"
        style={{
          paddingTop: 'var(--header-h)',
          height: '100dvh',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* El alto lo decide `.flow-card`: pantalla completa en celular,
            al tamaño del contenido en escritorio. */}
        <div className="flow-card max-w-2xl mx-auto w-full">
          {/* Qué cobra la web lo decide el servidor: el flujo no puede leer
              variables de entorno, y no queremos copias públicas que se
              desincronicen de las de verdad. */}
          <BookingFlow
            initialLocation={initialLocation}
            initialServicio={initialServicio}
            senaActiva={isDepositEnabled()}
            viaticoActivo={isViaticoEnabled()}
          />
        </div>
      </main>

      <PieDeLaCasa />
    </div>
  )
}
