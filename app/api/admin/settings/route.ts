import { NextRequest, NextResponse } from 'next/server'
import { getSettings, saveSettings } from '@/lib/googleCalendar'

// Auth handled by middleware
export async function GET() {
  const settings = await getSettings()
  return NextResponse.json(settings)
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const current = await getSettings()
    const updated = { ...current, ...body }
    if (typeof updated.maxDailyBookings !== 'number' || updated.maxDailyBookings < 1 || updated.maxDailyBookings > 30) {
      return NextResponse.json({ error: 'Valor inválido (1-30)' }, { status: 400 })
    }
    await saveSettings(updated)
    return NextResponse.json(updated)
  } catch (err) {
    console.error('[admin/settings] error:', err)
    return NextResponse.json({ error: 'Error al guardar' }, { status: 500 })
  }
}
