# Barber Höhle

La web de turnos de **Barber Höhle**, la barbería de Santiago Rieck (Congreso 1865,
Belgrano, CABA). Atiende en el estudio y a domicilio.

Next.js 16 con App Router, TypeScript, desplegada en Vercel.

En la interfaz la marca se escribe **Barber Höhle**, con diéresis. Para dominios,
repos y direcciones de mail va `barber-hohle`, sin diéresis: la ö no sobrevive
a una URL ni a un `from:`.

**Reservar no pide cuenta ni login.** Es una regla del producto, no una etapa
pendiente. Nadie se registra para cortarse el pelo: el cliente entra, elige,
deja nombre, mail y WhatsApp, y listo. Todo lo que después necesite hacer con su
turno —verlo, reprogramarlo, cancelarlo— se resuelve con un link que le llega
por mail, no con una contraseña.

## No hay base de datos

Es la decisión que explica todo lo demás.

**Las reservas son eventos de Google Calendar.** No hay una tabla de turnos que
después haya que sincronizar con la agenda de Santiago: la agenda de Santiago
*es* la base de datos. Él abre Google Calendar en el teléfono y ve lo mismo que
ve el panel, sin que nadie exporte nada.

**Los ajustes del panel viven en un JSON dentro del calendario.** Hay un evento
único, `🔧 BARBERIA_CONFIG`, parado en 2099 para que no moleste, cuya descripción
es el JSON de configuración (hoy, el tope de turnos por día). Guardar un ajuste
es un `patch` a ese evento.

Los días y las franjas bloqueadas también son eventos, con su propia marca en el
título.

Lo que implica:

- **No hay migraciones, ni backups aparte, ni un proveedor de base que pagar.**
  El backup es el que Google ya hace.
- **Cada consulta es una llamada a la API de Google**, y eso se nota. Por eso la
  grilla de horarios de un día se arma con *una* sola consulta de la que salen
  las tres respuestas —si el día está bloqueado, qué turnos hay, qué franjas
  cerró Santiago— y no con tres viajes.
- **El estado que el calendario no sabe representar va en `extendedProperties`**,
  metadatos que sólo lee el código. Ahí vive si la seña está paga: no en la
  descripción, que es texto que además leen los mails y el panel.
- **No hay transacciones.** Dos personas pueden pedir el mismo horario en el
  mismo segundo. Se convive con eso: el volumen de una barbería de una persona
  no lo justifica de otra manera.
- **Sin `GOOGLE_CALENDAR_ID` la app no explota**: las funciones de calendario
  detectan que no están configuradas y devuelven un stub. Se puede levantar el
  proyecto y recorrer el flujo entero sin credenciales.

## Las piezas

### El flujo de reserva

`app/page.tsx` monta `components/BookingFlow.tsx`, cinco pasos en
`components/booking/`: **Lugar → Servicio → Horario → Datos → Resumen**, y una
pantalla de éxito. El estado del turno vive en el cliente y recién viaja al
servidor al confirmar (`POST /api/booking`).

La portada acepta `?modalidad=local|domicilio` y `?servicio=` para entrar directo
con el primer o el segundo paso ya resuelto — sirve para los links de Instagram.

Los servicios, los horarios, los precios y la tabla de zonas del viático están en
`lib/constants.ts`. Cambiar un precio o mover un barrio de banda se hace ahí y en
ningún otro lado.

### El panel `/admin`

Es la herramienta de trabajo diaria de Santiago, no una pantalla de
configuración. Ahí ve la agenda del día, busca un cliente, abre el detalle de un
turno, lo cancela con motivo, lo reprograma, bloquea un día entero o una franja
suelta, y ajusta el tope de turnos diarios.

En PC son tres columnas —navegación, agenda, detalle—; en celular, pestañas. La
navegación lleva sólo Agenda y Ajustes: las demás secciones que dibujaba el
diseño no existen como pantallas, y un link que no lleva a ningún lado es peor
que la ausencia del link.

Detrás de login. `middleware.ts` protege `/admin/*` y `/api/admin/*`: sin la
cookie `admin_token` las páginas redirigen a `/admin/login` y las rutas de API
devuelven 401. La cookie se firma contra `ADMIN_SECRET` y se emite cuando el
password coincide con `ADMIN_PASSWORD`.

### Las vistas del cliente

Todas piden el id del turno **y** el mail. El link puede terminar en cualquier
lado —un chat reenviado, un teléfono prestado— y sin el mail cualquiera que lo
tenga vería los datos de otro.

- **`/turno?id=…&email=…`** — el turno del cliente, en un link que puede guardar.
  Fecha, servicio, lo que paga, el estado de la seña y las dos salidas. El
  recorrido **Reservado → Pago pendiente → Confirmado** se dibuja como los pasos
  del flujo. Reprogramar va primero y cancelar como secundario: la seña no se
  devuelve, así que la salida cara no puede ser la que se ve mejor.
- **`/pago`** — la vuelta de Mercado Pago. No le cree al parámetro que trae
  Mercado Pago en la URL: le pregunta al servidor por el estado que dejó el
  webhook, que es el aviso bueno y puede tardar unos segundos más que el
  navegador del cliente.
- **`/cancelar`** — cancela hasta 24 horas antes (`CANCELLATION_MIN_HOURS`).
- **`/modificar`** — reprograma. Borra el evento y crea uno nuevo, así que el id
  cambia: por eso el panel guarda el id del turno abierto y no el objeto.

### Los mails

Todo sale por **nodemailer** contra Gmail (`lib/email.ts`). No hay proveedor de
mail transaccional.

Al cliente: confirmación, recordatorio del día anterior, cancelación, cambio de
horario y aviso de reserva vencida sin seña. A Santiago: alta, cambio,
cancelación y el resumen del día.

Las plantillas están escritas en tablas HTML con estilos en línea, porque los
clientes de correo no entienden otra cosa. El logo viaja **incrustado como
adjunto** (`cid:`) y no como `<img src="https://…">`: la imagen remota dependía
de que `APP_URL` estuviera puesta, de que el dominio existiera y de que Gmail y
Outlook no bloquearan imágenes de un remitente nuevo — y las tres fallaban.

Por eso `next.config.ts` declara `public/logo-white.png` en
`outputFileTracingIncludes`: la ruta se arma con `path.join` y el trazado
automático no la adivina.

**El WhatsApp no se manda solo.** Hubo un stub con un TODO que nunca se
configuró; se fue entero. El link de WhatsApp sigue estando en los mails y en el
panel, para que Santiago escriba él.

### Los crons

En `vercel.json`, protegidos con `CRON_SECRET`:

- **`/api/cron/reminder`** — 13:00 UTC (10:00 en Argentina). Recordatorio de los
  turnos de mañana.
- **`/api/cron/daily-summary`** — 11:00 UTC (08:00). El resumen del día a
  Santiago.

Existe además **`/api/cron/expire-holds`**, que libera los turnos que reservaron
y nunca pagaron la seña, pero **no está agendado**: el plan Hobby de Vercel
admite dos crons y ya están usados, y además no baja de una corrida por día, que
para un plazo de veinte minutos no sirve. Lo que sostiene esto mientras tanto es
el barrido que hacen `/api/booking` y `/api/availability` cada vez que alguien
mira o toma un horario. La ruta queda para engancharla a un cron cada quince
minutos el día que el proyecto pase a Pro, o a un cron externo.

## Los dos interruptores

`lib/flags.ts`:

- **`DEPOSIT_ENABLED`** — con esto en `1` el turno nace sin confirmar y hay que
  pagar una seña del 50% por Mercado Pago. El horario queda guardado 20 minutos
  (`DEPOSIT_HOLD_MINUTES`) y después se cae.
- **`VIATICO_ENABLED`** — con esto en `1` se pide el barrio en el paso de datos y
  se cobra el traslado según la banda. Apagado, el precio a domicilio es plano y
  el campo ni siquiera aparece: un campo obligatorio que no decide nada es peor
  que no tenerlo.

**Los dos están apagados a propósito, y ninguno cuelga de que existan las
credenciales.** El día que Santiago pegue su token de Mercado Pago en Vercel, o
que confirmemos la tabla de zonas, nada tiene que encenderse solo: se prende a
mano, cuando el circuito está probado.

Para el detalle de cómo encender la seña —credenciales, webhook, pruebas— está
[MERCADOPAGO.md](MERCADOPAGO.md).

## El sistema visual

Dos pieles sobre el **mismo plano**. Tipografía, grillas, tamaños y jerarquía son
idénticos en las dos: cambia la piel, no el plano.

- **«Höhle»** — la cueva y el oro. Es el sistema por defecto en toda la app del
  cliente, y ahí **no hay conmutador**: la app de reserva se ve siempre así.
- **«Papel»** — el claro, de dos tintas y sin oro. Es una variante, y sólo del
  panel: Santiago trabaja con el local iluminado y ahí el negro pleno con sol de
  frente no se lee. Lo aplica `app/admin`, y `ThemeToggle` lo limpia al
  desmontarse para que una navegación blanda a la portada no se lo lleve puesto.

Las cuatro reglas del oro están escritas arriba de `app/globals.css` y se
respetan en cada componente. La más importante: el oro es luz, no relleno
—filetes, bordes vivos, un botón por pantalla— y los estados se siguen diciendo
con palabras, nunca sólo marcados con color.

**Todo el color vive en variables CSS en `app/globals.css`.** No se hardcodean
colores, radios ni tipografías en los componentes: se usa `var(--acento)`,
`var(--text-mut)`, `var(--border)`, `var(--font-mono)`. Un componente que escriba
un `#hex` rompe la piel clara sin que nadie se entere.

Montserrat para todo, JetBrains Mono sólo para datos: horas, precios, rótulos.

## `/email-preview`

Renderiza las plantillas de mail **reales** —no una copia— con datos de muestra,
cada una en un iframe que aísla los estilos igual que lo hace un cliente de
correo. Si cambia `lib/email.ts`, cambia la vista.

Existe **sólo en desarrollo**: en producción devuelve 404.

## Levantarlo en local

```bash
npm install
npm run dev
```

Abre en `http://localhost:3000`. El bundler es Turbopack, que en esta versión de
Next es el que viene por defecto.

Sin credenciales de Google el flujo se recorre igual: el calendario devuelve un
stub y no se escribe nada. Los mails, sin `GMAIL_USER`, quedan en el log.

Mercado Pago no se puede probar del todo desde local: necesita una URL pública
para volver al sitio y para el webhook, y a `localhost` no llega. La preferencia
se crea igual, sin `auto_return` — el cliente vuelve tocando «Volver al sitio».

## Variables de entorno

En `.env.local` para desarrollo, en Vercel para producción.

| Variable | Para qué |
| --- | --- |
| `ADMIN_PASSWORD` | La contraseña que se escribe en `/admin/login`. |
| `ADMIN_SECRET` | El valor de la cookie `admin_token`; el middleware compara contra esto. |
| `GOOGLE_SERVICE_ACCOUNT_EMAIL` | La cuenta de servicio que escribe en el calendario. Hay que compartirle el calendario con permiso de edición. |
| `GOOGLE_PRIVATE_KEY` | Su clave privada. Vercel la guarda en una sola línea con `\n` literales; el código restaura los saltos. |
| `GOOGLE_CALENDAR_ID` | El calendario donde viven los turnos, los bloqueos y el JSON de ajustes. |
| `GMAIL_USER` | La casilla de Gmail desde la que salen todos los mails. |
| `GMAIL_APP_PASSWORD` | Su contraseña de aplicación, no la del correo. |
| `SANTIAGO_EMAIL` | A dónde le llegan a Santiago los avisos y el resumen diario. |
| `SANTIAGO_WHATSAPP` | Su número, para el link de WhatsApp de la pantalla de reprogramar. |
| `CRON_SECRET` | Protege las rutas de cron. Vercel lo manda como `Bearer`. |
| `MP_ACCESS_TOKEN` | El token de Mercado Pago con el que se crea la preferencia de pago. |
| `MP_WEBHOOK_SECRET` | La clave para verificar la firma del webhook. Sin ella el webhook sigue funcionando, pero avisa por log que no verifica. |
| `DEPOSIT_ENABLED` | `1` prende la seña. Cualquier otra cosa, apagada. |
| `VIATICO_ENABLED` | `1` prende el viático por zona. Cualquier otra cosa, apagado. |
| `APP_URL` | La URL pública del sitio, para los links de los mails y la vuelta de Mercado Pago. Si no está, se usa `VERCEL_URL`, que Vercel inyecta sola. |

Todo lo que toca plata o credenciales está en [MERCADOPAGO.md](MERCADOPAGO.md).
