import { NextRequest, NextResponse } from 'next/server'
import { getEventsForDate } from '@/lib/googleCalendar'
import { sendReminderEmail } from '@/lib/email'
import { hhmm } from '@/lib/format'

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
