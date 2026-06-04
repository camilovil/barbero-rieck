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
    <div className="min-h-screen bg-[#1a1a1a] flex flex-col items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <div className="text-center mb-10">
          <span className="text-3xl">✂️</span>
          <h1 className="font-playfair text-2xl text-[#f5f0e8] mt-3">Panel de administración</h1>
          <p className="text-[#f5f0e8]/40 text-sm mt-1">Barbería Rieck</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs uppercase tracking-widest text-[#f5f0e8]/40 mb-2">
              Contraseña
            </label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full bg-[#222] border border-[#3a3a3a] rounded-lg px-4 py-3 text-[#f5f0e8] text-sm placeholder:text-[#f5f0e8]/20 focus:outline-none focus:border-[#f5f0e8]/30 transition-all"
              required
            />
          </div>

          {error && (
            <p className="text-red-400 text-sm">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className={`w-full py-3 rounded-xl text-sm font-semibold tracking-wide uppercase transition-all
              ${loading
                ? 'bg-[#2e2e2e] text-[#f5f0e8]/30 cursor-not-allowed'
                : 'bg-[#f5f0e8] text-[#1a1a1a] hover:bg-white'
              }`}
          >
            {loading ? 'Entrando...' : 'Entrar'}
          </button>
        </form>
      </div>
    </div>
  )
}
