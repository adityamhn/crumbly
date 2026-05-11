import { NextResponse } from 'next/server'
import { getAdminSession } from '@/lib/auth'
import { supabase } from '@/lib/supabase'

export async function GET() {
  const session = await getAdminSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data, error } = await supabase
    .from('menu_items')
    .select('*')
    .order('sort_order', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(req: Request) {
  const session = await getAdminSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { data, error } = await supabase
    .from('menu_items')
    .insert(body)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function PUT(req: Request) {
  const session = await getAdminSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { id, ...updates } = body
  if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 })

  const { data, error } = await supabase
    .from('menu_items')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function DELETE(req: Request) {
  const session = await getAdminSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await req.json()
  if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 })

  const { data: referencedOrderItems, error: referenceError } = await supabase
    .from('order_items')
    .select('id')
    .eq('menu_item_id', id)
    .limit(1)

  if (referenceError) {
    return NextResponse.json({ error: referenceError.message }, { status: 500 })
  }

  if (referencedOrderItems.length > 0) {
    const { error: hideError } = await supabase
      .from('menu_items')
      .update({ is_available: false, available_quantity: 0 })
      .eq('id', id)

    if (hideError) return NextResponse.json({ error: hideError.message }, { status: 500 })
    return NextResponse.json({
      success: true,
      hidden: true,
      message: 'Item is referenced by existing orders and was hidden to preserve order history.',
    })
  }

  const { error } = await supabase.from('menu_items').delete().eq('id', id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json({ success: true })
}
