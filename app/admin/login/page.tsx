'use client'

import { useState } from 'react'
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
      setError(data.error ?? 'Error')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col" style={{background:'var(--app-bg)'}}>

      {/* ThemeToggle — esquina superior derecha */}
      <div style={{position:'fixed', top:12, right:16, zIndex:50}}>
        <ThemeToggle variant="admin" />
      </div>

      {/* Header celeste — igual que el dashboard */}
      <header style={{
        background: 'linear-gradient(135deg, #75AADB 0%, #0B1F47 100%)',
        boxShadow: '0 2px 16px rgba(11,31,71,.45)',
      }}>
        <div style={{height: 4, background: '#75AADB', opacity: .45}} />
        <div style={{
          maxWidth: 384, margin: '0 auto', padding: '14px 24px',
          display: 'flex', alignItems: 'center', gap: 10,
        }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/icon.svg" alt="" width={28} height={28} style={{filter:'drop-shadow(0 1px 4px rgba(0,0,0,.35))'}} />
          <div>
            <div style={{fontFamily:'var(--font-permanent-marker)', fontSize:'1rem', color:'#fff', lineHeight:1.1}}>
              Santi Barber
            </div>
            <div style={{fontFamily:'var(--font-anton)', fontSize:'0.5rem', letterSpacing:'0.2em', textTransform:'uppercase', color:'rgba(255,255,255,.6)', lineHeight:1, marginTop:2}}>
              PANEL ADMIN
            </div>
          </div>
        </div>
      </header>

      {/* Login card */}
      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm">

          {/* Stars */}
          <div style={{textAlign:'center', marginBottom:28}}>
            <div style={{fontSize:18, color:'var(--gold)', letterSpacing:10, marginBottom:10}}>★ ★ ★</div>
            <h1 style={{fontFamily:'var(--font-anton)', fontSize:'1.5rem', color:'var(--text)', letterSpacing:'.5px', margin:0}}>
              ACCESO ADMIN
            </h1>
            <p style={{fontSize:'0.65rem', letterSpacing:'0.18em', textTransform:'uppercase', color:'var(--text-mut)', marginTop:6}}>
              Edición Mundial 2026
            </p>
          </div>

          <div className="border rounded-2xl p-6" style={{background:'var(--surface)', borderColor:'var(--border)'}}>
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-xs uppercase tracking-widest mb-2" style={{color:'var(--text-mut)'}}>
                  Contraseña
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full rounded-xl px-4 py-3 text-sm border focus:outline-none transition-all"
                  style={{
                    background: 'var(--app-bg)',
                    borderColor: 'var(--border)',
                    color: 'var(--text)',
                  }}
                  required
                />
              </div>

              {error && <p className="text-red-400 text-sm">{error}</p>}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 rounded-xl text-sm font-bold tracking-widest uppercase transition-all"
                style={loading
                  ? {background:'var(--chip-bg)', color:'var(--text-mut)', cursor:'not-allowed'}
                  : {background:'linear-gradient(135deg, #75AADB, #0B1F47)', color:'#fff'}
                }
              >
                {loading ? 'Entrando…' : 'Entrar'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}
