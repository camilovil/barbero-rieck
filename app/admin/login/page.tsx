'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

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
      setError(data.error ?? 'Error')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6" style={{background:'var(--bg)'}}>
      <div className="w-full max-w-sm">
        <div className="text-center mb-10">
          <div className="flex justify-center mb-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.png" alt="Santi Barber" width={56} height={56} className="rounded-full object-cover" style={{}} />
          </div>
          <h1 style={{fontFamily:'var(--font-permanent-marker)', fontSize:'1.6rem', marginTop:'12px', lineHeight:1.1}}>
            <span style={{color:'var(--text)'}}>Santi </span>
            <span style={{color:'var(--text)'}}>Barber</span>
          </h1>
          <p style={{fontSize:'0.65rem', letterSpacing:'0.15em', textTransform:'uppercase', color:'var(--text-faint)', marginTop:'4px'}}>Barbería</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs uppercase tracking-widest mb-2" style={{color:'var(--text-faint)'}}>
              Contraseña
            </label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full rounded-lg px-4 py-3 text-sm border focus:outline-none transition-all"
              style={{
                background: 'var(--bg-card)',
                borderColor: 'var(--border-2)',
                color: 'var(--text)',
              }}
              required
            />
          </div>

          {error && <p className="text-red-400 text-sm">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-xl text-sm font-semibold tracking-wide uppercase transition-all"
            style={loading
              ? {background:'var(--bg-active)', color:'var(--text-xfaint)', cursor:'not-allowed'}
              : {background:'var(--text)', color:'var(--bg)'}
            }
          >
            {loading ? 'Entrando...' : 'Entrar'}
          </button>
        </form>
      </div>
    </div>
  )
}
