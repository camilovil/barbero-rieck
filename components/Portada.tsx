import { Fragment } from 'react'
import Image from 'next/image'
import { CASA_KICKER, CASA_META, SERVICES, TIME_SLOTS } from '@/lib/constants'

/* La puerta de entrada. Una sola pantalla, un solo botón: pedir turno.
   Todo lo demás —precios, horarios, dirección— es referencia y va
   abajo o al costado, nunca compitiendo con el botón.

   Tres anchos, un solo plano: en celular el lockup manda y el hero se
   ancla al pie; de 720 aparece el titular; de 1200 entra la barra de
   arriba y los precios pasan a una columna al costado. Lo que cambia
   es la disposición, no el contenido.

   El diseño dibuja además una barra con SERVICIOS, LA BARBERÍA y MIS
   TURNOS. Sólo queda «La casa», que existe como sección de esta misma
   página: las otras dos no son pantallas de esta app y no se crean
   links muertos —el mismo criterio que se usó para la barra lateral
   del panel—. */
export default function Portada() {
  const precios = [
    ...SERVICES.local.map(s => ({ ...s, donde: 'en el studio' })),
    ...SERVICES.domicilio.map(s => ({ ...s, donde: 'a domicilio' })),
  ]

  return (
    <div className="portada">
      {/* Sólo de 1200 para arriba. En anchos chicos el lockup del hero
          hace este trabajo y una barra más sería repetirlo. */}
      <div className="portada-barra">
        <a href="/" aria-label="Barber Höhle — inicio" style={{ display: 'block', lineHeight: 0 }}>
          <Image
            className="portada-barra-logo portada-marca"
            src="/logo-white.png"
            alt=""
            width={1522}
            height={253}
            sizes="186px"
            priority
          />
        </a>
        <nav className="portada-nav">
          <a href="#la-casa">La casa</a>
          <a className="btn-cta" href="/reservar">Pedir turno</a>
        </nav>
      </div>

      <div className="portada-hero">
        <div>
          <Image
            className="portada-logo portada-marca"
            src="/logo-white.png"
            alt=""
            width={1522}
            height={253}
            sizes="(min-width: 720px) 186px, 150px"
            priority
          />
          <p className="portada-kicker">{CASA_KICKER}</p>

          {/* El h1 de la página. En celular se esconde a la vista pero
              se sigue leyendo: ahí el que dice la marca es el lockup,
              que va con alt vacío por ser decorativo. */}
          <h1 className="portada-titular font-display">
            Un solo<br />sillón.
          </h1>

          <p className="portada-bajada">
            Reservá en menos de un minuto. Elegís servicio, horario y listo.
          </p>

          <a className="btn-cta portada-cta" href="/reservar">Pedir turno</a>

          {/* Los separadores son hermanos de los datos, no parte de
              ellos: el aire lo pone el `gap` del flex y meter además un
              espacio adentro del span lo descompensa de un lado. */}
          <p className="portada-meta">
            {CASA_META.map((dato, i) => (
              <Fragment key={dato}>
                {i > 0 && <i aria-hidden="true">·</i>}
                <span>{dato}</span>
              </Fragment>
            ))}
          </p>
        </div>

        {/* La columna de precios existe sólo de 1200 para arriba, donde
            sobra ancho. Abajo de eso los precios están en el paso 2 del
            flujo, que es donde se eligen. */}
        <div className="portada-precios">
          <h2 className="rotulo rotulo-rule">Precios</h2>
          {precios.map(s => (
            <div className="portada-precio" key={`${s.donde}-${s.name}`}>
              <span className="portada-precio-n">
                {s.name} <span style={{ color: 'var(--text-meta)' }}>· {s.donde}</span>
              </span>
              <span className="portada-precio-v">${s.price.toLocaleString('es-AR')}</span>
            </div>
          ))}
          <p className="portada-horario">
            Lun – Sáb · {TIME_SLOTS.local[0]} – {TIME_SLOTS.local[TIME_SLOTS.local.length - 1]}
            <br />
            Domingos cerrado
          </p>
        </div>
      </div>
    </div>
  )
}
