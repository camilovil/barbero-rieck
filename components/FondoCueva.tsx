/* La roca detrás de toda la app del cliente, pedido del cliente para
   mobile y escritorio.

   Va fija: no scrollea con el contenido, así la cueva se queda quieta
   mientras el flujo pasa por delante. Y va con un velo pesado encima —
   más de lo que uno pondría mirando sólo la foto— porque no todo lo que
   queda arriba tiene superficie propia: la tarjeta del flujo es opaca y
   se defiende sola, pero el pie de «La casa» apoya directo acá y su
   texto es --text-meta, que es el tono más bajo del sistema. El velo se
   calibró contra el píxel más claro de la foto para que ese texto no
   baje de 4.5:1, no a ojo.

   Usa la imagen del splash y no la de la portada a propósito: en la
   primera visita ya se descargó para la apertura, así que acá no cuesta
   un byte más.

   No va en /admin. Ahí manda la regla de siempre: la herramienta de
   trabajo tiene fondo plano porque la foto compite con la lectura de la
   agenda, y además el panel se usa en papel a pleno sol. */
export default function FondoCueva() {
  return <div className="fondo-cueva" aria-hidden="true" />
}
