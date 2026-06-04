import BookingFlow from '@/components/BookingFlow'
import ThemeToggle from '@/components/ThemeToggle'
import Image from 'next/image'

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col t-bg">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 t-bg-2 backdrop-blur-sm border-b t-border" style={{background:'var(--bg-2)', borderColor:'var(--border)'}}>
        <div className="max-w-2xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Image src="/logo.png" alt="Santi Barber" width={36} height={36} className="rounded-full object-cover" />
            <span className="font-playfair text-lg tracking-wide t-text" style={{color:'var(--text)'}}>Santiago Rieck</span>
          </div>
          <ThemeToggle />
        </div>
      </header>

      {/* Main */}
      <main className="flex-1 pt-24 pb-16 px-6">
        <div className="max-w-2xl mx-auto">
          {/* Hero text */}
          <div className="text-center mb-12">
            <h1 className="font-playfair text-4xl sm:text-5xl mb-3 leading-tight" style={{color:'var(--text)'}}>
              Reservá tu turno
            </h1>
            <p className="text-sm" style={{color:'var(--text-muted)'}}>
              Corte · Barba · Combo — en el local o a domicilio
            </p>
          </div>

          {/* Booking card */}
          <div className="border rounded-2xl p-6 sm:p-8" style={{background:'var(--bg-2)', borderColor:'var(--border)'}}>
            <BookingFlow />
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="py-6 text-center text-xs" style={{color:'var(--text-faint)'}}>
        © {new Date().getFullYear()} Santiago Rieck · Todos los derechos reservados
      </footer>
    </div>
  )
}
