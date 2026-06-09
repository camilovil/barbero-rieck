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
        <div style={{ position:'absolute', top:0, bottom:0, left:0, width:14, background:'repeating-linear-gradient(180deg,#fff 0 9px,transparent 9px 18px)', opacity:.5, pointerEvents:'none' }} />
        <div style={{ position:'absolute', top:0, bottom:0, right:0, width:14, background:'repeating-linear-gradient(180deg,#fff 0 9px,transparent 9px 18px)', opacity:.5, pointerEvents:'none' }} />

        <div style={{ position:'relative', textAlign:'center', padding:'14px 60px 16px' }}>
          {/* Estrellas */}
          <div style={{ display:'flex', justifyContent:'center', gap:14, marginBottom:4 }}>
            {['1978','1986','2022'].map(yr => (
              <span key={yr} style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:2 }}>
                <svg viewBox="0 0 24 24" width={18} height={18} fill="#F2B63C" style={{ filter:'drop-shadow(0 1px 0 rgba(0,0,0,.2))' }}>
                  <path d="M12 2l2.9 6.2 6.8.7-5 4.6 1.4 6.7L12 17.8 5.9 20.2l1.4-6.7-5-4.6 6.8-.7z"/>
                </svg>
                <span style={{ fontFamily:'var(--font-anton,"Anton"),sans-serif', fontSize:9, letterSpacing:1, color:'rgba(255,255,255,.85)' }}>{yr}</span>
              </span>
            ))}
          </div>
          {/* Brand */}
          <div style={{ fontFamily:'var(--font-permanent-marker,"Permanent Marker"),cursive', fontSize:'1.875rem', lineHeight:1, color:'#fff', textShadow:'0 2px 0 rgba(11,31,71,.35)', marginBottom:3 }}>
            Santi <span style={{ color:'var(--ink)' }}>Barber</span>
          </div>
          <div style={{ fontFamily:'var(--font-anton,"Anton"),sans-serif', fontSize:11, letterSpacing:'0.27em', textTransform:'uppercase', color:'rgba(255,255,255,.92)' }}>
            Edición Mundial · 2026
          </div>

          {/* Theme toggle — absolute right */}
          <div style={{ position:'absolute', top:'50%', right:15, transform:'translateY(-50%)' }}>
            <ThemeToggle />
          </div>
        </div>
      </header>

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
