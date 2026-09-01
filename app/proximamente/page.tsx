import Image from 'next/image'
import { Fragment } from 'react'
import FondoCueva from '@/components/FondoCueva'
import PieDeLaCasa from '@/components/PieDeLaCasa'
import { CASA_KICKER, CASA_META, INSTAGRAM_URL } from '@/lib/constants'

/* El cartel de próximamente. Es la puerta de entrada mientras
   COMING_SOON esté prendido: el proxy trae acá todo lo que sea reservar.

   Es la portada con el botón de reservar cambiado, no una pantalla
   aparte: mismo lockup, mismo kicker, mismos datos de la casa abajo.
   Quien caiga acá tiene que reconocer la barbería, no toparse con una
   obra en construcción.

   No hay ningún «avisame cuando abra»: no hay dónde guardar un mail, y
   prometer un aviso que nadie va a mandar es peor que no prometer nada.
   Los dos canales que sí existen y sí contestan son el WhatsApp y el
   Instagram, así que la pantalla ofrece esos. */
export const metadata = {
  title: 'Barber Höhle · Próximamente',
  description: 'Estamos por abrir los turnos online. Mientras tanto, escribinos por WhatsApp o Instagram.',
  /* Que no lo indexe mientras esté cerrado: si Google guarda esta
     pantalla como la cara del sitio, el día que abra sigue mostrando
     «próximamente» en los resultados por un buen rato. */
  robots: { index: false, follow: false },
}

export default function Proximamente() {
  /* El mismo número que ya viaja a la descripción del evento y a la
     pantalla de modificar. Si no está cargado, el botón no se dibuja:
     un link a wa.me sin número es una pantalla de error de WhatsApp. */
  const wa = (process.env.SANTIAGO_WHATSAPP ?? '').replace(/\D/g, '')
  const waHref = `https://wa.me/${wa}?text=${encodeURIComponent('Hola! Quería sacar un turno.')}`

  return (
    <>
      <FondoCueva />
      <main className="portada">
        <div className="portada-hero proximamente-hero">
          <div>
            <Image
              className="portada-logo portada-marca"
              src="/logo-white.png"
              alt="Barber Höhle"
              width={1522}
              height={253}
              sizes="(min-width: 720px) 186px, 150px"
              priority
            />
            <p className="portada-kicker">{CASA_KICKER}</p>

            {/* En la portada este h1 se esconde a la vista porque el lockup
                hace de titular. Acá no: la palabra es el mensaje. */}
            <h1 className="portada-titular proximamente-titular font-display">
              Próximamente
            </h1>

            <p className="portada-bajada">
              Estamos terminando de poner a punto los turnos online. En unos días
              vas a poder reservar desde acá. Mientras tanto, escribinos y te
              damos turno.
            </p>

            {/* WhatsApp primero y en oro: es donde Santiago contesta y donde
                se saca el turno hoy. El Instagram va en segundo plano, que
                es lo que es mientras la web esté cerrada. */}
            <div className="proximamente-acciones">
              {wa && (
                <a className="btn-cta" href={waHref} target="_blank" rel="noopener noreferrer">
                  Escribinos por WhatsApp
                </a>
              )}
              <a className="btn-outline" href={INSTAGRAM_URL} target="_blank" rel="noopener noreferrer">
                Instagram
              </a>
            </div>

            <p className="portada-meta">
              {CASA_META.map((dato, i) => (
                <Fragment key={dato}>
                  {i > 0 && <i aria-hidden="true">·</i>}
                  <span>{dato}</span>
                </Fragment>
              ))}
            </p>
          </div>
        </div>
      </main>
      <PieDeLaCasa />
    </>
  )
}
