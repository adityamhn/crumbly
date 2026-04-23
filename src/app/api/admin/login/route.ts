import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { createToken } from '@/lib/auth'
import { supabase } from '@/lib/supabase'

export async function POST(req: Request) {
  const { password } = await req.json()
  if (!password) {
    return NextResponse.json({ error: 'Password required' }, { status: 400 })
  }

  const { data: settings, error } = await supabase
    .from('settings')
    .select('admin_password_hash')
    .single()

  if (error || !settings) {
    return NextResponse.json({ error: 'Settings not found', details: error?.message }, { status: 500 })
  }

  const valid = await bcrypt.compare(password, settings.admin_password_hash)
  if (!valid) {
    return NextResponse.json({ error: 'Invalid password' }, { status: 401 })
  }

  const token = await createToken()
  const response = NextResponse.json({ success: true })
  response.cookies.set('admin_token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7, // 7 days
    path: '/',
  })
  return response
}
