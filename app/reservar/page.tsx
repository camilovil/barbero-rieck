import BookingFlow from '@/components/BookingFlow'
import AppHeader from '@/components/AppHeader'
import PieDeLaCasa from '@/components/PieDeLaCasa'
import FondoCueva from '@/components/FondoCueva'
import { isDepositEnabled, isViaticoEnabled } from '@/lib/flags'
import SunsetTheme from '@/components/SunsetTheme'

interface Props {
  searchParams: Promise<{ modalidad?: string; servicio?: string }>
}

/* La campaña cambia el marco visual. El estado, los parámetros de entrada
   y las banderas del flujo de reserva siguen siendo los originales. */
export default async function Reservar({ searchParams }: Props) {
  const params = await searchParams
  const initialLocation =
    params.modalidad === 'domicilio' ? 'domicilio' : params.modalidad === 'local' ? 'local' : null
  const initialServicio = params.servicio ?? null

  return (
    <SunsetTheme>
      <div className="min-h-screen flex flex-col">
        <FondoCueva />
        <AppHeader sunset />

        {/* Sólo el cuerpo del flujo hace scroll; el CTA sigue al alcance. */}
        <main
          className="sunset-booking-main px-4 sm:px-6"
          style={{
            paddingTop: 'var(--header-h)',
            height: '100dvh',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <h1 className="sr-only">Reservá tu turno en Barber Höhle</h1>
          <div className="sunset-booking-layout">
            <aside className="sunset-booking-aside">
              <span className="sunset-edition">Höhle · Sunset Edition</span>
              <h2>UN BUEN<br />CORTE.<br /><span>OTRA ENERGÍA.</span></h2>
              <p>Elegí dónde, qué y cuándo. Santiago se encarga de tu próximo look.</p>
              <span className="sunset-booking-note">BELGRANO, BUENOS AIRES<br />TU ESTILO, EN BUENAS MANOS.</span>
            </aside>
            <div className="flow-card max-w-2xl mx-auto w-full">
              <BookingFlow
                initialLocation={initialLocation}
                initialServicio={initialServicio}
                senaActiva={isDepositEnabled()}
                viaticoActivo={isViaticoEnabled()}
              />
            </div>
          </div>
        </main>

        <PieDeLaCasa />
      </div>
    </SunsetTheme>
  )
}
