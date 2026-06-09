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
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--app-bg)' }}>

      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 overflow-hidden" style={{
        background: 'linear-gradient(160deg, var(--celeste) 0%, var(--celeste-deep) 100%)',
        borderBottom: '2px solid var(--ink)',
      }}>
        {/* Rayas laterales */}
        <div style={{ position:'absolute', top:0, bottom:0, left:0, width:10, background:'repeating-linear-gradient(180deg,#fff 0 7px,transparent 7px 14px)', opacity:.45, pointerEvents:'none' }} />
        <div style={{ position:'absolute', top:0, bottom:0, right:0, width:10, background:'repeating-linear-gradient(180deg,#fff 0 7px,transparent 7px 14px)', opacity:.45, pointerEvents:'none' }} />

        <div className="max-w-2xl mx-auto px-6 h-16 flex items-center justify-between relative">
          <div className="flex items-center gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.png" alt="Santi Barber" width={44} height={44}
              className="rounded-full object-cover flex-shrink-0"
              style={{ border: '2px solid var(--gold)', boxShadow: '0 0 0 2px var(--celeste)', marginTop: -4 }} />
            <div className="flex flex-col leading-tight">
              <span style={{ fontFamily: 'var(--font-permanent-marker,"Permanent Marker"),cursive', fontSize: '1.25rem', lineHeight: 1, color: '#fff', textShadow: '0 1px 0 rgba(11,31,71,.3)' }}>
                Santi <span style={{ color: 'var(--ink)' }}>Barber</span>
              </span>
              <span style={{ fontFamily: 'var(--font-anton,"Anton"),sans-serif', fontSize: '0.5rem', letterSpacing: '0.18em', textTransform: 'uppercase', color: 'rgba(255,255,255,.8)' }}>
                Edición Mundial · 2026
              </span>
            </div>
          </div>

          {/* Estrellas — centro, solo en md+ */}
          <div className="hidden sm:flex absolute left-1/2 -translate-x-1/2 gap-4">
            {['1978','1986','2022'].map(yr => (
              <span key={yr} className="flex flex-col items-center gap-0.5">
                <svg viewBox="0 0 24 24" width={16} height={16} fill="#F2B63C" style={{ filter:'drop-shadow(0 1px 0 rgba(0,0,0,.2))' }}>
                  <path d="M12 2l2.9 6.2 6.8.7-5 4.6 1.4 6.7L12 17.8 5.9 20.2l1.4-6.7-5-4.6 6.8-.7z"/>
                </svg>
                <span style={{ fontFamily:'var(--font-anton,"Anton"),sans-serif', fontSize:8, letterSpacing:1, color:'rgba(255,255,255,.8)' }}>{yr}</span>
              </span>
            ))}
          </div>

          <ThemeToggle />
        </div>
      </header>

      {/* Main */}
      <main className="flex-1 pt-20 pb-12 px-3 sm:px-6">
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
