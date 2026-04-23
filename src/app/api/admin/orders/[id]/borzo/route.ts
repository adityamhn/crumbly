import { NextResponse } from 'next/server'
import { getAdminSession } from '@/lib/auth'
import { supabase } from '@/lib/supabase'
import { createBorzoOrder } from '@/lib/borzo'

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getAdminSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params

  // Get order details
  const { data: order } = await supabase
    .from('orders')
    .select('*')
    .eq('id', id)
    .single()

  if (!order) return NextResponse.json({ error: 'Order not found' }, { status: 404 })
  if (order.borzo_order_id) return NextResponse.json({ error: 'Borzo order already created' }, { status: 400 })
  if (order.is_dd_resident) return NextResponse.json({ error: 'DD orders do not need Borzo' }, { status: 400 })

  // Get settings for pickup address
  const { data: settings } = await supabase.from('settings').select('*').single()
  if (!settings) return NextResponse.json({ error: 'Settings not found' }, { status: 500 })

  const result = await createBorzoOrder(
    {
      address: settings.pickup_address,
      building_number: settings.pickup_building,
      floor_number: settings.pickup_floor,
      apartment_number: settings.pickup_apartment,
      note: settings.pickup_note,
      latitude: settings.pickup_latitude,
      longitude: settings.pickup_longitude,
    },
    settings.pickup_phone,
    settings.bakery_name,
    {
      address: order.address,
      building_number: order.building_number,
      floor_number: order.floor_number,
      apartment_number: order.apartment_number,
      note: order.delivery_note,
    },
    order.whatsapp_number,
    order.customer_name,
    order.order_number
  )

  if (!result.is_successful) {
    return NextResponse.json(
      { error: 'Borzo order failed', details: result.errors },
      { status: 500 }
    )
  }

  // Update order with Borzo info
  await supabase
    .from('orders')
    .update({
      borzo_order_id: String(result.order!.order_id),
      borzo_status: result.order!.status,
    })
    .eq('id', id)

  return NextResponse.json({ success: true, borzo_order: result.order })
}
