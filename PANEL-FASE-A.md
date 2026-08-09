# Panel admin — Fase A: el armazón

Documento de trabajo. **Borrar cuando la fase esté terminada.**

## Qué hay que hacer

Llevar `app/admin/AdminDashboard.tsx` al plano que dibuja el sistema de
diseño, sin agregar funcionalidad nueva. Sólo estructura, con los datos
que el modelo ya tiene.

Fuente de verdad: el archivo de diseño de Claude Design, turnos **7b**
(el panel en PC) y **8b** (el panel en celular). El handoff está en
`Sistema de diseño para barbería-handoff.zip`.

- **PC (≥1024px):** tres columnas — barra lateral 196px, agenda, detalle 366px.
- **Celular:** una columna, con las pestañas abajo al alcance del pulgar.

## Lo que YA está hecho y probado

El armazón CSS está en `app/globals.css`, sección `PANEL — el armazón`,
y compila. **Todavía no lo usa nadie: ese es justamente el trabajo.**

| Clase | Para qué |
|---|---|
| `.panel` | La grilla. Una columna en celular, tres en ≥1024px, cada una con su propio scroll. |
| `.panel-lateral` | Barra lateral. Oculta abajo de 1024px. |
| `.panel-nav` | La navegación. El ítem abierto usa `aria-current="page"` y se enciende con el filete vivo. |
| `.panel-detalle` | Columna del detalle. Oculta abajo de 1024px. |
| `.panel-tabs` | Pestañas de celular. Ocultas en ≥1024px. `aria-current="page"` para la activa. |

También se agregó el token `--surface-baja` (cueva `#050403`, papel
`#E4E3DE`): es la barra lateral, que en el diseño se hunde un paso por
debajo del fondo en vez de levantarse.

El corte va en **1024px y no en 640**: abajo de eso las tres columnas
dejan la agenda en ~300px y la tabla no entra.

## Lo que ya existe en el componente y hay que reubicar, no reescribir

Buscar los marcadores `{/* ─── … ─── */}` en el archivo:

| Sección | Va a |
|---|---|
| Cabecera | Se disuelve: el logo y la sesión pasan a `.panel-lateral`; en celular queda una cabecera mínima. |
| Cifras | Encabezado de la columna del medio. |
| Buscador · Filtros | Encabezado de la columna del medio. |
| **Vista semanal** | Ya existe. Es el `Día / Semana` del diseño — reusarla, no rehacerla. |
| Lista de turnos | Cuerpo de la columna del medio. En PC, tabla con las columnas del diseño (`HORA · CLIENTE · SERVICIO · ESTADO · ›`); en celular, las tarjetas actuales. |
| Ajustes · Días bloqueados | Pasan a ser una sección aparte de la navegación. |
| Hoja: cancelar · Hoja: modificar | Quedan como están, al final. |

Falta lo único realmente nuevo: **la columna de detalle**. Al elegir un
turno se puebla con lo que hoy vive suelto en la tarjeta (servicio,
teléfono, dirección, nota) más las acciones que ya funcionan
—Reprogramar, Editar, Cancelar—. En celular no es columna: sube como
hoja, que es el patrón que el panel ya usa.

## Decisiones tomadas, para no rediscutirlas

1. **La barra lateral lleva sólo Agenda y Ajustes.** El diseño dibuja
   además Clientes, Servicios, Horarios y Cobros, que **no existen como
   pantallas**. No crear links muertos.
2. **La métrica `SIN SEÑA` queda afuera** hasta que exista la seña.
   Las otras cuatro del diseño sí se pueden calcular hoy: turnos,
   ocupación, huecos y previsto.
3. **Nada de base de datos.** Ya hay persistencia: `saveSettings` en
   `lib/googleCalendar.ts` guarda un JSON en la descripción de un evento
   oculto de todo el día en 2099, y las fechas bloqueadas son eventos.
   La seña irá como un campo más en la descripción del turno; las zonas,
   en el JSON de settings.

## Fuera de alcance en esta fase

Van después, en este orden: **seña**, después **zonas y viáticos**, y al
final el **historial del cliente** (visitas, ausencias, frecuencia, nota
interna y la insignia `1.ª VEZ`), que es lo único que necesita decidir
dónde vive.

## Cómo verificarlo

**El panel está detrás del login y el agente no puede entrar** — no debe
usar la contraseña de `.env.local`. La verificación visual la hace
Camilo sobre la preview de Vercel.

Lo que el agente sí puede y debe hacer: `npx tsc --noEmit`, `npm run
build`, y medir la geometría en el navegador sobre las pantallas
públicas. Todo lo que no pueda comprobar, tiene que decirlo
explícitamente en vez de darlo por bueno.

Precedente de esta sesión: el mail de cancelación se rompió justamente
así — compilaba, parecía bien, y el texto quedó en 1.02:1 de contraste
porque nadie lo miró renderizado.

## Estado de la rama

Todo esto vive en `tema-hohle`, con preview automática en Vercel.
`master` sigue intacto. Ojo: la rama incluye un commit `chore:` con
trabajo previo que **no fue verificado** por el agente (rutas de API,
`googleCalendar`, `constants`); revisarlo antes de mergear a producción.
