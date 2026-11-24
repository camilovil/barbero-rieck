# Höhle · Modo GTA

Campaña temporal sobre la estética de la app de reservas.

## Cambios

- Portada tropical con ilustración original y rótulo discreto «Modo GTA».
- Servicios en tarjetas simples sin fotografías ni ilustraciones.
- Botones sin flechas; navegación a Servicios y La casa con desplazamiento suave, salvo con movimiento reducido.
- Pie con dirección, Cómo llegar, Instagram, horarios y el portfolio https://camilovillanueva.com.
- Logo original con una única capa de tinta degradada; sin sombra duplicada. Apertura breve con sol a rayas y alternativa sin movimiento.
- Panel administrativo: botón Modo GTA optativo. Guarda la preferencia y mantiene los temas claro y oscuro.
- Story de campaña: `assets/social/hohle-modo-gta-story.jpg`, 1080 × 1920.
- Logo animado reutilizable: `public/hohle-logo-animated.svg`.

## Aislamiento

La paleta se define una sola vez en `app/gta-palette.css`. La usan el contenedor `gta-palette` en portada/reserva y, sólo al activarlo, `html.modo-gta` en el panel. El tema del panel se limpia al salir.

El estado del turno, catálogo, precios, horarios, pagos, APIs, reglas de negocio, integraciones, dependencias y credenciales no se modifican. Los precios y horarios visibles siguen leyendo `lib/constants.ts`.

## Pendiente: volver a la estética anterior

**Estado: pendiente, a pedido del cliente. Sin fecha y sin reversión automática.**

El usuario avisará cuándo retirarla. La versión previa está en el commit `2dbd8b1`, conservado mediante la etiqueta `pre-gta-theme-2026-11-24`.

Al retirarla, revertir los commits visuales de esta campaña o restaurar selectivamente sus archivos. **No hacer un reset general de master**, porque puede haber cambios posteriores que deban conservarse. No tocar reservas, calendario, pagos ni datos del negocio. Revisar con el usuario si quiere mantener el tema GTA optativo del admin.

## Verificación

- `npm run check`: TypeScript y ESLint sin errores; pruebas del proyecto aprobadas.
- `npm run build`: compilación de producción aprobada.
- Navegador local: flujo de reserva, tarjetas sin imágenes, pie y enlaces, logo sin doble capa, tema GTA del admin, persistencia al recargar y regreso al tema claro.
- Pruebas del admin con credenciales exclusivas del proceso local, Calendar y correo desactivados; no se editó `.env.local` ni se crearon turnos reales.
- Las preferencias de tema no alteran permisos ni autenticación.

## Arte original

La ilustración del hero es ambiental y ficticia; no es una foto del local. Se conserva el logo y la tijera originales de Höhle. No se usan logos, personajes ni imágenes de GTA/Rockstar.

- Hero: `public/sunset-barbershop.webp`, 1536 × 1024, 207.012 bytes.
- Story: `assets/social/hohle-modo-gta-story.jpg`, 1080 × 1920.
- Herramienta integrada `imagegen`; WebP y formato final de story optimizados con Sharp.
- Referencias: los cinco proyectos de Behance compartidos por el usuario, sin reutilizar sus imágenes.

### Prompt del hero

> Create an original cinematic wide landscape illustration, 3:2 aspect ratio, for the hero background of an Argentine barbershop website called Höhle, evoking a sun-drenched Miami art deco sunset and contemporary open world video game loading-screen art, but with no existing game characters or branded elements. View from across an empty quiet palm lined street toward a stylish small art deco barbershop occupying the RIGHT TWO THIRDS of the composition, frontal three-quarter angle, warm interior lit through large windows, visible elegant vintage barber chair, striped barber pole by entrance, pale peach stucco facade with rounded corners, subtle turquoise neon around window, tall graceful palm silhouettes behind shop. Layered purple mountains / low distant city, lavender indigo upper sky transitioning to rose pink, coral and apricot at horizon. LEFT THIRD should be darker open sky and street with very few details, reserved as negative space for website text overlay. Dusk foreground street in deep aubergine with warm reflections. Sophisticated hand-painted editorial digital illustration, realistic perspective, beautiful atmospheric depth, vivid but tasteful colors, filmic lighting, subtle fine film grain, rich shadows, clear shapes, no comic outlines. Full bleed, no borders, no collage, no people, no vehicles, NO WORDS, NO LETTERING, NO TEXT anywhere, NO logos, NO emblems, NO Roman numerals, no GTA logo, no Rockstar logo. This is original brand-neutral environment artwork only.

### Prompt de la story

> Design a finished premium Instagram Story poster for the Argentine barbershop BARBER HÖHLE. Vertical 9:16, target 1080 x 1920. Use reference image 1 as the exact visual world: original illustrated art-deco barbershop, purple and rose Miami sunset, palms, apricot shop facade and mint window light. Recompose beautifully for vertical; preserve this illustration's design and atmosphere, no extra people, no cars, NO scissors/clippers still-life. Use reference image 2 as the business logo, preserve its exact spelling, scissors motif and proportions: 'barber Höhle'. Place this logo cleanly in cream white in the upper safe area. Typography editorial, heavy clean geometric sans, generous negative space, crisp sophisticated hierarchy, deep plum scrim for readability. Exact text only: small discreet 'Modo GTA' below logo; large hero headline on three stacked lines 'NUEVO LOOK.' / 'MISMA' / 'ESENCIA.' with the last line pink and others warm cream. Place headline in upper-middle so lower half shows the beautiful tropical shop. Near the lower safe area: 'Reservá tu turno' as clear modest centered call to action; below it 'barberhohle.com' in larger clear lettering. Tiny supporting line 'Belgrano, Buenos Aires'. Keep all text and logo 90px from side edges, at least 220px from top and bottom. No other words, no fake UI, no fake link sticker, no arrows, no stars, no status badges, no decorative border, no brand logos besides Höhle, no Rockstar, no Grand Theft Auto logo, no VI emblem. This is an original Höhle campaign alluding to the tropical video game aesthetic, not an official game poster. Designed, understated, confident; no generic futuristic AI neon gadgets.
