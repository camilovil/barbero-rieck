'use client'

import { useState } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import ThemeToggle from '@/components/ThemeToggle'

export default function LoginPage() {
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const res = await fetch('/api/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    })
    if (res.ok) {
      router.push('/admin')
    } else {
      const data = await res.json()
      setError(data.error ?? 'No pudimos entrar. Probá de nuevo en unos segundos.')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col" style={{background:'var(--app-bg)'}}>

      {/* Header — el mismo lockup que la web pública. Lleva la roca:
          el login es pantalla de marca, no la herramienta de trabajo.
          Adentro del panel ya no aparece.

          El conmutador va DENTRO de la cabecera, no fijo a la ventana:
          fijo se le montaba encima al rótulo «Admin», que ocupa esa
          misma esquina. */}
      <header className="roca" style={{ borderBottom: '1px solid var(--border)' }}>
        <div style={{
          maxWidth: 384, margin: '0 auto', padding: '16px 24px 15px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
        }}>
          <span style={{ display: 'block', width: 130 }}>
            <span className="sr-only">barber Höhle</span>
            <span className="logo-ink">
              <Image src="/logo-black.png" alt="" width={1522} height={253} sizes="130px" priority
                style={{ width: '100%', height: 'auto', display: 'block' }} />
            </span>
            <span className="logo-paper">
              <Image src="/logo-white.png" alt="" width={1522} height={253} sizes="130px" priority
                style={{ width: '100%', height: 'auto', display: 'block' }} />
            </span>
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
            <span className="rotulo" style={{ letterSpacing: '.14em' }}>Admin</span>
            <ThemeToggle />
          </span>
        </div>
      </header>

      {/* Login */}
      <main className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm">

          <div className="rotulo">Acceso restringido</div>
          <h1
            className="font-display"
            style={{
              fontSize: 'clamp(30px, 9vw, 38px)', fontWeight: 800, lineHeight: 1,
              letterSpacing: '-.04em', color: 'var(--text)', margin: '14px 0 10px',
            }}
          >
            Panel
          </h1>
          <p style={{ fontSize: 13, color: 'var(--text-mut)', lineHeight: 1.6, margin: '0 0 28px' }}>
            Ingresá tu contraseña para gestionar los turnos.
          </p>

          <form onSubmit={handleSubmit}>
            <label className="field-label" htmlFor="admin-pass">Contraseña</label>
            <input
              id="admin-pass"
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-input mono"
              autoComplete="current-password"
              aria-invalid={!!error}
              aria-describedby={error ? 'admin-pass-error' : undefined}
              required
            />

            {error && (
              <p id="admin-pass-error" role="alert" className="mono" style={{
                fontSize: 11, lineHeight: 1.6, color: 'var(--text)',
                border: '1px solid var(--text)', padding: '11px 13px', margin: '18px 0 0',
              }}>
                {error}
              </p>
            )}

            <button type="submit" disabled={loading} className="btn-cta" style={{ width: '100%', marginTop: 24 }}>
              {loading ? 'Entrando…' : 'Entrar'}
            </button>
          </form>
        </div>
      </main>
    </div>
  )
}
