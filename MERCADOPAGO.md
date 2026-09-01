# Encender la seña por Mercado Pago

El cobro está escrito entero y apagado. Falta una sola cosa: las credenciales de
la cuenta de Santiago, que las tiene que sacar él porque es adonde cae la plata.

Este documento existe para que el día que aparezcan, encender esto sea seguir
una lista y no reconstruir el razonamiento. Está en orden de ejecución: leelo de
arriba abajo y hacé los pasos en ese orden, que no es caprichoso.

**Estado al 1 de septiembre de 2026 — el circuito está probado y andando.** El
sitio vive en `barberhohle.com`. `DEPOSIT_ENABLED`, `VIATICO_ENABLED` y
`COMING_SOON` prendidos los tres en producción, con el Access Token de la cuenta
de Santiago (`SANTIAGORIECK`, verificada contra `/users/me`). La tabla de zonas
la confirmó él (§6) y el agujero de §5 está tapado: el barrido de vencidos corre
cada quince minutos desde un GitHub Action.

La prueba de §4 se hizo **sobre producción y con plata real** —una seña de $8.000
pagada con tarjeta, acreditada como `MERPAGO*BARBERHOHLE`—, no en una preview: la
protección de deploys de Vercel deja las previews detrás de un login, así que el
webhook de Mercado Pago habría recibido 401 y el turno no se habría confirmado
nunca. Se pudo probar en producción sin riesgo porque `COMING_SOON` cierra la
puerta al público y la cookie del panel la abre para la casa. Mercado Pago mandó
cinco avisos del mismo pago y el turno se confirmó una sola vez.

**Lo único que falta para abrir es sacar `COMING_SOON`.**

---

## 1. Lo que tiene que hacer Santiago

Esta sección está escrita para mandársela por WhatsApp tal cual. De acá para
abajo es para Camilo.

> Santi, para que la web pueda cobrar la seña necesito tres datos que sólo se
> sacan desde **tu** cuenta de Mercado Pago. Tiene que ser la tuya: la plata cae
> en la cuenta que genera estas claves, así que si las saco yo, la seña me llega
> a mí.
>
> 1. Entrá a **mercadopago.com.ar/developers** con el mismo usuario y contraseña
>    que usás para cobrar. No te crees una cuenta nueva.
> 2. Andá a la parte de **Tus integraciones** y creá una aplicación nueva.
>    Cuando te pregunte qué tipo de producto vas a usar, elegí **Checkout Pro**
>    (es el que abre la pantalla de pago de Mercado Pago; puede figurar como
>    "pagos online"). El nombre poneselo como quieras, "Barber Höhle" está bien.
> 3. Adentro de esa aplicación hay una sección de **credenciales**, con dos
>    juegos: las de **prueba** y las de **producción**. De cada juego copiá el
>    **Access Token** y la **Public Key**.
> 4. Pasame primero las **de prueba** — con esas armo todo el circuito sin que
>    se mueva un peso. Cuando esté probado te pido las de producción.
>
> Un cuarto dato, si te deja llegar: dentro de la misma aplicación hay una
> sección de **Webhooks** o **Notificaciones**, donde se configura la URL a la
> que Mercado Pago nos avisa que un pago entró. Ahí se genera una **clave
> secreta**. Si la ves, mandámela; si el panel no te deja entrar, no importa,
> se puede encender igual.
>
> Ojo: el Access Token es como la llave de la caja. No lo mandes por ningún
> lado más que este chat, y si se filtra se regenera desde el mismo panel.

**No le pidas usuario y contraseña de Mercado Pago.** Con las credenciales
alcanza, y no hay ninguna razón para que Camilo entre a su cuenta.

---

## 2. Las variables de entorno

Van en Vercel, en **Settings → Environment Variables** del proyecto, y en
`.env.local` para probar en la máquina de desarrollo. En Vercel cada variable se
carga por entorno (Production / Preview / Development): eso es lo que permite
tener las de prueba en la preview y las de verdad en producción.

| Variable | Qué es | Obligatoria | Dónde |
|---|---|---|---|
| `MP_ACCESS_TOKEN` | La llave con la que el servidor le habla a Mercado Pago: crea el link de pago y después pregunta si ese pago se aprobó. **La cuenta dueña de este token es la que cobra.** | Sí, si `DEPOSIT_ENABLED=1` | Preview: la de prueba. Production: la de producción |
| `MP_WEBHOOK_SECRET` | La clave con la que se verifica que el aviso de pago lo mandó Mercado Pago y no cualquiera que adivinó la URL | No | Igual que arriba, si Santiago la consigue |
| `MP_PUBLIC_KEY` | La clave pública de la aplicación | No — **hoy no la usa ninguna línea de código** | Ver la nota de abajo |
| `DEPOSIT_ENABLED` | En `1`, el turno nace sin confirmar y hay que pagar la seña | — | Se prende a mano, ver §3 |
| `VIATICO_ENABLED` | En `1`, se pide el barrio y se cobra el traslado a domicilio | — | Se prende a mano, ver §3 |
| `CRON_SECRET` | Ya existe y ya está cargada. La usan las tres rutas de cron, incluida la de liberar turnos vencidos de §5 | — | Ya cargada |
| `APP_URL` | El dominio con el que se arman los links de los mails. Sin ella se usa el de Vercel; en local, `localhost:3000` | No | Conviene fijarla en Production |

Notas:

- **`MP_PUBLIC_KEY` no la lee nadie.** Está en `.env.local` porque viene en el
  mismo par que el token, pero Checkout Pro redirige al sitio de Mercado Pago y
  el pago no toca nuestro front. Haría falta el día que el pago se meta dentro
  de la web (Bricks / Checkout API). Dejarla cargada no rompe nada; sacarla,
  tampoco.
- **`MP_WEBHOOK_SECRET` no es la que decide.** Sin ella el webhook igual
  confirma turnos, y queda un `console.warn` avisando. Lo que confirma un turno
  es preguntarle a Mercado Pago por ese pago con nuestro token y ver que esté
  aprobado y que apunte a un turno nuestro esperando — el cuerpo del aviso no se
  usa para nada. La firma evita que nos hagan gastar consultas, nada más. Está
  así a propósito: el panel de Mercado Pago no siempre deja llegar a la
  configuración de webhooks, y sin esa clave el turno no se podría confirmar
  nunca (commit `ea374a0`).
- **Cambiar una variable en Vercel no afecta a lo que ya está desplegado.** Hay
  que redesplegar para que tome el valor nuevo.
- **No hace falta configurar la URL del webhook en el panel de Mercado Pago.**
  Se manda en cada preferencia (`notification_url`), armada con el dominio desde
  el que se hizo la reserva. Eso es lo que hace que una preview de Vercel se
  pruebe sola, sin tocar nada en el panel.

### Antes de nada: mirá qué token está cargado

`.env.local` **ya tiene** `MP_ACCESS_TOKEN` y `MP_PUBLIC_KEY` con valores que
empiezan en `APP_USR-`, o sea con forma de credencial de **producción**, aunque
el comentario que las encabeza dice que ahí van las de prueba. Antes de tocar
nada hay que saber de qué cuenta salieron: si no son de la cuenta de Santiago,
la seña de las pruebas cae en otro lado. Confirmalo con él y reemplazalas por
las de prueba antes de encender nada.

---

## 3. El orden de encendido

**Los dos interruptores no cuelgan de que existan las credenciales, y eso es a
propósito** (`lib/flags.ts`, commit `8f3136d`): si `DEPOSIT_ENABLED` colgara de
que haya token, pegar el token en Vercel encendería solo el cobro, en
producción, sin que nadie haya probado el circuito. Se prenden a mano, uno por
vez, y en este orden.

### Paso 0 — El viático, que no tiene nada que ver con Mercado Pago

`VIATICO_ENABLED=1` sólo hace que se pida el barrio y que se sume el traslado al
total. No llama a Mercado Pago ni cambia cómo nace un turno: si algo sale mal, el
peor caso es un precio equivocado, no un turno que desaparece.

Pero depende de que Santiago confirme la tabla de zonas (§6). Se puede prender
antes o después de la seña, es independiente. **Lo que no se puede es prenderlo
sin que Santiago haya confirmado los montos**, porque empieza a cobrar traslados
que él no acordó.

### Paso 1 — Cargar las credenciales de PRUEBA, con la seña apagada

`MP_ACCESS_TOKEN` de prueba en Vercel (entorno Preview) y en `.env.local`.
`DEPOSIT_ENABLED` sigue sin existir o en `0`.

Con esto no cambia absolutamente nada en la web: sin el interruptor, ninguna
línea de `lib/mercadopago.ts` se ejecuta. Es a propósito, y es la prueba de que
cargar el token no enciende nada.

Verificá que reservar sigue funcionando como siempre: turno confirmado en el
acto, los dos mails salen, el evento del calendario sin ⏳.

### Paso 2 — Prender la seña SÓLO en una preview

`DEPOSIT_ENABLED=1` únicamente en el entorno **Preview** de Vercel. Redesplegá y
hacé la prueba completa de §4 contra esa URL.

**Por qué no en producción todavía.** Con `DEPOSIT_ENABLED=1` el turno cambia de
naturaleza: nace tentativo, con ⏳ en el título, **y no sale ningún mail** hasta
que la plata entre. Los dos modos de fallar son feos y distintos:

- **Si el token está mal o falta**, `createDepositPreference` tira, la ruta de
  reserva borra el evento que acababa de crear y devuelve un 502: *"No pudimos
  abrir el pago de la seña"*. Nadie puede reservar. Es ruidoso, pero al menos no
  deja basura.
- **Si el token anda pero el webhook nunca llega** —dominio equivocado, la
  preferencia armada desde localhost, cualquier cosa— el turno queda pendiente y
  **a los 20 minutos el barrido lo borra**. El cliente pagó, se quedó sin turno,
  y en el calendario no queda rastro. Eso es lo que pasa si prendés la seña
  antes de probar el circuito: los turnos se caen solos y la plata queda del
  otro lado.

Los 20 minutos son `DEPOSIT_HOLD_MINUTES` en `lib/constants.ts`. Es el mismo
plazo para el link de pago (la preferencia expira con la reserva) y para el
barrido de vencidos.

### Paso 3 — Producción

Recién con §4 verde de punta a punta:

1. `MP_ACCESS_TOKEN` de **producción** en el entorno Production.
2. `MP_WEBHOOK_SECRET` de producción, si Santiago la consiguió.
3. `DEPOSIT_ENABLED=1` en Production.
4. Redesplegar.
5. **Una reserva real, con plata de verdad, del monto más chico posible.** Ni
   las credenciales de prueba ni la simulación del panel prueban que la cuenta
   de Santiago esté habilitada para cobrar. Después le devolvés la seña desde el
   panel de Mercado Pago.

### Cómo se apaga

`DEPOSIT_ENABLED=0` y redesplegar. Los turnos vuelven a nacer confirmados en el
acto.

**Cuidado con esto:** el barrido de vencidos está adentro de un
`if (isDepositEnabled())` en `/api/booking`, `/api/availability` y
`/api/admin/bookings`. Si apagás el interruptor con turnos pendientes en el
calendario, **nadie los va a limpiar** y esos ⏳ se quedan tapando horarios para
siempre. Antes de apagar, o justo después, corré el barrido a mano:

```bash
curl -H "Authorization: Bearer $CRON_SECRET" https://<dominio>/api/cron/expire-holds
```

Esa ruta no mira el interruptor. O borralos a mano desde Google Calendar, son
los que tienen ⏳ en el título.

---

## 4. La prueba de punta a punta

Se hace **sobre una preview de Vercel**, no en local. El webhook es una llamada
que Mercado Pago le hace a nuestro servidor, y a `localhost` no llega: en la
máquina de desarrollo el pago se hace pero el turno no se confirma nunca, y a
los 20 minutos se cae. Cualquier URL pública sirve (un túnel tipo ngrok también),
pero la preview de Vercel ya está y no cuesta nada.

En local el pago igual se puede abrir, para mirar la pantalla de Mercado Pago:
`auto_return` se omite cuando el sitio corre en localhost —si no, Mercado Pago
rechaza la preferencia entera— y el cliente vuelve tocando "Volver al sitio"
(commit `cb224ac`). Pero eso no es la prueba.

### Preparativos

- Credenciales de **prueba** cargadas en Preview.
- `DEPOSIT_ENABLED=1` en Preview.
- Google Calendar abierto en la agenda de Santiago.
- Los logs de la función en Vercel abiertos (Deployments → el deploy → Logs).
- Una tarjeta de prueba de Mercado Pago. Están en la documentación oficial de
  Checkout Pro, y el resultado del pago se fuerza desde el nombre del titular
  (`APRO` aprueba, `OTHE` rechaza). Confirmá los valores en la doc, que cambian.

### El recorrido feliz

1. **Reservá** un turno en el local, con servicio con precio. Elegí un horario
   que no moleste si queda tomado un rato.
2. **Mirá el paso del resumen**: tiene que decir que se paga una seña del 50% —
   $8.500 sobre un corte de $17.000— y que el resto va en el lugar.
3. **Confirmá.** Te tiene que mandar al checkout de Mercado Pago. Si en vez de
   eso ves *"No pudimos abrir el pago de la seña"*, el token está mal: mirá los
   logs, ahí sale el error de Mercado Pago tal cual.
4. **Sin pagar todavía, mirá el calendario.** Tiene que haber aparecido un evento
   `⏳ ✂️ Corte — Nombre`, en gris/tentativo, con `Seña: pendiente de pago —
   $8.000` en la descripción. **Y no tienen que haber salido mails**, ni al
   cliente ni a Santiago: confirmar por mail algo impago es prometer un turno
   que en veinte minutos se cae.
5. **Mirá que el horario esté tomado**: abrí la web en otra pestaña, buscá el
   mismo día y ese horario tiene que aparecer ocupado. Es el punto de todo el
   diseño — el turno impago ocupa igual.
6. **Pagá** con la tarjeta de prueba.
7. **La vuelta a `/pago`.** Primero dice "Confirmando el pago…": la pantalla le
   pregunta al servidor por el turno cada 2,5 segundos, hasta ocho veces, porque
   el navegador del cliente puede volver antes que el aviso de Mercado Pago. En
   condiciones normales pasa a **"Turno confirmado"** en un par de segundos. Si
   se queda en "Estamos confirmando", el webhook no llegó — andá al punto 9.
8. **Mirá el calendario otra vez.** El mismo evento tiene que haber perdido el
   ⏳, estar confirmado (ya no gris), y la línea de la seña tiene que decir ahora
   `Seña: pagada — $8.000 (Mercado Pago <id>)`. **Ahí sí salen los dos mails**:
   el de confirmación al cliente y el aviso a Santiago.
9. **Los logs.** Buscá `[pagos/webhook]`. La línea buena es
   `turno <id> confirmado con el pago <id>`. Las otras que podés ver:
   - `firma inválida` → `MP_WEBHOOK_SECRET` no coincide con la de esa aplicación.
     Sacá la variable y probá de nuevo: sin ella el circuito funciona igual.
   - `ignorado: <estado>` → el pago no está aprobado. Normal si probaste con
     `OTHE`.
   - `pago X aprobado y el turno Y no estaba esperando` → o es un aviso repetido
     (Mercado Pago manda el mismo varias veces y el segundo no hace nada, que es
     lo que queremos), o **el turno se venció antes de que entrara la plata**.
     Lo segundo hay que mirarlo a mano: hay una seña cobrada sin turno detrás.
10. **Abrí `/turno?id=<eventId>&email=<mail>`** y verificá que muestre el turno
    como confirmado, con el recorrido en Confirmado.

### Los otros tres caminos

- **Pago rechazado** (titular `OTHE`): volvés a `/pago?...&estado=rechazado` y la
  pantalla dice "No se completó". El evento ⏳ sigue en el calendario y se cae
  solo a los 20 minutos, con el mail de vencimiento al cliente.
- **Abandono**: reservá, llegá al checkout y cerrá la pestaña. Esperá 20 minutos
  y después **entrá a la web y mirá horarios** —el barrido corre ahí, no solo—:
  el evento tiene que desaparecer, el horario volver a estar libre, y al cliente
  le tiene que llegar el mail de "la reserva venció". Si no querés esperar,
  golpeá `/api/cron/expire-holds` con el `CRON_SECRET`.
- **Aviso repetido**: en el panel de Mercado Pago, en la sección de webhooks, se
  puede simular el envío de una notificación. Mandá dos veces la del mismo pago
  ya confirmado y verificá que la segunda no vuelve a mandar los mails — tiene
  que loguear `nada que confirmar`. Es lo que evita que al cliente le lleguen
  tres confirmaciones del mismo turno.

### Lo que no prueba nada

- Probar en local. El webhook no llega y el turno se cae siempre.
- Probar sólo con la simulación del panel. Prueba nuestro lado, no que la cuenta
  de Santiago cobre.
- Que la pantalla diga "Turno confirmado". Eso sale de leer el evento del
  calendario. Si no mirás el calendario y los mails, no probaste el circuito.

---

## 5. La expiración de los holds — el agujero real

**Esto no depende de Mercado Pago y hay que resolverlo sí o sí antes de prender
la seña en producción.**

### Qué pasa hoy

Existe `GET /api/cron/expire-holds`, que libera los turnos que reservaron y nunca
pagaron. **No está enganchada a ningún cron.** El plan Hobby de Vercel da dos
crons y ya están usados por el recordatorio (13:00 UTC) y el resumen diario
(11:00 UTC), y además Hobby no baja de una corrida por día — para un plazo de 20
minutos, inservible.

Lo único que libera los vencidos hoy es un barrido oportunista: `expirePendingEvents()`
corre al principio de `/api/booking`, `/api/availability` y `/api/admin/bookings`.
O sea, **los vencidos se liberan de rebote, cuando alguien entra a la web**.

La consecuencia concreta: alguien abandona la pantalla de pago a las 23:00 y ese
horario le queda tapado a todo el mundo hasta que alguien abra la página al día
siguiente. Y el mail de "tu reserva venció" le llega al cliente doce horas tarde.
No se pierde plata, pero se pierden turnos, y a Santiago le aparece un ⏳ en la
agenda que no significa nada.

### Resuelto: el GitHub Action

**Ya está hecho** — `.github/workflows/expire-holds.yml`, cada 15 minutos contra
`https://barberhohle.com/api/cron/expire-holds`, con `CRON_SECRET` en los secretos
del repo. Se eligió Actions sobre un servicio externo porque el secreto queda
versionado con el resto y el día que se rote está claro dónde se cambia; la
contra es que sus crons se atrasan bajo carga, y que GitHub los apaga solo si el
repo pasa 60 días sin actividad. Las dos cosas están escritas en el encabezado
del workflow.

El job falla ruidoso a propósito: cualquier respuesta que no sea 200 rompe la
corrida y llega el mail. Un cron apagado se ve idéntico a no tener cron, porque
el barrido oportunista tapa el síntoma.

Lo que sigue es el razonamiento original, por si alguna vez hay que mudarlo a un
servicio externo:

Un servicio gratuito que golpee la URL cada 15 minutos. Cualquiera sirve —
cron-job.org, EasyCron, UptimeRobot, un GitHub Action con `schedule` en un repo
que ya tenés—; lo único que hace falta es que deje mandar un header.

1. Elegí el servicio y creá una tarea nueva.
2. **URL:** `https://<dominio-de-produccion>/api/cron/expire-holds`
3. **Método:** GET
4. **Header:** `Authorization: Bearer <el valor de CRON_SECRET>`
   Sin el header la ruta responde 401 y no hace nada. Es el mismo secreto que ya
   está en Vercel — no inventes uno nuevo.
5. **Frecuencia:** cada 15 minutos. El plazo es de 20, así que en el peor caso un
   horario queda tapado 35 minutos en vez de 20. Cada 5 minutos también está
   bien; no hay costo real, la ruta hace una consulta al calendario y se va.
6. **Probala a mano primero** con el `curl` de §3.
7. **Dejá la alerta del servicio prendida** si la ofrece. Un cron que se cayó
   hace tres semanas es exactamente igual a no tener cron, y no te vas a
   enterar: el barrido oportunista tapa el síntoma.
8. Anotá en el servicio a qué proyecto pertenece. Es la clase de cosa que en seis
   meses nadie sabe por qué está.

Un GitHub Action tiene una ventaja: el secreto vive en el repo, versionado con lo
demás, y el día que se rote `CRON_SECRET` está claro dónde se cambia. La
desventaja es que los crons de Actions no son puntuales, se pueden atrasar bastante
bajo carga.

### La alternativa: Vercel Pro

Con Pro se puede poner el cron en `vercel.json` y listo:

```json
{ "path": "/api/cron/expire-holds", "schedule": "*/15 * * * *" }
```

Es la solución limpia —una sola pieza, un solo lugar, sin servicio de terceros—
pero cuesta unos 20 dólares por mes por una barbería que no los necesita para
nada más. Si el proyecto pasa a Pro por otro motivo, esto se hace en un minuto.

### Por qué NO se tocó `vercel.json`

Se evaluó y se dejó como está. Agregar `expire-holds` en Hobby obligaría a sacar
el recordatorio o el resumen diario —los dos son diarios, se usan y funcionan— y
lo que ganás a cambio corre **una vez por día**, que para un plazo de 20 minutos
no sirve para nada. Se cambiaría un cron que funciona por uno que no. Cuando el
proyecto pase a Pro, el cambio es el bloque de arriba.

*(Conviene reconfirmar los límites del plan Hobby cuando toque: son de Vercel y
cambian sin avisar.)*

### Nota al margen

El comentario que encabeza `app/api/cron/expire-holds/route.ts` dice "quince
minutos" donde el plazo real son 20 (`DEPOSIT_HOLD_MINUTES`). Es el comentario el
que quedó viejo, no el código.

---

## 6. Lo que falta que decida Santiago

### La tabla de zonas de viáticos — **confirmada**

**Santiago confirmó la tabla el 31 de agosto de 2026**, tal como estaba. Esta
sección queda como registro de qué se le preguntó y qué contestó, no como
pendiente.

`lib/constants.ts`, arreglo `ZONAS`. Se armó midiendo desde Congreso 1865 en
línea recta y sumando un 25%, que es lo que el callejero le agrega a esa recta
cuando uno maneja de verdad. Es una estimación, no un GPS — y así se le presentó.

**Los montos.** `VIATICO_POR_BANDA = 10000`, y cada banda de 5 km suma esos diez
mil: hasta 5 km sin viático, 5–10 km $10.000, 10–15 km $20.000, 15–20 km $30.000.
Confirmados.

**Los cuatro barrios que quedaron pegados al límite de 5 km** son los que medio
kilómetro les cambia el precio. Se le mostraron uno por uno y los dejó como
estaban:

| Barrio | Distancia estimada | Zona | Qué estaba en juego |
|---|---|---|---|
| Vicente López | 4,9 km | Sin viático | 100 metros de que le cobre $10.000 |
| Villa Pueyrredón | 5,0 km | $10.000 | Justo en el límite; podría haber ido sin viático |
| Paternal | 5,1 km | $10.000 | Ídem |
| Palermo | 5,7 km | Sin viático | **Decisión de la casa, no error.** Por la regla iría a $10.000, pero es de donde más viene la gente y se decidió no cobrarle el traslado (commit `6c29f4e`). Ratificado |

Mover un barrio de banda es mover un nombre de un arreglo al otro, en ese archivo
y en ningún otro lado.

Con esto, `VIATICO_ENABLED=1` deja de estar bloqueado: era lo único que le
faltaba (§3, paso 0).

Dos cosas que ya están decididas y no hace falta rediscutir:

- **El viático no entra en la seña.** La seña es la mitad del servicio; el
  traslado se paga entero en el turno.
- **Al que no está en la lista no lo dejamos afuera.** Elige "No está mi barrio",
  reserva igual, y en el evento del calendario queda escrito
  `Viático: A CONVENIR`. Santiago lo arregla por WhatsApp.

### Lo que hay que preguntarle además

- **La seña es el 50% del servicio** (`DEPOSIT_PERCENT`). ¿Está de acuerdo? Sobre
  un corte de $17.000 son $8.500; sobre el domicilio de $41.000, $20.500.
- **La comisión de Mercado Pago la absorbe la casa.** El 1 de septiembre de 2026
  los tres precios subieron $1.000 con ese fin. Sobre las señas de hoy y a la
  tasa de acreditación inmediata la comisión da unos $647 en el corte, $761 en
  corte y barba, y **$1.560 en el de domicilio, donde los mil pesos no alcanzan
  por unos $560**. Si eso tiene que cerrar, el domicilio va a $42.000.
- **La seña no se devuelve** — así está escrito en la web, a la vista antes de
  pagar, y por eso "Reprogramar" va antes que "Cancelar" en la vista del turno.
  Si él quiere devolverla en algún caso, lo hace a mano desde el panel de Mercado
  Pago; la web no tiene forma de hacerlo.
- **Los 20 minutos de plazo** para pagar. Es poco si el cliente se distrae, y es
  mucho si el horario es codiciado. Se cambia en `DEPOSIT_HOLD_MINUTES`.
- **Si el cliente paga y el turno ya se venció**, hoy queda un log y nada más. Es
  plata cobrada sin turno detrás, y lo tiene que resolver él a mano. Debería
  saber que ese caso existe antes de prender el cobro, no la primera vez que
  pasa.

---

## Dónde está cada cosa

| Archivo | Qué hace |
|---|---|
| `lib/flags.ts` | Los dos interruptores. Se leen sólo en el servidor |
| `lib/constants.ts` | Zonas y viáticos, `DEPOSIT_PERCENT`, `DEPOSIT_HOLD_MINUTES`, `depositAmount()` |
| `lib/mercadopago.ts` | Arma el link de pago, consulta el estado de un pago, valida la firma |
| `app/api/booking/route.ts` | Crea el evento (pendiente si hay seña) y devuelve el link de pago. Si Mercado Pago no da link, borra el evento |
| `app/api/pagos/webhook/route.ts` | Entra el aviso de Mercado Pago. **Es lo único que confirma un turno** |
| `app/api/pagos/estado/route.ts` | Le contesta a la pantalla de vuelta si la seña llegó |
| `app/api/cron/expire-holds/route.ts` | Libera los vencidos. Ver §5 |
| `lib/googleCalendar.ts` | `createCalendarEvent` con `pending`, `confirmCalendarEvent`, `expirePendingEvents`, `getPaymentState` |
| `app/pago/PagoClient.tsx` | La pantalla de vuelta del pago |
| `app/turno/TurnoClient.tsx` | La vista del turno, con el recorrido Reservado → Pago pendiente → Confirmado |

Los commits `8f3136d`, `abb1834`, `15e9047`, `ea374a0`, `cb224ac` y `782145a`
tienen el porqué de cada decisión, escrito cuando se tomó.
