import Link from 'next/link'
import Image from 'next/image'
import { SERVICES, TIME_SLOTS } from '@/lib/constants'
import styles from './Portada.module.css'
import SunsetBrand from './SunsetBrand'

/* Portada de campaña. Precios y horarios vienen del catálogo real;
   todos los llamados a reservar abren el flujo existente. */
export default function Portada() {
  const servicios = [
    ...SERVICES.local.map(s => ({ ...s, donde: 'En el studio' })),
    ...SERVICES.domicilio.map(s => ({ ...s, donde: 'A domicilio' })),
  ]

  return (
    <main className={styles.home}>
      <section className={styles.hero} aria-labelledby="sunset-titulo">
        <Image className={styles.art} src="/sunset-barbershop.webp" alt="" fill sizes="100vw" preload />
        <div className={styles.scrim} aria-hidden="true" />

        <header className={styles.header}>
          <Link href="/" className={styles.brand} aria-label="Barber Höhle — inicio">
            <SunsetBrand />
          </Link>
          <nav className={styles.nav} aria-label="Navegación principal">
            <a href="#servicios" className={styles.navLink}>Servicios</a>
            <a href="#la-casa" className={styles.navLink}>La casa</a>
            <Link href="/reservar" className={styles.navCta}>Pedir turno</Link>
          </nav>
        </header>

        <div className={styles.heroBody}>
          <div className={styles.copy}>
            <h1 id="sunset-titulo" className={styles.title}>
              Nuevo look.<br />Misma<br /><span>esencia.</span>
            </h1>
            <p className={styles.description}>
              Elegí tu horario. Santiago se encarga del corte.
            </p>
            <Link href="/reservar" className={`btn-cta ${styles.cta}`}>
              Reservar mi turno
            </Link>
            <p className={styles.ctaNote}>Sin cuenta. Sin vueltas. A tu estilo.</p>
          </div>
          <div className={styles.sceneCaption}>
            <span className={styles.sceneLine} aria-hidden="true" />
            <span>Otro clima.<br /><b>La misma casa.</b></span>
          </div>
        </div>

        <div className={styles.heroFoot}>
          <span>Belgrano, Buenos Aires</span>
          <span className={styles.hours}>Lun – Sáb / {TIME_SLOTS.local[0]} – {TIME_SLOTS.local[TIME_SLOTS.local.length - 1]}</span>
          <a href="#servicios">Conocé los servicios</a>
        </div>
      </section>

      <div className={styles.strip} aria-hidden="true">
        <span>Buen corte. Buena vida.</span><i>✳</i><span>Barber Höhle</span><i>✳</i><span>Buen corte. Buena vida.</span><i>✳</i><span>Barber Höhle</span>
      </div>

      <section id="servicios" className={styles.services} aria-labelledby="servicios-titulo">
        <div className={styles.sectionHead}>
          <div>
            <p className={styles.sectionLabel}>Los servicios</p>
            <h2 id="servicios-titulo">Elegí tu próximo look.</h2>
          </div>
          <p>Corte, barba y buena mano.<br />En el studio o donde estés.</p>
        </div>
        <div className={styles.serviceGrid}>
          {servicios.map((servicio, i) => (
            <article className={styles.service} key={`${servicio.donde}-${servicio.name}`}>
              <div className={styles.serviceTop}>
                <span className={styles.serviceNumber}>0{i + 1}</span>
                <span className={styles.serviceLocation}>{servicio.donde}</span>
              </div>
              <h3>{servicio.name}</h3>
              <div className={styles.serviceBottom}>
                <span className={styles.price}>${servicio.price.toLocaleString('es-AR')}</span>
                <span className={styles.duration}>{servicio.duration} min</span>
              </div>
            </article>
          ))}
        </div>
        <div className={styles.servicesFoot}>
          <span>Tu estilo, en buenas manos.</span>
          <Link href="/reservar" className="btn-cta">Elegir mi turno</Link>
        </div>
      </section>
    </main>
  )
}
