'use client'

import { useEffect, useState } from 'react'

/* Conmutador papel / cueva. Vive SÓLO en el panel: la app del cliente
   es la cueva y no se conmuta. Acá existe porque Santiago trabaja con
   el local iluminado y a pleno sol el negro no se lee.

   Sin clase, el sistema es la cueva; `papel` es la variante. */
function aplicar(papel: boolean, gta: boolean) {
  document.documentElement.classList.toggle('papel', papel && !gta)
  document.documentElement.classList.toggle('modo-gta', gta)
}

/* El panel monta DOS conmutadores —el de la barra lateral en PC y el
   de la cabecera en celular—, y sólo uno se ve por vez. El tema vive
   en <html>, así que el que está oculto igual tiene que enterarse:
   sin este aviso se quedaba dibujando el círculo al revés y aparecía
   mal al cruzar el corte de 1024px. */
const AVISO = 'hohle-theme-cambio'

export default function ThemeToggle() {
  const [papel, setPapel] = useState(false)
  const [gta, setGta] = useState(false)

  useEffect(() => {
    const guardado = localStorage.getItem('hohle-theme') === 'papel'
    const guardadoGta = localStorage.getItem('hohle-gta') === '1'
    setPapel(guardado)
    setGta(guardadoGta)
    aplicar(guardado, guardadoGta)

    function sincronizar(e: Event) {
      const tema = (e as CustomEvent<{ papel: boolean; gta: boolean }>).detail
      setPapel(tema.papel)
      setGta(tema.gta)
    }
    window.addEventListener(AVISO, sincronizar)

    /* Al salir del panel el documento vuelve a la cueva: la clase vive
       en <html>, así que sin esto una navegación blanda a la portada
       se la llevaría puesta. */
    return () => {
      window.removeEventListener(AVISO, sincronizar)
      aplicar(false, false)
    }
  }, [])

  function toggle() {
    const next = gta || !papel
    localStorage.setItem('hohle-theme', next ? 'papel' : 'hohle')
    localStorage.setItem('hohle-gta', '0')
    aplicar(next, false)
    // El aviso es síncrono: también actualiza a este mismo conmutador.
    window.dispatchEvent(new CustomEvent(AVISO, { detail: { papel: next, gta: false } }))
  }

  function toggleGta() {
    const next = !gta
    localStorage.setItem('hohle-gta', next ? '1' : '0')
    aplicar(papel, next)
    window.dispatchEvent(new CustomEvent(AVISO, { detail: { papel, gta: next } }))
  }

  /* El toggle es el propio sistema en miniatura: un círculo partido,
     sin ícono ni color. */
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
    <button
      type="button"
      onClick={toggleGta}
      aria-pressed={gta}
      aria-label={gta ? 'Desactivar temática especial' : 'Activar temática especial'}
      style={{
        minHeight: 44, padding: '0 12px', borderRadius: 4,
        border: '1px solid var(--border-strong)',
        background: gta ? 'var(--acento)' : 'transparent',
        color: gta ? 'var(--on-acento)' : 'var(--text)',
        fontFamily: 'var(--font-sans)', fontSize: 11, fontWeight: 600,
      }}
    >
      Temática
    </button>
    <button
      type="button"
      onClick={toggle}
      aria-label={papel && !gta ? 'Cambiar al tema Höhle, oscuro' : 'Cambiar al tema claro'}
      title={papel && !gta ? 'Höhle' : 'Papel'}
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
            transform: papel && !gta ? 'rotate(180deg)' : 'none',
            transition: 'transform .3s ease',
          }}
        />
      </span>
    </button>
    </span>
  )
}
