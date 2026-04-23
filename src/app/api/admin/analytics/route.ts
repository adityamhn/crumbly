import { NextResponse } from 'next/server'
import { getAdminSession } from '@/lib/auth'
import { supabase } from '@/lib/supabase'

export async function GET() {
  const session = await getAdminSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: orders } = await supabase
    .from('orders')
    .select('is_dd_resident, total_amount, delivery_charge')

  if (!orders) return NextResponse.json({ total_orders: 0, dd_orders: 0, outside_orders: 0, total_revenue: 0, total_delivery_charges: 0 })

  const analytics = {
    total_orders: orders.length,
    dd_orders: orders.filter(o => o.is_dd_resident).length,
    outside_orders: orders.filter(o => !o.is_dd_resident).length,
    total_revenue: orders.reduce((sum, o) => sum + Number(o.total_amount), 0),
    total_delivery_charges: orders.reduce((sum, o) => sum + Number(o.delivery_charge), 0),
  }

  return NextResponse.json(analytics)
}
