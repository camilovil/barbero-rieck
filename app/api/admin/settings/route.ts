import { NextRequest, NextResponse } from 'next/server'
import { getSettings, saveSettings } from '@/lib/googleCalendar'
import { cookies } from 'next/headers'

async function isAdmin(): Promise<boolean> {
  const cookieStore = await cookies()
  return cookieStore.get('admin_session')?.value === process.env.ADMIN_SECRET
}

export async function GET() {
  if (!(await isAdmin())) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  const settings = await getSettings()
  return NextResponse.json(settings)
}

export async function POST(req: NextRequest) {
  if (!(await isAdmin())) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
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
