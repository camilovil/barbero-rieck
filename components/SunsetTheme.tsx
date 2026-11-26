import styles from './SunsetTheme.module.css'

/* Piel temporal de portada, reserva y pago. Los tokens se heredan sólo
   dentro de este contenedor; el panel conserva su tema optativo. */
export default function SunsetTheme({ children }: { children: React.ReactNode }) {
  return <div className={`${styles.theme} gta-palette`}>{children}</div>
}
