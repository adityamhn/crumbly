import { NextResponse } from 'next/server'
import { getAdminSession } from '@/lib/auth'
import { supabase } from '@/lib/supabase'

export async function POST(req: Request) {
  const session = await getAdminSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const {
    customer_name,
    whatsapp_number,
    is_dd_resident,
    address,
    building_number,
    floor_number,
    apartment_number,
    delivery_note,
    delivery_slot_id,
    items,
    delivery_charge,
    status,
  } = body

  if (!customer_name || !whatsapp_number || !address || !items?.length) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  const menuItemIds = items.map((i: { menu_item_id: string }) => i.menu_item_id)
  const { data: menuItems } = await supabase
    .from('menu_items')
    .select('*')
    .in('id', menuItemIds)

  if (!menuItems || menuItems.length !== menuItemIds.length) {
    return NextResponse.json({ error: 'Some items not found' }, { status: 400 })
  }

  const subtotal = items.reduce((sum: number, item: { menu_item_id: string; quantity: number }) => {
    const menuItem = menuItems.find((m: { id: string }) => m.id === item.menu_item_id)
    return sum + (menuItem!.price * item.quantity)
  }, 0)

  const total_amount = subtotal + (delivery_charge || 0)

  const { count } = await supabase
    .from('orders')
    .select('*', { count: 'exact', head: true })

  const order_number = `CRM-${String((count || 0) + 1).padStart(3, '0')}`

  const { data: order, error: orderError } = await supabase
    .from('orders')
    .insert({
      order_number,
      customer_name,
      whatsapp_number,
      is_dd_resident: is_dd_resident ?? true,
      address,
      building_number: building_number || '',
      floor_number: floor_number || '',
      apartment_number: apartment_number || '',
      delivery_note: delivery_note || '',
      delivery_slot_id: delivery_slot_id || null,
      subtotal,
      delivery_charge: delivery_charge || 0,
      total_amount,
      payment_screenshot_url: 'manual-order',
      status: status || 'confirmed',
    })
    .select()
    .single()

  if (orderError) {
    return NextResponse.json({ error: orderError.message }, { status: 500 })
  }

  const orderItems = items.map((item: { menu_item_id: string; quantity: number }) => {
    const menuItem = menuItems.find((m: { id: string }) => m.id === item.menu_item_id)!
    return {
      order_id: order.id,
      menu_item_id: item.menu_item_id,
      item_name: menuItem.name,
      item_price: menuItem.price,
      quantity: item.quantity,
    }
  })

  await supabase.from('order_items').insert(orderItems)

  // Decrement menu item quantities
  for (const item of items) {
    const menuItem = menuItems.find((m: { id: string }) => m.id === item.menu_item_id)!
    await supabase
      .from('menu_items')
      .update({ available_quantity: Math.max(0, menuItem.available_quantity - item.quantity) })
      .eq('id', item.menu_item_id)
  }

  // Increment slot count if slot chosen
  if (delivery_slot_id) {
    const { data: slot } = await supabase.from('delivery_slots').select('current_orders').eq('id', delivery_slot_id).single()
    if (slot) {
      await supabase
        .from('delivery_slots')
        .update({ current_orders: slot.current_orders + 1 })
        .eq('id', delivery_slot_id)
    }
  }

  return NextResponse.json({ order_id: order.id, order_number: order.order_number })
}
