'use client'

import type { Location } from '@/types/booking'
import { ZONAS, viaticoDeBarrio, zonaDeBarrio } from '@/lib/constants'

interface Props {
  location: Location
  nombre: string
  email: string
  whatsapp: string
  direccion: string
  barrio: string | null
  nota: string
  onChange: (field: string, value: string) => void
}

/* Sin cajas: rótulo mono arriba, filete de 1px abajo. El campo
   es la línea, no un recuadro. */
function Field({
  label, hint, required, children,
}: { label: string; hint?: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label className="field-label">
        {label}
        {hint && <span style={{ color: 'var(--text-meta)' }}> · {hint}</span>}
        {required && <span aria-hidden> *</span>}
      </label>
      {children}
    </div>
  )
}

export default function StepDatos({ location, nombre, email, whatsapp, direccion, barrio, nota, onChange }: Props) {
  const viatico = viaticoDeBarrio(barrio)
  const aConvenir = zonaDeBarrio(barrio)?.aConvenir ?? false
  return (
    <div className="step-enter">
      <div className="h-step lineas"><span>Tus</span><span>datos</span></div>
      <p className="sub-step">Te llega la confirmación por mail.</p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 22, maxWidth: 520 }}>
        <Field label="Nombre y apellido" required>
          <input
            type="text" value={nombre} onChange={e => onChange('nombre', e.target.value)}
            placeholder="Lucas García" className="w-input" autoComplete="name"
          />
        </Field>

        <Field label="WhatsApp" required>
          <input
            type="tel" value={whatsapp} onChange={e => onChange('whatsapp', e.target.value)}
            placeholder="+54 9 11 0000 0000" className="w-input" autoComplete="tel"
          />
        </Field>

        <Field label="Email" required>
          <input
            type="email" value={email} onChange={e => onChange('email', e.target.value)}
            placeholder="tu@correo.com" className="w-input" autoComplete="email"
          />
        </Field>

        {location === 'domicilio' && (
          <>
            <Field label="Dirección completa" required>
              <input
                type="text" value={direccion} onChange={e => onChange('direccion', e.target.value)}
                placeholder="Calle 000, 3°B, Palermo, CABA"
                className="w-input" autoComplete="street-address"
              />
              <p className="mono" style={{ marginTop: 8, fontSize: 10.5, color: 'var(--text-meta)', lineHeight: 1.5 }}>
                CALLE Y NÚMERO · PISO / DEPTO · LOCALIDAD
              </p>
            </Field>

            {/* El barrio no es un dato más: es lo que decide el viático, así
                que el precio se dice acá mismo y no dos pasos después. */}
            <Field label="Barrio" required>
              <select
                value={barrio ?? ''}
                onChange={e => onChange('barrio', e.target.value)}
                className="w-input"
              >
                <option value="">Elegí tu barrio</option>
                {ZONAS.map(z => (
                  <optgroup key={z.id} label={z.nombre}>
                    {z.barrios.map(b => (
                      <option key={b} value={b}>{b}</option>
                    ))}
                  </optgroup>
                ))}
              </select>
              <p className="mono" style={{ marginTop: 8, fontSize: 10.5, color: 'var(--text-meta)', lineHeight: 1.5 }}>
                {!barrio
                  ? 'DENTRO DE LOS 5 KM DEL ESTUDIO NO SE COBRA VIÁTICO'
                  : aConvenir
                    ? 'FUERA DE COBERTURA · SANTIAGO TE PASA EL VIÁTICO POR WHATSAPP Y SE PAGA APARTE'
                    : viatico === 0
                      ? 'ENTRÁS EN LOS 5 KM · SIN VIÁTICO'
                      : `VIÁTICO $${viatico.toLocaleString('es-AR')} · SE SUMA AL TOTAL`}
              </p>
            </Field>
          </>
        )}

        <Field label="Nota" hint="opcional">
          <textarea
            value={nota} onChange={e => onChange('nota', e.target.value)}
            placeholder="Alguna preferencia de estilo, un detalle a tener en cuenta…"
            rows={3}
            className="w-input"
            style={{ resize: 'none', minHeight: 76 }}
          />
        </Field>
      </div>
    </div>
  )
}
