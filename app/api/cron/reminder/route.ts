import { NextRequest, NextResponse } from 'next/server'
import { getEventsForDate } from '@/lib/googleCalendar'
import { sendReminderEmail } from '@/lib/email'

// Vercel cron — runs daily at 10:00 AM Argentina time (13:00 UTC)
// Sends reminder emails for tomorrow's appointments
export async function GET(req: NextRequest) {
  // Protect with CRON_SECRET
  const authHeader = req.headers.get('authorization')
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    // Tomorrow in Argentina time (UTC-3)
    const now = new Date()
    const tomorrow = new Date(now)
    tomorrow.setDate(tomorrow.getDate() + 1)
    // Adjust to Argentina date
    const argOffset = -3 * 60 // UTC-3 in minutes
    const argNow = new Date(now.getTime() + (argOffset - now.getTimezoneOffset()) * 60000)
    const argTomorrow = new Date(argNow)
    argTomorrow.setDate(argTomorrow.getDate() + 1)

    const events = await getEventsForDate(argTomorrow)

    let sent = 0
    for (const ev of events) {
      if (!ev.email) continue
      const dateStr = new Date(ev.start).toLocaleDateString('es-AR', {
        weekday: 'long', day: 'numeric', month: 'long', timeZone: 'America/Argentina/Buenos_Aires',
      })
      const time = new Date(ev.start).toLocaleTimeString('es-AR', {
        hour: '2-digit', minute: '2-digit', timeZone: 'America/Argentina/Buenos_Aires',
      })
      const location = ev.modalidad?.toLowerCase().includes('domicilio') ? 'domicilio' : 'local'
      await sendReminderEmail(
        ev.nombre,
        ev.email,
        dateStr,
        time,
        ev.servicio,
        location,
        ev.whatsapp,
      )
      sent++
    }

    console.log(`[cron/reminder] Sent ${sent} reminders for ${argTomorrow.toDateString()}`)
    return NextResponse.json({ success: true, sent, date: argTomorrow.toDateString() })
  } catch (err) {
    console.error('[cron/reminder] error:', err)
    return NextResponse.json({ error: 'Error sending reminders' }, { status: 500 })
  }
}
