import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET() {
  const now = new Date()
  const today = now.toISOString().split('T')[0]

  const { data: slots, error } = await supabase
    .from('delivery_slots')
    .select('*')
    .eq('is_active', true)
    .gte('date', today)
    .order('date', { ascending: true })
    .order('start_time', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Filter: only show slots with capacity and 2+ hours from now for same-day
  const twoHoursFromNow = new Date(now.getTime() + 2 * 60 * 60 * 1000)
  const currentTimeStr = twoHoursFromNow.toTimeString().slice(0, 5)

  const available = (slots || []).filter(slot => {
    if (slot.current_orders >= slot.max_orders) return false
    if (slot.date === today && slot.start_time <= currentTimeStr) return false
    return true
  })

  return NextResponse.json(available)
}
