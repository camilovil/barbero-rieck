import BookingFlow from '@/components/BookingFlow'
import AppHeader from '@/components/AppHeader'

interface Props {
  searchParams: Promise<{ modalidad?: string; servicio?: string }>
}

export default async function Home({ searchParams }: Props) {
  const params = await searchParams
  const initialLocation = params.modalidad === 'domicilio' ? 'domicilio' : params.modalidad === 'local' ? 'local' : null
  const initialServicio = params.servicio ?? null

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--app-bg)' }}>

      <AppHeader />

      {/* Main */}
      <main className="flex-1 pb-12 px-3 sm:px-6" style={{ paddingTop: 119 + 16 }}>
        <div className="max-w-2xl mx-auto">

          {/* Hero */}
          <div className="text-center mb-8 sm:mb-10 pt-6">
            <h1 className="font-anton text-4xl sm:text-5xl mb-2 leading-tight" style={{ color: 'var(--text)', fontFamily: 'var(--font-anton,"Anton"),sans-serif', letterSpacing: '.5px' }}>
              Reservá tu turno
            </h1>
            <p className="text-sm font-semibold" style={{ color: 'var(--text-mut)' }}>
              Corte · Barba · Combo — en el local o a domicilio
            </p>
          </div>

          {/* Booking card */}
          <div className="rounded-2xl p-4 sm:p-8" style={{
            background: 'var(--surface)',
            border: '2.5px solid var(--border)',
            boxShadow: '0 20px 50px rgba(11,31,71,.1)',
          }}>
            <BookingFlow initialLocation={initialLocation} initialServicio={initialServicio} />
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="py-6 text-center text-xs font-semibold" style={{ color: 'var(--text-mut)' }}>
        © {new Date().getFullYear()} Santiago Rieck · Todos los derechos reservados
        <br />
        <span style={{ fontSize: '0.6rem', opacity: 0.5 }}>Desarrollado por Camilo Villanueva</span>
      </footer>
    </div>
  )
}
