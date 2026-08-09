/* Service worker mínimo.
 *
 * Sólo hace una cosa: cuando falla la navegación, muestra una página
 * offline autocontenida. NO cachea el HTML de la app.
 *
 * La versión anterior guardaba `/` y lo servía como fallback. El problema
 * es que ese HTML viene de un deploy viejo y apunta a chunks de JS y CSS
 * con hash que ya no existen: la página aparecía sin estilos y con
 * contenido de hace varios deploys. Un shell cacheado no sirve para una
 * app cuya pantalla principal son horarios en vivo.
 */
/* v5 — offline.html pasó a la cueva. Hay que bumpear el nombre en
   cada cambio de esa página: si no, las instalaciones existentes
   siguen sirviendo la versión vieja que quedó cacheada. */
const CACHE = 'barber-hohle-v5'
const OFFLINE = '/offline.html'

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE)
      .then(c => c.add(OFFLINE))
      .then(() => self.skipWaiting())
  )
})

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  )
})

self.addEventListener('fetch', e => {
  if (e.request.mode !== 'navigate') return

  e.respondWith(
    fetch(e.request).catch(() =>
      caches.match(OFFLINE).then(r => r ?? new Response(
        'Sin conexión.',
        { headers: { 'Content-Type': 'text/plain; charset=utf-8' } }
      ))
    )
  )
})
