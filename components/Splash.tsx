'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'

/* La apertura. Un filo de oro cruza la pantalla y descubre el logotipo
   a su paso; al salir por el borde derecho entra el pie y la capa se
   abre en escala para entregar la portada.

   Dura 1,75 s y NO espera nada: la portada ya está renderizada abajo.
   Si esto alguna vez agrega espera real, está mal implementado.

   Quién decide si se ve: el script de <head>, que corre antes del
   primer paint y deja `data-apertura="espera"` en el <html> sólo la
   primera vez de cada sesión. Sin ese atributo el CSS mantiene la capa
   en display:none, así que ni el HTML del servidor ni una vuelta atrás
   del navegador la hacen destellar. */

const PASOS = { revela: 80, apaga: 760, entrega: 1250, fin: 1750 }
/* Con movimiento reducido no hay pasada: el logo ya está, se muestra
   el pie y se entrega. El resto del sistema apaga las transiciones por
   CSS, así que acá lo único que hay que acortar son los tiempos. */
const PASOS_QUIETOS = { revela: 0, apaga: 0, entrega: 260, fin: 400 }

export default function Splash({ pie }: { pie: string }) {
  const [fase, setFase] = useState<'quieta' | 'revelada' | 'apagada' | 'sale'>('quieta')
  const [fuera, setFuera] = useState(false)

  useEffect(() => {
    const html = document.documentElement
    // El script de <head> es el único que decide. Si no dejó la marca,
    // esta sesión ya vio la apertura y acá no hay nada que hacer.
    if (html.dataset.apertura !== 'espera') return

    const t = window.matchMedia('(prefers-reduced-motion: reduce)').matches
      ? PASOS_QUIETOS
      : PASOS

    /* La portada se pide ya, en paralelo con la animación: para cuando
       la capa se abra, la foto tiene que estar. */
    new window.Image().src = '/portada-cueva.webp'

    const previo = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    let entregado = false
    function entregar() {
      if (entregado) return
      entregado = true
      html.dataset.apertura = 'entra'
      setFase('sale')
    }

    const timers = [
      window.setTimeout(() => setFase('revelada'), t.revela),
      window.setTimeout(() => setFase('apagada'), t.apaga),
      window.setTimeout(entregar, t.entrega),
      window.setTimeout(() => {
        setFuera(true)
        document.body.style.overflow = previo
      }, t.fin),
      /* Red de seguridad: si algo se traba, la portada se entrega igual
         a los 2 s. La apertura nunca puede dejar a alguien mirando una
         pantalla que no avanza. */
      window.setTimeout(entregar, 2000),
    ]

    return () => {
      timers.forEach(clearTimeout)
      document.body.style.overflow = previo
    }
  }, [])

  if (fuera) return null

  const revelado = fase === 'revelada' || fase === 'apagada' || fase === 'sale'
  const apagada = fase === 'apagada' || fase === 'sale'

  return (
    <div
      className="splash"
      aria-hidden="true"
      data-revelado={revelado ? '1' : '0'}
      data-apagada={apagada ? '1' : '0'}
      data-sale={fase === 'sale' ? '1' : '0'}
    >
      <div className="splash-caja">
        <Image
          className="splash-logo"
          src="/logo-white.png"
          alt=""
          width={1522}
          height={253}
          sizes="(min-width: 1200px) 420px, (min-width: 720px) 340px, 250px"
          priority
        />
      </div>
      <div className="navaja" />
      <p className="splash-pie">{pie}</p>
    </div>
  )
}
