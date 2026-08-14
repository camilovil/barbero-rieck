/* De dónde sale la dirección pública del sitio, para todos los que la
   necesitan: los links de los mails y las etiquetas de OpenGraph.

   Vivía sólo adentro de lib/email.ts, mientras app/layout.tsx tenía el
   dominio escrito a mano en dos lugares. El día que se compre
   barber-hohle.com eso eran tres archivos y una lista de dónde buscar;
   ahora es una variable.

   El orden importa:
   1. APP_URL — el dominio de verdad. Es la única que hay que cargar.
   2. VERCEL_URL — la dirección de ESTE deploy, que Vercel pone sola.
      Sirve para que las previews de rama se enlacen a sí mismas y no a
      producción, pero cambia en cada deploy: no sirve como dominio
      canónico. Por eso APP_URL le gana.
   3. localhost — desarrollo.

   Se llama en el servidor. No usar desde un componente de cliente:
   process.env no existe ahí y devolvería localhost sin avisar. */
export function getAppUrl(): string {
  if (process.env.APP_URL) return process.env.APP_URL
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`
  return 'http://localhost:3000'
}
