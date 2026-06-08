import BookingFlow from '@/components/BookingFlow'
import ThemeToggle from '@/components/ThemeToggle'

interface Props {
  searchParams: Promise<{ modalidad?: string; servicio?: string }>
}

export default async function Home({ searchParams }: Props) {
  const params = await searchParams
  const initialLocation = params.modalidad === 'domicilio' ? 'domicilio' : params.modalidad === 'local' ? 'local' : null
  const initialServicio = params.servicio ?? null
  return (
    <div className="min-h-screen flex flex-col t-bg">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 t-bg-2 backdrop-blur-sm border-b t-border" style={{background:'var(--bg-2)', borderColor:'var(--border)'}}>
        <div className="max-w-2xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.png" alt="Santi Barber" width={44} height={44} className="rounded-full object-cover" style={{marginTop:'-12px'}} />
            <div className="flex flex-col leading-tight">
              <span style={{fontFamily:'var(--font-permanent-marker)', fontSize:'1.2rem', lineHeight:1.1}}>
                <span style={{color:'var(--text)'}}>Santi </span>
                <span style={{color:'var(--text)'}}>Barber</span>
              </span>
              <span style={{fontSize:'0.6rem', letterSpacing:'0.15em', textTransform:'uppercase', color:'var(--text-faint)'}}>Barbería</span>
            </div>
          </div>
          <ThemeToggle />
        </div>
      </header>

      {/* Main */}
      <main className="flex-1 pt-20 pb-12 px-3 sm:px-6">
        <div className="max-w-2xl mx-auto">
          {/* Hero text */}
          <div className="text-center mb-8 sm:mb-12">
            <h1 className="font-playfair text-3xl sm:text-5xl mb-2 leading-tight" style={{color:'var(--text)'}}>
              Reservá tu turno
            </h1>
            <p className="text-sm" style={{color:'var(--text-muted)'}}>
              Corte · Barba · Combo — en el local o a domicilio
            </p>
          </div>

          {/* Booking card */}
          <div className="border rounded-2xl p-4 sm:p-8" style={{background:'var(--bg-2)', borderColor:'var(--border)'}}>
            <BookingFlow initialLocation={initialLocation} initialServicio={initialServicio} />
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="py-6 text-center text-xs" style={{color:'var(--text-muted)'}}>
        © {new Date().getFullYear()} Santiago Rieck · Todos los derechos reservados
      </footer>
    </div>
  )
}
