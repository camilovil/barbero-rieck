const CACHE = 'barberia-rieck-v1'

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(['/'])).then(() => self.skipWaiting())
  )
})

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  )
})

// Network first, fallback to cache para navegación
self.addEventListener('fetch', e => {
  if (e.request.mode !== 'navigate') return

  e.respondWith(
    fetch(e.request)
      .catch(() => caches.match('/') ?? new Response('Sin conexión — abrí la app con internet primero.', {
        headers: { 'Content-Type': 'text/plain; charset=utf-8' }
      }))
  )
})
