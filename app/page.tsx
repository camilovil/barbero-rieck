import BookingFlow from '@/components/BookingFlow'

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col bg-[#1a1a1a]">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-[#1a1a1a]/95 backdrop-blur-sm border-b border-[#2e2e2e]">
        <div className="max-w-2xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-lg">✂️</span>
            <span className="font-playfair text-lg text-[#f5f0e8] tracking-wide">Santiago Rieck</span>
          </div>
          <span className="text-xs text-[#f5f0e8]/30 uppercase tracking-widest hidden sm:block">Barbería</span>
        </div>
      </header>

      {/* Main */}
      <main className="flex-1 pt-24 pb-16 px-6">
        <div className="max-w-2xl mx-auto">
          {/* Hero text */}
          <div className="text-center mb-12">
            <h1 className="font-playfair text-4xl sm:text-5xl text-[#f5f0e8] mb-3 leading-tight">
              Reservá tu turno
            </h1>
            <p className="text-[#f5f0e8]/40 text-sm">
              Corte · Barba · Combo — en el local o a domicilio
            </p>
          </div>

          {/* Booking card */}
          <div className="bg-[#1e1e1e] border border-[#2e2e2e] rounded-2xl p-6 sm:p-8">
            <BookingFlow />
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="py-6 text-center text-[#f5f0e8]/20 text-xs">
        © {new Date().getFullYear()} Santiago Rieck · Todos los derechos reservados
      </footer>
    </div>
  )
}
