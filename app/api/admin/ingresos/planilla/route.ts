import { NextRequest, NextResponse } from 'next/server'
import { getTurnosEntre } from '@/lib/googleCalendar'
import { inicioDeMes, planillaDelMes } from '@/lib/ingresos'

// La autenticación la resuelve proxy.ts
export async function GET(req: NextRequest) {
  const mes = req.nextUrl.searchParams.get('mes') ?? ''
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(mes)) {
    return NextResponse.json({ error: 'Mes inválido (AAAA-MM)' }, { status: 400 })
  }

  try {
    const turnos = await getTurnosEntre(inicioDeMes(mes), inicioDeMes(mes, 1))
    return new Response(planillaDelMes(turnos, mes), {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="cobros-${mes}.csv"`,
        'Cache-Control': 'no-store',
      },
    })
  } catch (err) {
    console.error('[api/admin/ingresos/planilla] error:', err)
    return NextResponse.json({ error: 'No se pudo armar la planilla' }, { status: 500 })
  }
}
