'use client'

import { useEffect, useState } from 'react'

/* Conmutador papel / cueva. Vive SÓLO en el panel: la app del cliente
   es la cueva y no se conmuta. Acá existe porque Santiago trabaja con
   el local iluminado y a pleno sol el negro no se lee.

   Sin clase, el sistema es la cueva; `papel` es la variante. */
function aplicar(papel: boolean) {
  document.documentElement.classList.toggle('papel', papel)
}

export default function ThemeToggle() {
  const [papel, setPapel] = useState(false)

  useEffect(() => {
    const guardado = localStorage.getItem('hohle-theme') === 'papel'
    setPapel(guardado)
    aplicar(guardado)
    /* Al salir del panel el documento vuelve a la cueva: la clase vive
       en <html>, así que sin esto una navegación blanda a la portada
       se la llevaría puesta. */
    return () => aplicar(false)
  }, [])

  function toggle() {
    const next = !papel
    setPapel(next)
    localStorage.setItem('hohle-theme', next ? 'papel' : 'hohle')
    aplicar(next)
  }

  /* El toggle es el propio sistema en miniatura: un círculo partido,
     sin ícono ni color. */
  return (
    <button
      onClick={toggle}
      aria-label={papel ? 'Cambiar al tema Höhle, oscuro' : 'Cambiar al tema claro'}
      title={papel ? 'Höhle' : 'Papel'}
      style={{
        width: 32, height: 32, borderRadius: 2, flexShrink: 0,
        border: '1px solid var(--border-strong)',
        background: 'transparent',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        cursor: 'pointer',
        padding: 0,
        transition: 'border-color .18s',
      }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--text)' }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border-strong)' }}
    >
      <span
        aria-hidden
        style={{
          width: 14, height: 14, borderRadius: '50%',
          border: '1px solid var(--text)',
          background: 'linear-gradient(90deg, var(--text) 0 50%, transparent 50% 100%)',
          transform: papel ? 'rotate(180deg)' : 'none',
          transition: 'transform .3s ease',
        }}
      />
    </button>
  )
}
