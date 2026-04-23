import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { calculateDeliveryCost } from '@/lib/borzo'

export async function POST(req: Request) {
  const { address, building_number, floor_number, apartment_number, delivery_note, customerPhone, customerName } = await req.json()

  if (!address) {
    return NextResponse.json({ error: 'Address is required' }, { status: 400 })
  }

  const { data: settings } = await supabase.from('settings').select('*').single()

  if (!settings) {
    return NextResponse.json({ error: 'Settings not configured' }, { status: 500 })
  }

  const result = await calculateDeliveryCost(
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
      address,
      building_number,
      floor_number,
      apartment_number,
      note: delivery_note,
    },
    customerPhone || '9999999999',
    customerName || 'Customer'
  )

  if (!result.is_successful) {
    return NextResponse.json(
      { error: 'Cannot deliver to this address', details: result.errors },
      { status: 400 }
    )
  }

  return NextResponse.json({
    delivery_cost: parseFloat(result.order!.payment_amount),
  })
}
