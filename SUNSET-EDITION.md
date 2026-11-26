# Barber Höhle · Campaña temporal

Campaña temporal sobre la estética de la app de reservas.

## Cambios

Criterio visual del cliente: no usar emojis ni caracteres decorativos que
puedan convertirse en emojis en iOS. Los separadores son formas CSS.
El admin usa la misma marca renovada de la web, con tinta oscura en papel.
El sol y la leyenda del logo de apertura comparten el centro óptico de las
letras; la tijera que sobresale no desplaza la leyenda hacia la izquierda.

- Portada tropical con ilustración original, sin rótulos que expliquen la temática.
- Servicios en tarjetas simples sin fotografías ni ilustraciones.
- Botones sin flechas; navegación a Servicios y La casa con desplazamiento suave, salvo con movimiento reducido.
- Pie con dirección, Cómo llegar, Instagram, horarios y el portfolio https://camilovillanueva.com.
- Logo original con una única capa de tinta degradada; sin sombra duplicada. Apertura breve con sol a rayas y alternativa sin movimiento.
- Panel administrativo: botón Temática optativo. Guarda la preferencia y mantiene los temas claro y oscuro.
- Story de campaña: `assets/social/hohle-modo-gta-story.jpg`, 1080 × 1920.
- Logo animado reutilizable: `public/hohle-logo-animated.svg`.
- Favicons e íconos de instalación: monograma Hö con tinta rosa/durazno sobre violeta, incluidos ICO 16/32/48 y variante maskable con zona segura.
- Compartidos: `public/og-gta-v1.jpg`, 1200 × 630, reutiliza el arte y el logo originales; tipografía renderizada con Next ImageResponse.
- Exportación HD: `assets/social/hohle-modo-gta-story-hd.png`, 2160 × 3840, ampliada desde el PNG original, sin compresión destructiva JPEG.

## Actualización de íconos y compartidos

`node scripts/generate-gta-assets.mjs` regenera ICO, SVG, PNG de instalación y las dos versiones de Open Graph. La URL activa de compartido y las URLs de íconos están versionadas para no reutilizar las de la campaña anterior. No cambia el ID, la URL de inicio ni el funcionamiento de las apps instaladas.

Para exportar de nuevo la story HD, pasar como primer argumento el PNG fuente aprobado. La exportación amplía y guarda la imagen en PNG; no agrega detalle nativo a la ilustración original.

### Edición final de la story

Se retiró el rótulo de la web, metadatos y story. Edición realizada con la herramienta integrada imagegen y este prompt:

> Edit this existing Instagram Story poster with an extremely minimal localized change: REMOVE ONLY the small words 'Modo GTA' underneath the 'barber Höhle' logo. Seamlessly fill that caption's area with the identical surrounding dark plum-purple background. Keep the existing Höhle logo, its scissors motif, all other lettering, font sizes, positions, colors, layout, palm trees, sky, barbershop illustration, lighting, bottom call to action, URL 'barberhohle.com', and 'Belgrano, Buenos Aires' exactly as they are. The headline must remain 'NUEVO LOOK. MISMA ESENCIA.'. Do not add any replacement caption or any new elements. Do not rebrand, redesign, recompose, restyle, or move anything. Preserve the vertical 9:16 ratio and as much original detail as possible. The only visual difference must be that the small 'Modo GTA' caption no longer exists.

## Aislamiento

La paleta se define una sola vez en `app/gta-palette.css`. La usan el contenedor `gta-palette` en portada/reserva/pago y, sólo al activarlo, `html.modo-gta` en el panel. El tema del panel se limpia al salir.

La pantalla `/pago` comparte el logo degradado, fondo tropical y paleta de la campaña en todos sus estados: carga, seña pendiente, confirmación, vencimiento y error. Su tarjeta y botones se presentan con CSS local; no cambia la consulta del pago, los datos de transferencia, el portapapeles ni el enlace al comprobante.

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
