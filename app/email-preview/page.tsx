import { notFound } from 'next/navigation'
import { previewEmails } from '@/lib/email'

/* Vista previa de los mails — sólo en desarrollo.
   Renderiza las plantillas REALES dentro de un iframe, no una copia:
   el iframe además aísla los estilos del mail de los de la app, que
   es exactamente lo que hace un cliente de correo. */
export default function EmailPreviewPage() {
  if (process.env.NODE_ENV === 'production') notFound()

  const mails = previewEmails()

  return (
    <div style={{ background: 'var(--app-bg)', minHeight: '100vh', padding: '48px 20px 80px' }}>
      <div style={{ maxWidth: 720, margin: '0 auto' }}>
        <p className="rotulo">Vista previa</p>
        <h1
          className="font-display lineas"
          style={{
            fontSize: 'clamp(30px, 9vw, 40px)', fontWeight: 800, lineHeight: 1,
            letterSpacing: '-.04em', color: 'var(--text)', margin: '14px 0 0',
          }}
        >
          <span>Los mails</span>
        </h1>
        <p className="sub-step" style={{ marginTop: 14 }}>
          Son las plantillas que se mandan, con datos de muestra. Si cambia el
          código, cambia esto.
        </p>

        {mails.map(m => (
          <section key={m.id} style={{ marginTop: 44 }}>
            <div className="rotulo rotulo-rule" style={{ color: 'var(--text)' }}>
              {m.nombre}
            </div>
            <p className="mono" style={{ fontSize: 11.5, color: 'var(--text-mut)', margin: '0 0 14px', lineHeight: 1.6 }}>
              Asunto: {m.asunto}
            </p>
            <iframe
              title={m.nombre}
              srcDoc={m.html}
              style={{
                width: '100%', height: m.alto, border: '1px solid var(--border)',
                display: 'block', background: '#fff',
              }}
            />
          </section>
        ))}
      </div>
    </div>
  )
}
