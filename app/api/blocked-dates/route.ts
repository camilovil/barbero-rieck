import { NextRequest, NextResponse } from 'next/server'
import { getBlockedDates } from '@/lib/googleCalendar'

// Public endpoint — returns blocked date strings for the calendar
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const days = parseInt(searchParams.get('days') ?? '90')

  try {
    const blocked = await getBlockedDates(days)
    return NextResponse.json({ blocked: blocked.map(b => b.date) })
  } catch (err) {
    console.error('[api/blocked-dates] error:', err)
    return NextResponse.json({ blocked: [] })
  }
}
