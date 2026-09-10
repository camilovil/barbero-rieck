import { NextRequest, NextResponse } from 'next/server'
import { getEventsForDate } from '@/lib/googleCalendar'
import { sendReminderEmail } from '@/lib/email'
import { hhmm, hoyEnBA, sumarDias } from '@/lib/format'

// Vercel cron — runs daily at 10:00 AM Argentina time (13:00 UTC)
// Sends reminder emails for tomorrow's appointments
export async function GET(req: NextRequest) {
  // Protect with CRON_SECRET
  const authHeader = req.headers.get('authorization')
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    /* Mañana en Buenos Aires. Antes esto corregía el huso a mano con
       `getTimezoneOffset()`, o sea que dependía de en qué zona corriera el
       proceso: en Vercel (UTC) daba bien y en una máquina argentina
       avisaba del día equivocado. */
    const argTomorrow = sumarDias(hoyEnBA(), 1)

    const events = await getEventsForDate(argTomorrow)

    let sent = 0
    for (const ev of events) {
      if (!ev.email) continue
      await sendReminderEmail({
        nombre: ev.nombre,
        email: ev.email,
        eventId: ev.id,
        time: hhmm(ev.start),
        servicio: ev.servicio,
        location: ev.modalidad?.toLowerCase().includes('domicilio') ? 'domicilio' : 'local',
        direccion: ev.direccion,
      })
      sent++
    }

    console.log(`[cron/reminder] Sent ${sent} reminders for ${argTomorrow.toDateString()}`)
    return NextResponse.json({ success: true, sent, date: argTomorrow.toDateString() })
  } catch (err) {
    console.error('[cron/reminder] error:', err)
    return NextResponse.json({ error: 'Error sending reminders' }, { status: 500 })
  }
}
