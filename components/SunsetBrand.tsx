import Image from 'next/image'
import styles from './SunsetBrand.module.css'

/* Se conserva el dibujo de marca. La tinta degradada y la entrada se
   construyen encima de su transparencia, sin redibujar la tijera. */
export default function SunsetBrand({ intro = false, adaptToPaper = false }: { intro?: boolean; adaptToPaper?: boolean }) {
  return (
    <span className={`${styles.brand}${intro ? ` ${styles.intro}` : ''}${adaptToPaper ? ` ${styles.adaptive}` : ''}`} aria-hidden="true">
      {intro && <span className={styles.sun} />}
      <span className={styles.wordmark}>
        <Image src="/logo-white.png" alt="" width={1522} height={253} sizes={intro ? '(min-width: 720px) 440px, 78vw' : '180px'} preload />
        <span className={styles.ink} />
      </span>
      {intro && <span className={styles.caption}>Belgrano, Buenos Aires</span>}
    </span>
  )
}
