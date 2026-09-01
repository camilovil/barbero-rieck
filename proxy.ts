import { NextRequest, NextResponse } from 'next/server'
import { isComingSoon } from '@/lib/flags'

/* Esto era middleware.ts. Next 16 renombró la convención a «proxy» —misma
   función, mismo matcher, sólo cambia el nombre del archivo y el de la
   export— y dejaba un aviso de deprecación en cada arranque del server.

   Hace dos cosas, y las dos son la única línea de defensa de lo suyo:

   1. Protege el panel. Sin esto, /admin y /api/admin quedan abiertos.
   2. Cierra la puerta cuando COMING_SOON está prendido: nadie reserva
      hasta que la seña esté probada. */

/** La sesión del panel. Es el mismo chequeo para las dos cosas: quien
    entra al panel es de la casa, y a la casa no se le muestra el cartel
    de próximamente sino el sitio de verdad. */
function esDeLaCasa(req: NextRequest): boolean {
  const token = req.cookies.get('admin_token')?.value
  const secret = process.env.ADMIN_SECRET
  return Boolean(token && secret && token === secret)
}

export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl

  if (pathname.startsWith('/admin') || pathname.startsWith('/api/admin')) {
    // El login no se protege a sí mismo, ni la página ni su API.
    if (pathname === '/admin/login' || pathname === '/api/admin/login') {
      return NextResponse.next()
    }

    if (!esDeLaCasa(req)) {
      // Las rutas API devuelven 401 JSON, las páginas redirigen al login
      if (pathname.startsWith('/api/')) {
        return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
      }
      return NextResponse.redirect(new URL('/admin/login', req.url))
    }

    return NextResponse.next()
  }

  /* De acá para abajo, la puerta. Sin el interruptor no pasa nada: el
     matcher hace que esta función corra igual sobre la portada, pero se
     va por esta línea y la web funciona como siempre. */
  if (!isComingSoon() || esDeLaCasa(req)) return NextResponse.next()

  /* La ruta que crea el turno se corta acá y no en la página, porque el
     cartel es una pantalla y una pantalla no detiene a nadie que le pegue
     directo a la API. Es la única que escribe en la agenda. */
  if (pathname === '/api/booking') {
    return NextResponse.json(
      { error: 'Todavía no estamos tomando turnos online.' },
      { status: 503 },
    )
  }

  /* Redirección y no rewrite, aunque el rewrite dejaría la URL linda: el
     script de apertura del layout cuelga de que el pathname sea «/» y con
     un rewrite dejaría el cartel invisible dos segundos y medio esperando
     una animación que en esta pantalla no existe.

     Es temporal (307) a propósito. Una permanente se le queda cacheada al
     navegador y el día que abramos, el que ya entró sigue viendo el
     cartel. */
  return NextResponse.redirect(new URL('/proximamente', req.url))
}

export const config = {
  /* Sólo la puerta de entrada y lo que reserva. /turno, /modificar y
     /cancelar quedan afuera a propósito: el que ya tiene un turno y su
     link en el mail lo tiene que poder ver, mover o cancelar igual. */
  matcher: ['/admin/:path*', '/api/admin/:path*', '/', '/reservar', '/api/booking'],
}
