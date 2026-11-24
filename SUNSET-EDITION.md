# Höhle · Sunset Edition

Propuesta temporal en la rama `codex/gta-vi-theme`. No está publicada.

## Alcance

- Portada: ilustración original de una barbería tropical al atardecer, titulares grandes, rosa, durazno, violeta y menta.
- Reserva: la misma paleta sobre controles existentes; panel ilustrado lateral en escritorio.
- Marca: se conserva el logo de Barber Höhle. No se incorporan logos, personajes, capturas ni recursos de GTA o Rockstar.
- Precios y horarios se leen de `lib/constants.ts`.
- La ilustración es ambiental y ficticia: no es una fotografía del local.

`SunsetTheme` usa un módulo CSS con tokens heredados exclusivamente dentro del contenedor de la portada y `/reservar`. No modifica las variables de `:root`, el CSS global, el panel administrativo ni las vistas de pago, cancelación, modificación o consulta de turnos.

No se modifican `BookingFlow`, los pasos de reserva, APIs, reglas de negocio, integraciones, configuración, dependencias ni variables de entorno.

## Revisar en local

`npm run dev -- --hostname 127.0.0.1`

Abrir http://127.0.0.1:3000. Usar la dirección IPv4 evita confundir esta app con otro servidor que esté escuchando en localhost por IPv6.

Para las verificaciones de interfaz se deshabilitaron Calendar y correo sólo en el proceso de prueba (`GOOGLE_CALENDAR_ID=''`, `GMAIL_USER=''`). No se editó `.env.local` ni se crearon reservas reales.

## Retirar la campaña

Revertir el commit de esta rama restaura la portada y el marco de reserva originales. La lógica de reservas permanece en sus archivos originales durante toda la campaña.

## Verificación

- `npm run check`: TypeScript sin errores, ESLint sin errores (9 avisos existentes), 72 pruebas aprobadas.
- `npm run build`: compilación de producción aprobada.
- Navegador sobre la versión compilada: escritorio 1280 × 720, tablet 768 × 1024, celular 390 × 844 y ancho mínimo 320 × 568; sin desborde horizontal en las pantallas verificadas.
- Recorrido local hasta el resumen: lugar, servicio, fecha, horario y datos ficticios; selección, avance y regreso conservan su funcionamiento. No se confirmó un turno real.
- Enlaces con modalidad y servicio: la raíz sigue redirigiendo al flujo con los pasos correspondientes preseleccionados.
- `/admin/login` conserva el acento dorado original y no tiene el contenedor de campaña.
- Contraste de tokens en superficies sólidas: texto principal 16,09:1, secundario 10,63:1, rótulos 7,06:1 y botón 10,45:1.

## Arte original

- Archivo de producción: `public/sunset-barbershop.webp`.
- Dimensiones: 1536 × 1024. Peso: 207.012 bytes.
- Generado con la herramienta integrada `imagegen`; convertido a WebP con Sharp.
- Referencias visuales: los cinco proyectos de Behance compartidos por el cliente, consultados como inspiración, sin reutilizar sus imágenes.

Prompt utilizado:

> Create an original cinematic wide landscape illustration, 3:2 aspect ratio, for the hero background of an Argentine barbershop website called Höhle, evoking a sun-drenched Miami art deco sunset and contemporary open world video game loading-screen art, but with no existing game characters or branded elements. View from across an empty quiet palm lined street toward a stylish small art deco barbershop occupying the RIGHT TWO THIRDS of the composition, frontal three-quarter angle, warm interior lit through large windows, visible elegant vintage barber chair, striped barber pole by entrance, pale peach stucco facade with rounded corners, subtle turquoise neon around window, tall graceful palm silhouettes behind shop. Layered purple mountains / low distant city, lavender indigo upper sky transitioning to rose pink, coral and apricot at horizon. LEFT THIRD should be darker open sky and street with very few details, reserved as negative space for website text overlay. Dusk foreground street in deep aubergine with warm reflections. Sophisticated hand-painted editorial digital illustration, realistic perspective, beautiful atmospheric depth, vivid but tasteful colors, filmic lighting, subtle fine film grain, rich shadows, clear shapes, no comic outlines. Full bleed, no borders, no collage, no people, no vehicles, NO WORDS, NO LETTERING, NO TEXT anywhere, NO logos, NO emblems, NO Roman numerals, no GTA logo, no Rockstar logo. This is original brand-neutral environment artwork only.
