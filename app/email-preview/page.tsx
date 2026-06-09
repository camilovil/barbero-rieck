// Vista previa de los emails — solo para desarrollo
import { notFound } from 'next/navigation'

if (process.env.NODE_ENV === 'production') notFound()

import { sendBookingEmails } from '@/lib/email'
import type { BookingState } from '@/types/booking'

// Importamos las funciones de HTML directamente para renderizarlas
// Como son funciones internas del módulo, las replicamos aquí para preview

const MOCK: BookingState = {
  step: 5,
  nombre: 'Camilo Villanueva',
  email: 'camilovillanueva10@gmail.com',
  whatsapp: '+54 9 11 1234 5678',
  location: 'local',
  service: { name: 'Combo', duration: 70, price: 5000 },
  date: new Date('2026-07-10'),
  time: '10:00',
  direccion: '',
  nota: 'Barba bien perfilada',
}

function formatDate(date: Date): string {
  return date.toLocaleDateString('es-AR', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  })
}
function capitalize(s: string) { return s.charAt(0).toUpperCase() + s.slice(1) }

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <tr>
      <td width="38%" style={{ padding: '13px 16px 13px 0', borderBottom: '1px solid #2a2a2a', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.09em', color: '#888', verticalAlign: 'top' }}>
        {label}
      </td>
      <td style={{ padding: '13px 0 13px 16px', borderBottom: '1px solid #2a2a2a', fontSize: 14, color: '#f5f0e8', verticalAlign: 'top', textAlign: 'right' }}>
        {value}
      </td>
    </tr>
  )
}

function EmailShell({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 64 }}>
      <span style={{ display: 'inline-block', marginBottom: 16, padding: '4px 14px', background: '#222', border: '1px solid #2e2e2e', borderRadius: 999, fontSize: 11, color: '#888', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
        {label}
      </span>
      <div style={{ background: '#111', border: '1px solid #222', borderRadius: 16, padding: '40px 32px', maxWidth: 520 }}>
        {children}
      </div>
    </div>
  )
}

export default function EmailPreviewPage() {
  const b = MOCK
  const dateStr = b.date ? capitalize(formatDate(b.date)) : '—'
  const dateParts = dateStr.split(' de ')

  return (
    <div style={{ background: '#0a0a0a', minHeight: '100vh', padding: '48px 24px', fontFamily: 'Arial, sans-serif' }}>
      <div style={{ maxWidth: 600, margin: '0 auto' }}>
        <p style={{ color: '#444', fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 40 }}>Vista previa de emails</p>

        {/* ── EMAIL AL CLIENTE ── */}
        <EmailShell label="📧 Email al cliente">
          {/* Header */}
          <div style={{ textAlign: 'center', paddingBottom: 32, borderBottom: '1px solid #2a2a2a', marginBottom: 36 }}>
            <div style={{ fontSize: 30, marginBottom: 10 }}>✂️</div>
            <div style={{ fontSize: 20, fontWeight: 700, letterSpacing: '0.08em', color: '#f5f0e8', textTransform: 'uppercase' }}>Santiago Rieck</div>
            <div style={{ fontSize: 11, color: '#555', letterSpacing: '0.12em', textTransform: 'uppercase', marginTop: 5 }}>Barbería</div>
          </div>

          {/* Greeting */}
          <div style={{ fontSize: 26, fontWeight: 700, color: '#f5f0e8', lineHeight: 1.2, marginBottom: 10 }}>
            ¡Turno confirmado,<br />{b.nombre}!
          </div>
          <div style={{ fontSize: 15, color: '#777', marginBottom: 28, lineHeight: 1.5 }}>
            Te esperamos. Santiago te va a contactar por<br />WhatsApp si necesita algo.
          </div>

          {/* Date highlight */}
          <table width="100%" cellPadding={0} cellSpacing={0} style={{ marginBottom: 24, borderCollapse: 'collapse' }}>
            <tbody>
              <tr>
                <td width="50%" style={{ padding: 20, background: '#1e1e1e', border: '1px solid #2e2e2e', borderRadius: '10px 0 0 10px', textAlign: 'center' }}>
                  <div style={{ fontSize: 11, color: '#555', textTransform: 'uppercase', letterSpacing: '0.09em', marginBottom: 4 }}>Fecha</div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: '#f5f0e8' }}>{dateParts[0]} de {dateParts.slice(1).join(' de ')}</div>
                </td>
                <td width="50%" style={{ padding: 20, background: '#1e1e1e', border: '1px solid #2e2e2e', borderLeft: 'none', borderRadius: '0 10px 10px 0', textAlign: 'center' }}>
                  <div style={{ fontSize: 11, color: '#555', textTransform: 'uppercase', letterSpacing: '0.09em', marginBottom: 4 }}>Horario</div>
                  <div style={{ fontSize: 24, fontWeight: 700, color: '#f5f0e8' }}>{b.time}</div>
                </td>
              </tr>
            </tbody>
          </table>

          {/* Detail card */}
          <div style={{ background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: 10, padding: '0 20px', marginBottom: 20 }}>
            <table width="100%" cellPadding={0} cellSpacing={0} style={{ borderCollapse: 'collapse' }}>
              <tbody>
                <DetailRow label="Servicio" value={`${b.service?.name} — $${b.service?.price?.toLocaleString('es-AR')}`} />
                <DetailRow label="Duración" value={`${b.service?.duration} min`} />
                <DetailRow label="Modalidad" value="Barbería Rieck — Av. Corrientes 1234, CABA" />
                {b.nota && <DetailRow label="Nota" value={b.nota} />}
              </tbody>
            </table>
          </div>

          <div style={{ textAlign: 'center', fontSize: 13, color: '#444', marginBottom: 28 }}>
            📎 Abrí el adjunto para agregar el turno a tu calendario
          </div>

          <div style={{ borderTop: '1px solid #1e1e1e', paddingTop: 24, textAlign: 'center', fontSize: 12, color: '#333' }}>
            Si necesitás cancelar o reprogramar, escribile a Santiago por WhatsApp.
          </div>
        </EmailShell>

        {/* ── EMAIL A SANTIAGO ── */}
        <EmailShell label="📧 Notificación a Santiago">
          <div style={{ display: 'inline-block', marginBottom: 24, padding: '8px 16px', background: '#1e1e1e', border: '1px solid #2e2e2e', borderRadius: 6, fontSize: 13, fontWeight: 700, color: '#f5f0e8' }}>
            📅 Nuevo turno
          </div>

          <div style={{ padding: 20, background: '#1e1e1e', border: '1px solid #2e2e2e', borderRadius: 10, marginBottom: 24 }}>
            <div style={{ fontSize: 11, color: '#555', textTransform: 'uppercase', letterSpacing: '0.09em', marginBottom: 4 }}>{dateStr}</div>
            <div style={{ fontSize: 28, fontWeight: 700, color: '#f5f0e8' }}>{b.time} hs</div>
            <div style={{ fontSize: 14, color: '#777', marginTop: 6 }}>{b.service?.name} · {b.service?.duration} min</div>
          </div>

          <div style={{ background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: 10, padding: '0 20px', marginBottom: 24 }}>
            <table width="100%" cellPadding={0} cellSpacing={0} style={{ borderCollapse: 'collapse' }}>
              <tbody>
                <DetailRow label="Cliente" value={b.nombre} />
                <DetailRow label="WhatsApp" value={b.whatsapp} />
                <DetailRow label="Email" value={b.email} />
                <DetailRow label="Servicio" value={`${b.service?.name} — $${b.service?.price?.toLocaleString('es-AR')}`} />
                <DetailRow label="Modalidad" value="En el local" />
                {b.nota && <DetailRow label="Nota" value={b.nota} />}
              </tbody>
            </table>
          </div>

          <div style={{ textAlign: 'center', fontSize: 12, color: '#333' }}>Barbería Rieck · Sistema de turnos</div>
        </EmailShell>

      </div>
    </div>
  )
}
