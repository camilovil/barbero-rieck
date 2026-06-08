import { NextRequest, NextResponse } from 'next/server'
import { getEventsForDate } from '@/lib/googleCalendar'
import { sendDailySummaryEmail } from '@/lib/email'

// Vercel cron — runs daily at 8:00 AM Argentina time (11:00 UTC)
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const today = new Date()
    const events = await getEventsForDate(today)

    if (!process.env.SANTIAGO_EMAIL) {
      return NextResponse.json({ skipped: true, reason: 'SANTIAGO_EMAIL not set' })
    }

    await sendDailySummaryEmail(events, today)

    return NextResponse.json({ success: true, turnos: events.length, date: today.toDateString() })
  } catch (err) {
    console.error('[cron/daily-summary] error:', err)
    return NextResponse.json({ error: 'Error sending summary' }, { status: 500 })
  }
}
