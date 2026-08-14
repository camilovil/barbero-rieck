import Image from 'next/image'

/* El lockup es indivisible: la tijera está fusionada con la «b»,
   no se puede aislar. Por eso el header lleva el logotipo entero
   y el monograma «Hö» queda sólo para íconos.

   Sin conmutador de tema: la app del cliente es la cueva y nada más.
   El claro existe sólo en el panel, que tiene el suyo.

   `roca` prende la foto de marca detrás de la banda. Va sólo en la
   portada: el turno 8a la deja aparecer una vez y de ahí en adelante
   el fondo es negro plano. Cancelar y reprogramar no la llevan. */
export default function AppHeader({ roca = false }: { roca?: boolean }) {
  return (
    <header
      className={roca ? 'roca' : undefined}
      style={{
        /* La posición va en línea y no con las utilidades de Tailwind:
           `.roca` necesita `position: relative` para sus pseudos y, al
           ser una regla sin capa, le ganaba a `.fixed` —que vive en
           @layer utilities—. La cabecera se quedaba en el flujo, el
           bloque del flujo terminaba una cabecera más abajo y el CTA
           caía fuera de la pantalla. En línea gana siempre. */
        position: 'fixed',
        top: 0, left: 0, right: 0, zIndex: 50,
        /* Con la roca prendida el fondo lo pone `.roca`: acá tiene que
           quedar transparente o el color tapa la foto. */
        background: roca ? undefined : 'var(--surface)',
        borderBottom: '1px solid var(--border)',
      }}
    >
      <div
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
          maxWidth: 672, margin: '0 auto',
          padding: 'calc(env(safe-area-inset-top) + 16px) 18px 15px',
        }}
      >
        {/* Un solo logotipo, el blanco: acá no hay tema que conmutar,
            así que no hace falta el par con uno oculto. */}
        {/* 44px de área de toque, como todo control del sistema. Lo que
            crece es lo que se toca, no el logotipo: la caja se estira con
            inline-flex y el lockup sigue midiendo sus 148px. */}
        <a
          href="/"
          aria-label="Barber Höhle — inicio"
          style={{ display: 'inline-flex', alignItems: 'center', minHeight: 44, lineHeight: 0 }}
        >
          <Image
            src="/logo-white.png"
            alt=""
            width={1522}
            height={253}
            sizes="148px"
            priority
            style={{ width: 148, height: 'auto', display: 'block' }}
          />
        </a>
      </div>
    </header>
  )
}
