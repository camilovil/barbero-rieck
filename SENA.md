# La seña

Para reservar se transfiere la mitad del servicio. El resto se paga en el turno.

**Estado al 1 de septiembre de 2026:** el sitio vive en `barberhohle.com`.
`DEPOSIT_ENABLED` y `VIATICO_ENABLED` prendidos; `COMING_SOON` prendido
también, así que la puerta está cerrada al público hasta que se abra a mano.

---

## 1. Cómo funciona

1. El cliente reserva. El turno **nace tentativo**: entra al calendario con un
   ⏳ en el título, en gris, y **ocupa el horario igual que cualquier otro**.
   No sale ningún mail de confirmación, porque todavía no hay turno que
   confirmar.
2. La pantalla `/pago` le muestra el monto, el alias y un botón que le abre
   WhatsApp con el mensaje ya escrito. Los mismos datos le llegan por mail: es
   lo único que le queda si cierra la pestaña.
3. Transfiere y le manda el comprobante a Santiago.
4. **Santiago mira el comprobante y toca «Recibí la seña — confirmar»** en el
   panel. Ahí el turno pierde el ⏳, queda confirmado y recién entonces salen
   los dos mails: la confirmación al cliente y el aviso a él.
5. Si a las 24 horas la seña no llegó, el turno se borra solo, el horario
   vuelve a la agenda y al cliente le llega el mail de reserva vencida.

**Lo único que confirma un turno es Santiago.** No hay ningún camino
automático, y esa es la diferencia central con lo que había antes.

### Lo que había antes, y por qué no está

Hasta el 1 de septiembre de 2026 la seña se cobraba con Mercado Pago —
Checkout Pro, con un webhook que confirmaba el turno solo cuando el pago se
aprobaba. Funcionaba: se probó de punta a punta con plata real. Santiago pidió
sacarlo por los plazos de acreditación y las comisiones.

El código se borró en vez de dejarlo apagado (`lib/mercadopago.ts`, la ruta del
webhook, la pantalla de vuelta del pago). Está en el historial de git si algún
día se vuelve; lo que no está es código que nadie mantiene ni prueba.

De ese sistema quedó en pie casi toda la estructura, que es lo que hizo barato
el cambio: el turno tentativo, el barrido de vencidos, la vista del turno con
sus tres estados, y el botón de confirmar a mano del panel — que se había hecho
para el pago en efectivo y resultó ser el camino principal.

---

## 2. Las variables de entorno

Van en Vercel, en **Settings → Environment Variables**, y en `.env.local` para
la máquina de desarrollo.

| Variable | Qué es | Obligatoria |
|---|---|---|
| `SANTIAGO_ALIAS` | El alias al que se transfiere. **Sin esto la pantalla no puede pedir la transferencia**: muestra «escribile a Santiago» y el circuito se cae a WhatsApp | Sí, si `DEPOSIT_ENABLED=1` |
| `SANTIAGO_TITULAR` | El nombre del titular de la cuenta, para que el cliente confirme que le está transfiriendo a quien corresponde. Si falta, se usa `BARBER_NAME` | No |
| `SANTIAGO_WHATSAPP` | Ya existía. Además de la agenda, es a donde va el botón del comprobante | Sí |
| `DEPOSIT_ENABLED` | En `1`, el turno nace sin confirmar y hay que transferir la seña | — |
| `VIATICO_ENABLED` | En `1`, se pide el barrio y se cobra el traslado a domicilio | — |
| `COMING_SOON` | En `1`, la web no toma reservas: la puerta es un cartel de próximamente | — |
| `CRON_SECRET` | La usan las tres rutas de cron, incluida la que libera los vencidos | — |
| `APP_URL` | El dominio con el que se arman los links de los mails | — |

Dos cosas que se aprendieron cargando estas variables:

- **La CLI de Vercel guarda vacío sin quejarse.** `vercel env add` en modo no
  interactivo acepta el valor por stdin y guarda una cadena vacía. Una variable
  «cargada» que no hace nada suele ser esto. Se verifica con
  `vercel env run --environment=production -- node -e "console.log(process.env.X)"`,
  que es lo único que devuelve el valor real.
- **`vercel env pull` no sirve para verificar.** Las variables marcadas como
  sensibles bajan vacías, todas.

---

## 3. Los tres interruptores

Ninguno cuelga de que existan los datos: se prenden y se apagan a mano
(`lib/flags.ts`). Si `DEPOSIT_ENABLED` colgara de que haya alias, cargar el
alias encendería solo el cobro, en producción, sin que nadie lo haya probado.

**`COMING_SOON=1`** cierra la puerta. La portada y `/reservar` redirigen al
cartel, y `/api/booking` —lo único que escribe en la agenda— devuelve 503,
porque una pantalla no detiene a nadie que le pegue directo a la API.

No cierra el panel de Santiago, ni `/turno`, `/modificar` y `/cancelar`: cerrar
la puerta no es dejar encerrado al que ya reservó y tiene su link en el mail.
**Quien tenga la cookie del panel ve el sitio de verdad**, lo que permite
probar en producción sin abrirle la puerta a nadie.

**`DEPOSIT_ENABLED=0`** hace que el turno vuelva a nacer confirmado en el acto,
como antes de que existiera la seña.

⚠️ **Cuidado al apagarlo.** El barrido de vencidos está adentro de un
`if (isDepositEnabled())` en `/api/booking`, `/api/availability` y
`/api/admin/bookings`. Si lo apagás con turnos pendientes en el calendario,
esos ⏳ se quedan tapando horarios para siempre. La ruta del cron no mira el
interruptor, así que el GitHub Action los sigue limpiando igual; si querés
apurarlo:

```bash
curl -H "Authorization: Bearer $CRON_SECRET" https://barberhohle.com/api/cron/expire-holds
```

---

## 4. Probarlo

Se prueba **sobre producción**, con `COMING_SOON=1` puesto y entrando por
`/admin/login`: la cookie del panel abre la puerta para vos y la deja cerrada
para todos los demás.

No se prueba en una preview de Vercel. Las previews están detrás del login de
Vercel (protección de deploys), así que cualquier cosa que venga de afuera
recibe un 401.

El recorrido, mirando el calendario y el mail en cada paso:

1. **Reservá** un turno en un horario que no moleste — el evento cae en la
   agenda real de Santiago.
2. **Antes de transferir**: en el calendario tiene que estar el evento
   `⏳ ✂️ …` en gris, con `Seña: pendiente de transferencia — $X`. Y el horario
   tiene que aparecer ocupado si abrís la web en otra pestaña: el turno impago
   ocupa igual, que es el punto de todo el diseño.
3. **El mail** de «Falta la seña» tiene que llegar, con el alias, el monto y el
   botón del comprobante. **No** tiene que llegar ninguna confirmación.
4. **El botón de WhatsApp** tiene que abrir el chat de Santiago con el mensaje
   escrito, con el nombre y la fecha del turno.
5. **Confirmá desde el panel** con «Recibí la seña — confirmar». El evento
   pierde el ⏳, pasa a confirmado, la línea dice `Seña: cobrada — confirmada
   por Santiago`, y **ahí sí** salen los dos mails.
6. **Tocá el botón dos veces.** La segunda tiene que decir que ese turno ya no
   está esperando la seña, y **no** volver a mandar los mails.
7. **El caso del abandono**: reservá y no transfieras. A las 24 horas el evento
   tiene que desaparecer, el horario volver a estar libre y llegarle al cliente
   el mail de reserva vencida. Para no esperar un día, golpeá
   `/api/cron/expire-holds` con el `CRON_SECRET` después de mover a mano el
   `reservadoEn` del evento, o bajá `DEPOSIT_HOLD_MINUTES` un rato.

---

## 5. El barrido de vencidos

`GET /api/cron/expire-holds` libera los turnos que reservaron y nunca pagaron.
La golpea un **GitHub Action cada 15 minutos**
(`.github/workflows/expire-holds.yml`), con `CRON_SECRET` en los secretos del
repo.

Está en Actions y no en `vercel.json` porque el plan Hobby admite dos crons —ya
usados por el recordatorio y el resumen diario— y no baja de una corrida por
día. La contra de Actions es que sus crons se atrasan bajo carga y que GitHub
los apaga solo si el repo pasa 60 días sin actividad; las dos cosas están
escritas en el encabezado del workflow.

Además hay un barrido oportunista: `expirePendingEvents()` corre al principio
de `/api/booking`, `/api/availability` y `/api/admin/bookings`. Es la red de
abajo, y es también lo que hace que un cron caído no se note. Si los ⏳
empiezan a quedarse pegados en la agenda, mirá primero si el Action sigue
corriendo.

**El plazo son 24 horas** (`DEPOSIT_HOLD_MINUTES`, en minutos). Era de 20
minutos cuando la seña se pagaba con tarjeta y entraba sola; con transferencia
el reloj mide otra cosa —homebanking, captura, WhatsApp, y que Santiago lo
mire— y veinte minutos hacían que un turno pagado se cayera antes de que nadie
lo viera. El texto que ve el cliente sale de `DEPOSIT_HOLD_LABEL`, que se
calcula de ese número: cambiar el plazo no deja seis pantallas mintiendo.

---

## 6. Lo decidido, para no rediscutirlo

- **La seña es el 50%** del servicio (`DEPOSIT_PERCENT`). Sobre un corte de
  $16.000 son $8.000; sobre el domicilio de $40.000, $20.000.
- **El viático no entra en la seña.** La seña es la mitad del servicio; el
  traslado se paga entero en el turno.
- **La tabla de zonas está confirmada** por Santiago el 31 de agosto de 2026,
  montos y los cuatro barrios del límite incluidos. Vive en `lib/constants.ts`,
  arreglo `ZONAS`, y en ningún otro lado.
- **Al que no está en la lista no lo dejamos afuera.** Elige «No está mi
  barrio», reserva igual, y en el calendario queda `Viático: A CONVENIR`.
- **Los precios son los de siempre** — $16.000, $19.000 y $40.000. El 1 de
  septiembre de 2026 subieron $1.000 para absorber la comisión de Mercado Pago
  y volvieron a bajar el mismo día, cuando Mercado Pago se dio de baja: sin
  comisión que absorber, el aumento no tenía motivo.

## Dónde está cada cosa

| Archivo | Qué hace |
|---|---|
| `lib/flags.ts` | Los tres interruptores. Se leen sólo en el servidor |
| `lib/constants.ts` | Zonas y viáticos, `DEPOSIT_PERCENT`, el plazo y su etiqueta, `depositAmount()` |
| `lib/transferencia.ts` | El alias, el titular y el mensaje de WhatsApp del comprobante |
| `app/api/booking/route.ts` | Crea el evento —tentativo si hay seña— y manda el mail con el alias |
| `app/api/admin/confirmar/route.ts` | **Lo único que confirma un turno.** Lo llama el panel |
| `app/api/pagos/estado/route.ts` | Le contesta a `/pago` cuánto es la seña y si ya se confirmó |
| `app/api/cron/expire-holds/route.ts` | Libera los vencidos. Ver §5 |
| `app/pago/PagoClient.tsx` | La pantalla del alias y el comprobante |
| `app/turno/TurnoClient.tsx` | La vista del turno, con el recorrido de los tres estados |
| `lib/googleCalendar.ts` | `createCalendarEvent` con `pending`, `confirmCalendarEvent`, `expirePendingEvents`, `getPaymentState` |
| `proxy.ts` | Protege el panel y, con `COMING_SOON`, cierra la puerta |
