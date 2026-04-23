import { NextResponse } from 'next/server'
import { getAdminSession } from '@/lib/auth'
import { supabase } from '@/lib/supabase'

export async function GET(req: Request) {
  const session = await getAdminSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const status = searchParams.get('status')
  const type = searchParams.get('type') // 'dd' or 'outside'

  let query = supabase
    .from('orders')
    .select('*, delivery_slot:delivery_slots(*), order_items(*)')
    .order('created_at', { ascending: false })

  if (status) query = query.eq('status', status)
  if (type === 'dd') query = query.eq('is_dd_resident', true)
  if (type === 'outside') query = query.eq('is_dd_resident', false)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
