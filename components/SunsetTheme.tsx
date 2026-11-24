import styles from './SunsetTheme.module.css'

/* Piel temporal de portada y reserva. Los tokens se heredan sólo dentro
   de este contenedor; el panel y las vistas de turnos conservan su tema. */
export default function SunsetTheme({ children }: { children: React.ReactNode }) {
  return <div className={`${styles.theme} gta-palette`}>{children}</div>
}
