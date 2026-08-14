import { NextRequest, NextResponse } from 'next/server'
import { expirePendingEvents } from '@/lib/googleCalendar'

/* Libera los turnos que reservaron y nunca pagaron la seña.
   No está en vercel.json: el plan Hobby admite dos crons y ya están usados
   por el recordatorio y el resumen diario, y además no baja de una corrida
   por día, que para un plazo de veinte minutos no sirve. La red que sostiene
   esto es el barrido que hacen /api/booking y /api/availability cada vez que
   alguien mira o toma un horario; esta ruta queda para engancharla a un cron
   cada quince minutos el día que el proyecto pase a Pro, o a un cron externo. */
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const liberados = await expirePendingEvents()
    if (liberados) console.log(`[cron/expire-holds] liberó ${liberados} turno(s) sin seña`)
    return NextResponse.json({ success: true, liberados })
  } catch (err) {
    console.error('[cron/expire-holds] error:', err)
    return NextResponse.json({ error: 'Error liberando turnos' }, { status: 500 })
  }
}
