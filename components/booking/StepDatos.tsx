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

interface FieldProps {
  label: string
  required?: boolean
  children: React.ReactNode
}

function Field({ label, required, children }: FieldProps) {
  return (
    <div>
      <label className="block text-xs uppercase tracking-widest text-[#f5f0e8]/40 mb-2">
        {label} {required && <span className="text-[#f5f0e8]/60">*</span>}
      </label>
      {children}
    </div>
  )
}

const inputClass = `
  w-full bg-[#222222] border border-[#3a3a3a] rounded-lg px-4 py-3
  text-[#f5f0e8] text-sm placeholder:text-[#f5f0e8]/20
  focus:outline-none focus:border-[#f5f0e8]/30 focus:bg-[#272727]
  transition-all
`

export default function StepDatos({ location, nombre, email, whatsapp, direccion, nota, onChange }: Props) {
  return (
    <div>
      <h2 className="font-playfair text-2xl sm:text-3xl text-[#f5f0e8] mb-2">Tus datos</h2>
      <p className="text-[#f5f0e8]/50 text-sm mb-8">Te mandamos confirmación por mail y Santiago te contacta por WhatsApp</p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 max-w-xl">
        <Field label="Nombre" required>
          <input
            type="text"
            value={nombre}
            onChange={e => onChange('nombre', e.target.value)}
            placeholder="Tu nombre"
            className={inputClass}
          />
        </Field>

        <Field label="Email" required>
          <input
            type="email"
            value={email}
            onChange={e => onChange('email', e.target.value)}
            placeholder="tu@mail.com"
            className={inputClass}
          />
        </Field>

        <Field label="WhatsApp" required>
          <input
            type="tel"
            value={whatsapp}
            onChange={e => onChange('whatsapp', e.target.value)}
            placeholder="+54 9 11 XXXX XXXX"
            className={inputClass}
          />
        </Field>

        {location === 'domicilio' && (
          <Field label="Dirección" required>
            <input
              type="text"
              value={direccion}
              onChange={e => onChange('direccion', e.target.value)}
              placeholder="Calle, número, piso/depto, barrio"
              className={inputClass}
            />
          </Field>
        )}

        <div className="sm:col-span-2">
          <Field label="Nota opcional">
            <textarea
              value={nota}
              onChange={e => onChange('nota', e.target.value)}
              placeholder="Algún detalle extra, preferencia de estilo..."
              rows={3}
              className={`${inputClass} resize-none`}
            />
          </Field>
        </div>
      </div>
    </div>
  )
}
