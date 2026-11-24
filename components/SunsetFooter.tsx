import SunsetBrand from './SunsetBrand'
import { BARBER_ADDRESS, BARBER_NAME, INSTAGRAM_HANDLE, INSTAGRAM_URL, TIME_SLOTS } from '@/lib/constants'
import styles from './SunsetFooter.module.css'

function range(slots: string[]) {
  return `${slots[0]} – ${slots[slots.length - 1]}`
}

export default function SunsetFooter() {
  return (
    <footer id="la-casa" className={styles.footer}>
      <div className={styles.inner}>
        <div className={styles.main}>
          <div className={styles.welcome}>
            <span className={styles.label}>La casa</span>
            <h2>Nos vemos <br />en <span>Belgrano.</span></h2>
            <p>Con {BARBER_NAME}.</p>
          </div>
          <div className={styles.contact}>
            <h3 className={styles.label}>Dónde estamos</h3>
            <address>{BARBER_ADDRESS}</address>
            <a className={styles.mapLink} href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(BARBER_ADDRESS)}`} target="_blank" rel="noopener noreferrer" aria-label="Cómo llegar a Barber Höhle, se abre Google Maps en una pestaña nueva">Cómo llegar</a>
            <a className={styles.instagram} href={INSTAGRAM_URL} target="_blank" rel="noopener noreferrer" aria-label={`Instagram de Barber Höhle, ${INSTAGRAM_HANDLE}, se abre en una pestaña nueva`}>
              <span>Seguinos en Instagram</span>
              <b>{INSTAGRAM_HANDLE}</b>
            </a>
          </div>
          <div className={styles.schedule}>
            <h3 className={styles.label}>Horarios</h3>
            <dl>
              <div><dt>Lun – Sáb · studio</dt><dd>{range(TIME_SLOTS.local)}</dd></div>
              <div><dt>Lun – Sáb · domicilio</dt><dd>{range(TIME_SLOTS.domicilio)}</dd></div>
              <div><dt>Domingos</dt><dd>Cerrado</dd></div>
            </dl>
          </div>
        </div>
        <div className={styles.bottom}>
          <SunsetBrand />
          <span>© {new Date().getFullYear()} {BARBER_NAME}</span>
          <a className={styles.credit} href="https://camilovillanueva.com" target="_blank" rel="noopener noreferrer" aria-label="Portfolio de Camilo Villanueva, se abre en una pestaña nueva">Desarrollado por <span>Camilo Villanueva</span></a>
        </div>
      </div>
    </footer>
  )
}
