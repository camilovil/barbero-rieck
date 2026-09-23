import { NextResponse } from 'next/server'
import { getTurnosEntre } from '@/lib/googleCalendar'
import { resumirIngresos } from '@/lib/ingresos'
import { diaBA, precioServicio } from '@/lib/format'

/** Cuántos meses para atrás muestra el registro, contando el actual. */
const MESES = 12

// La autenticación la resuelve proxy.ts
export async function GET() {
  try {
    /* Del primer día del mes de hace once meses hasta el último de este, en
       días de Buenos Aires. Hasta fin de mes y no hasta hoy: lo que queda
       agendado del mes es lo «previsto» que se muestra al lado. */
    const ahora = new Date()
    const [y, m] = diaBA(ahora).split('-').map(Number)
    const mes = (n: number) => {
      const d = new Date(Date.UTC(y, m - 1 + n, 1))
      return new Date(`${d.toISOString().slice(0, 10)}T00:00:00-03:00`)
    }

    const turnos = await getTurnosEntre(mes(-(MESES - 1)), mes(1))
    return NextResponse.json(resumirIngresos(
      turnos.map(t => ({ start: t.start, monto: precioServicio(t.servicio) + t.viatico, pago: t.pago })),
      ahora,
    ))
  } catch (err) {
    console.error('[api/admin/ingresos] error:', err)
    return NextResponse.json({ error: 'No se pudieron calcular los cobros' }, { status: 500 })
  }
}
