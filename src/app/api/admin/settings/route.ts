import { NextResponse } from 'next/server'
import { getAdminSession } from '@/lib/auth'
import { supabase } from '@/lib/supabase'
import bcrypt from 'bcryptjs'

export async function GET() {
  const session = await getAdminSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data, error } = await supabase.from('settings').select('*').single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Don't expose password hash
  const { admin_password_hash: _, ...settings } = data
  return NextResponse.json(settings)
}

export async function PUT(req: Request) {
  const session = await getAdminSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()

  // If updating password, hash it
  if (body.new_password) {
    body.admin_password_hash = await bcrypt.hash(body.new_password, 10)
    delete body.new_password
  }

  // Don't allow direct password hash setting from client
  if (body.admin_password_hash && !body.new_password) {
    delete body.admin_password_hash
  }

  const { data: current } = await supabase.from('settings').select('id').single()
  if (!current) return NextResponse.json({ error: 'Settings not found' }, { status: 500 })

  const { data, error } = await supabase
    .from('settings')
    .update(body)
    .eq('id', current.id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const { admin_password_hash: _, ...settings } = data
  return NextResponse.json(settings)
}
