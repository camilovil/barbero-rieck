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
      <label className="block text-xs uppercase tracking-widest mb-2" style={{color:'var(--text-faint)'}}>
        {label} {required && <span style={{color:'var(--text-muted)'}}>*</span>}
      </label>
      {children}
    </div>
  )
}

export default function StepDatos({ location, nombre, email, whatsapp, direccion, nota, onChange }: Props) {
  const inputStyle = {
    background: 'var(--bg-card)',
    borderColor: 'var(--border-2)',
    color: 'var(--text)',
  }

  const inputClass = `
    w-full rounded-lg px-4 py-3 text-sm border
    focus:outline-none transition-all
  `

  return (
    <div>
      <h2 className="font-playfair text-2xl sm:text-3xl mb-2" style={{color:'var(--text)'}}>Tus datos</h2>
      <p className="text-sm mb-8" style={{color:'var(--text-muted)'}}>Te mandamos confirmación por mail y Santiago te contacta por WhatsApp</p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 max-w-xl">
        <Field label="Nombre" required>
          <input type="text" value={nombre} onChange={e => onChange('nombre', e.target.value)}
            placeholder="Tu nombre" className={inputClass} style={inputStyle} />
        </Field>

        <Field label="Email" required>
          <input type="email" value={email} onChange={e => onChange('email', e.target.value)}
            placeholder="tu@mail.com" className={inputClass} style={inputStyle} />
        </Field>

        <Field label="WhatsApp" required>
          <input type="tel" value={whatsapp} onChange={e => onChange('whatsapp', e.target.value)}
            placeholder="+54 9 11 XXXX XXXX" className={inputClass} style={inputStyle} />
        </Field>

        {location === 'domicilio' && (
          <Field label="Dirección" required>
            <input type="text" value={direccion} onChange={e => onChange('direccion', e.target.value)}
              placeholder="Calle, número, piso/depto, barrio" className={inputClass} style={inputStyle} />
          </Field>
        )}

        <div className="sm:col-span-2">
          <Field label="Nota opcional">
            <textarea value={nota} onChange={e => onChange('nota', e.target.value)}
              placeholder="Algún detalle extra, preferencia de estilo..."
              rows={3} className={`${inputClass} resize-none`} style={inputStyle} />
          </Field>
        </div>
      </div>
    </div>
  )
}
