'use client'

import type { Location } from '@/types/booking'

interface Props {
  location: Location
  nombre: string
  email: string
  whatsapp: string
  direccion: string
  nota: string
  onChange: (field: string, value: string) => void
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label style={{
        display: 'block', fontSize: 10, fontWeight: 800,
        textTransform: 'uppercase', letterSpacing: '.7px',
        color: 'var(--text-mut)', marginBottom: 6,
      }}>
        {label} {required && <span style={{ color: 'var(--celeste-deep)' }}>*</span>}
      </label>
      {children}
    </div>
  )
}

export default function StepDatos({ location, nombre, email, whatsapp, direccion, nota, onChange }: Props) {
  return (
    <div className="step-enter">
      <div style={{ fontFamily: 'var(--font-anton, "Anton"), sans-serif', fontSize: 25, letterSpacing: '.3px', margin: '0 0 3px', color: 'var(--text)' }}>
        Tus datos
      </div>
      <p style={{ fontSize: 12.5, color: 'var(--text-mut)', fontWeight: 600, margin: '0 0 18px' }}>
        Te llega la confirmación por mail y WhatsApp
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, maxWidth: 520 }}>
        <Field label="Nombre y apellido" required>
          <input type="text" value={nombre} onChange={e => onChange('nombre', e.target.value)}
            placeholder="Ej: Lucas García" className="w-input" />
        </Field>

        <Field label="Email" required>
          <input type="email" value={email} onChange={e => onChange('email', e.target.value)}
            placeholder="tu@mail.com" className="w-input" />
        </Field>

        <Field label="WhatsApp" required>
          <input type="tel" value={whatsapp} onChange={e => onChange('whatsapp', e.target.value)}
            placeholder="+54 9 11 XXXX XXXX" className="w-input" />
        </Field>

        {location === 'domicilio' && (
          <div style={{ gridColumn: '1 / -1' }}>
            <Field label="Dirección completa" required>
              <input type="text" value={direccion} onChange={e => onChange('direccion', e.target.value)}
                placeholder="Calle y número, piso/depto, localidad, CP"
                className="w-input" />
              <p style={{ marginTop: 6, fontSize: 11, color: 'var(--text-mut)', fontWeight: 600 }}>
                Ej: Av. Santa Fe 1234, 3°B, Palermo, CABA, C1059
              </p>
            </Field>
          </div>
        )}

        <div style={{ gridColumn: '1 / -1' }}>
          <Field label="Nota opcional">
            <textarea
              value={nota} onChange={e => onChange('nota', e.target.value)}
              placeholder="Algún detalle extra, preferencia de estilo..."
              rows={3}
              className="w-input"
              style={{ resize: 'none', minHeight: 74 }}
            />
          </Field>
        </div>
      </div>
    </div>
  )
}
