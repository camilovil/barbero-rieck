'use client'

import { useEffect, useState } from 'react'

/* Conmutador papel / cueva. Vive SÓLO en el panel: la app del cliente
   es la cueva y no se conmuta. Acá existe porque Santiago trabaja con
   el local iluminado y a pleno sol el negro no se lee.

   Sin clase, el sistema es la cueva; `papel` es la variante. */
function aplicar(papel: boolean) {
  document.documentElement.classList.toggle('papel', papel)
}

/* El panel monta DOS conmutadores —el de la barra lateral en PC y el
   de la cabecera en celular—, y sólo uno se ve por vez. El tema vive
   en <html>, así que el que está oculto igual tiene que enterarse:
   sin este aviso se quedaba dibujando el círculo al revés y aparecía
   mal al cruzar el corte de 1024px. */
const AVISO = 'hohle-theme-cambio'

export default function ThemeToggle() {
  const [papel, setPapel] = useState(false)

  useEffect(() => {
    const guardado = localStorage.getItem('hohle-theme') === 'papel'
    setPapel(guardado)
    aplicar(guardado)

    function sincronizar(e: Event) {
      setPapel((e as CustomEvent<boolean>).detail)
    }
    window.addEventListener(AVISO, sincronizar)

    /* Al salir del panel el documento vuelve a la cueva: la clase vive
       en <html>, así que sin esto una navegación blanda a la portada
       se la llevaría puesta. */
    return () => {
      window.removeEventListener(AVISO, sincronizar)
      aplicar(false)
    }
  }, [])

  function toggle() {
    const next = !papel
    localStorage.setItem('hohle-theme', next ? 'papel' : 'hohle')
    aplicar(next)
    // El aviso es síncrono: también actualiza a este mismo conmutador.
    window.dispatchEvent(new CustomEvent(AVISO, { detail: next }))
  }

  /* El toggle es el propio sistema en miniatura: un círculo partido,
     sin ícono ni color. */
  return (
    <button
      onClick={toggle}
      aria-label={papel ? 'Cambiar al tema Höhle, oscuro' : 'Cambiar al tema claro'}
      title={papel ? 'Höhle' : 'Papel'}
      style={{
        /* 44px de área de toque, como todo control del sistema. La caja
           visible sigue midiendo 32 —el recuadro se dibuja abajo, en el
           <span>—: se agranda lo que se toca, no lo que se ve. */
        width: 44, height: 44, flexShrink: 0,
        border: 'none',
        background: 'transparent',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        cursor: 'pointer',
        padding: 0,
        /* Compensa el crecimiento para que la caja visible siga alineada
           con el borde de la cabecera. */
        margin: '-6px',
      }}
      onMouseEnter={e => { (e.currentTarget.firstElementChild as HTMLElement).style.borderColor = 'var(--text)' }}
      onMouseLeave={e => { (e.currentTarget.firstElementChild as HTMLElement).style.borderColor = 'var(--border-strong)' }}
    >
      {/* La caja visible: 32px, la que dibuja el control. */}
      <span
        aria-hidden
        style={{
          width: 32, height: 32, borderRadius: 2,
          border: '1px solid var(--border-strong)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          transition: 'border-color .18s',
        }}
      >
        <span
          style={{
            width: 14, height: 14, borderRadius: '50%',
            border: '1px solid var(--text)',
            background: 'linear-gradient(90deg, var(--text) 0 50%, transparent 50% 100%)',
            transform: papel ? 'rotate(180deg)' : 'none',
            transition: 'transform .3s ease',
          }}
        />
      </span>
    </button>
  )
}
