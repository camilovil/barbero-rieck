// Vista previa de los emails — solo para desarrollo, eliminar antes de producción

const MOCK = {
  nombre: 'Camilo Villanueva',
  email: 'camilovillanueva10@gmail.com',
  whatsapp: '+54 9 11 1234 5678',
  location: 'local' as const,
  service: { name: 'Corte', duration: 45, price: 3500 },
  date: 'viernes, 22 de mayo de 2026',
  time: '10:00',
  direccion: '',
  nota: 'Dejá el costado más corto',
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div style={{
      display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
      padding: '13px 0', borderBottom: '1px solid #2e2e2e',
    }}>
      <span style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#f5f0e8', opacity: 0.35, paddingRight: 16, flexShrink: 0 }}>
        {label}
      </span>
      <span style={{ fontSize: 14, color: '#f5f0e8', textAlign: 'right', maxWidth: '60%' }}>
        {value}
      </span>
    </div>
  )
}

function EmailCard({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      background: '#222', border: '1px solid #2e2e2e',
      borderRadius: 12, padding: 24,
    }}>
      {children}
    </div>
  )
}

function EmailWrapper({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 64 }}>
      <div style={{
        display: 'inline-block', marginBottom: 16, padding: '4px 12px',
        background: '#2e2e2e', borderRadius: 999,
        fontSize: 11, color: '#f5f0e8', opacity: 0.5,
        textTransform: 'uppercase', letterSpacing: '0.1em',
      }}>
        {label}
      </div>
      <div style={{
        background: '#1a1a1a', border: '1px solid #2e2e2e',
        borderRadius: 16, padding: '40px 32px', maxWidth: 520,
      }}>
        {children}
      </div>
    </div>
  )
}

function Divider() {
  return <div style={{ borderTop: '1px solid #2e2e2e', margin: '28px 0' }} />
}

export default function EmailPreviewPage() {
  return (
    <div style={{ background: '#111', minHeight: '100vh', padding: '48px 24px', fontFamily: 'Arial, sans-serif' }}>
      <div style={{ maxWidth: 600, margin: '0 auto' }}>

        <h1 style={{ color: '#f5f0e8', fontSize: 13, textTransform: 'uppercase', letterSpacing: '0.1em', opacity: 0.4, marginBottom: 40 }}>
          Vista previa de emails
        </h1>

        {/* ── EMAIL AL CLIENTE ─────────────────────── */}
        <EmailWrapper label="📧 Email al cliente">
          <div style={{ color: '#f5f0e8', textAlign: 'center', paddingBottom: 28, borderBottom: '1px solid #2e2e2e', marginBottom: 28 }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>✂️</div>
            <div style={{ fontSize: 18, fontWeight: 600, letterSpacing: '0.06em' }}>SANTIAGO RIECK</div>
            <div style={{ fontSize: 11, opacity: 0.35, textTransform: 'uppercase', letterSpacing: '0.12em', marginTop: 4 }}>Barbería</div>
          </div>

          <div style={{ color: '#f5f0e8' }}>
            <h2 style={{ fontSize: 24, fontWeight: 500, marginBottom: 8 }}>
              ¡Turno confirmado, {MOCK.nombre}!
            </h2>
            <p style={{ fontSize: 14, opacity: 0.5, marginBottom: 28 }}>
              Te esperamos. Santiago te va a contactar por WhatsApp si necesita algo.
            </p>

            <EmailCard>
              <Row label="Servicio" value={`${MOCK.service.name} — $${MOCK.service.price.toLocaleString('es-AR')}`} />
              <Row label="Duración" value={`${MOCK.service.duration} min`} />
              <Row label="Fecha" value={MOCK.date} />
              <Row label="Horario" value={MOCK.time} />
              <Row label="Modalidad" value="Barbería Rieck — Av. Corrientes 1234, CABA" />
              {MOCK.nota && <Row label="Nota" value={MOCK.nota} />}
            </EmailCard>

            <Divider />
            <p style={{ fontSize: 12, opacity: 0.25, textAlign: 'center' }}>
              Si necesitás cancelar o reprogramar, escribile a Santiago por WhatsApp.
            </p>
          </div>
        </EmailWrapper>

        {/* ── EMAIL A SANTIAGO ─────────────────────── */}
        <EmailWrapper label="📧 Notificación a Santiago">
          <div style={{ color: '#f5f0e8' }}>
            <h2 style={{ fontSize: 22, fontWeight: 600, marginBottom: 4 }}>📅 Nuevo turno</h2>
            <p style={{ fontSize: 14, opacity: 0.5, marginBottom: 28 }}>
              Se acaba de confirmar un turno en la app.
            </p>

            <EmailCard>
              <Row label="Cliente" value={MOCK.nombre} />
              <Row label="WhatsApp" value={MOCK.whatsapp} />
              <Row label="Email" value={MOCK.email} />
              <Row label="Servicio" value={`${MOCK.service.name} — $${MOCK.service.price.toLocaleString('es-AR')}`} />
              <Row label="Fecha" value={MOCK.date} />
              <Row label="Horario" value={MOCK.time} />
              <Row label="Modalidad" value="En el local" />
              {MOCK.nota && <Row label="Nota" value={MOCK.nota} />}
            </EmailCard>
          </div>
        </EmailWrapper>

      </div>
    </div>
  )
}
