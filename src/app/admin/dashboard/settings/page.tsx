'use client'

import { useEffect, useState } from 'react'

interface SettingsForm {
  bakery_name: string
  description: string
  logo_url: string
  upi_id: string
  qr_code_url: string
  whatsapp_number: string
  pickup_address: string
  pickup_building: string
  pickup_floor: string
  pickup_apartment: string
  pickup_note: string
  pickup_latitude: string
  pickup_longitude: string
  pickup_phone: string
  delivery_radius_km: number
}

export default function SettingsPage() {
  const [form, setForm] = useState<SettingsForm>({
    bakery_name: '',
    description: '',
    logo_url: '',
    upi_id: '',
    qr_code_url: '',
    whatsapp_number: '',
    pickup_address: '',
    pickup_building: '',
    pickup_floor: '',
    pickup_apartment: '',
    pickup_note: '',
    pickup_latitude: '',
    pickup_longitude: '',
    pickup_phone: '',
    delivery_radius_km: 10,
  })
  const [newPassword, setNewPassword] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/admin/settings')
      .then(r => r.json())
      .then(data => {
        setForm({
          bakery_name: data.bakery_name || '',
          description: data.description || '',
          logo_url: data.logo_url || '',
          upi_id: data.upi_id || '',
          qr_code_url: data.qr_code_url || '',
          whatsapp_number: data.whatsapp_number || '',
          pickup_address: data.pickup_address || '',
          pickup_building: data.pickup_building || '',
          pickup_floor: data.pickup_floor || '',
          pickup_apartment: data.pickup_apartment || '',
          pickup_note: data.pickup_note || '',
          pickup_latitude: data.pickup_latitude || '',
          pickup_longitude: data.pickup_longitude || '',
          pickup_phone: data.pickup_phone || '',
          delivery_radius_km: data.delivery_radius_km || 10,
        })
        setLoading(false)
      })
  }, [])

  async function handleUpload(field: 'logo_url' | 'qr_code_url', file: File) {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('bucket', 'images')
    const res = await fetch('/api/upload', { method: 'POST', body: formData })
    const data = await res.json()
    if (data.url) {
      setForm(prev => ({ ...prev, [field]: data.url }))
    }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    const body: Record<string, unknown> = { ...form }
    if (newPassword) body.new_password = newPassword

    await fetch('/api/admin/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    setSaving(false)
    setSaved(true)
    setNewPassword('')
    setTimeout(() => setSaved(false), 2000)
  }

  if (loading) return <div className="text-center py-12 text-amber-600">Loading...</div>

  return (
    <div>
      <h1 className="text-2xl font-bold text-amber-900 mb-6">Settings</h1>
      <form onSubmit={handleSave} className="space-y-6 max-w-2xl">
        {/* Branding */}
        <Section title="Branding">
          <Field label="Bakery Name" value={form.bakery_name} onChange={v => setForm(p => ({ ...p, bakery_name: v }))} />
          <Field label="Description" value={form.description} onChange={v => setForm(p => ({ ...p, description: v }))} textarea />
          <div>
            <label className="block text-sm font-medium text-amber-800 mb-1">Logo</label>
            {form.logo_url && <img src={form.logo_url} alt="Logo" className="h-16 mb-2 rounded-lg" />}
            <input type="file" accept="image/*" onChange={e => e.target.files?.[0] && handleUpload('logo_url', e.target.files[0])} className="text-sm" />
          </div>
        </Section>

        {/* Payment */}
        <Section title="Payment">
          <Field label="UPI ID" value={form.upi_id} onChange={v => setForm(p => ({ ...p, upi_id: v }))} placeholder="name@upi" />
          <div>
            <label className="block text-sm font-medium text-amber-800 mb-1">QR Code</label>
            {form.qr_code_url && <img src={form.qr_code_url} alt="QR" className="h-32 mb-2 rounded-lg" />}
            <input type="file" accept="image/*" onChange={e => e.target.files?.[0] && handleUpload('qr_code_url', e.target.files[0])} className="text-sm" />
          </div>
        </Section>

        {/* Contact */}
        <Section title="Contact">
          <Field label="WhatsApp Number" value={form.whatsapp_number} onChange={v => setForm(p => ({ ...p, whatsapp_number: v }))} placeholder="919876543210" />
        </Section>

        {/* Delivery / Borzo */}
        <Section title="Pickup Address (Borzo)">
          <Field label="Full Address" value={form.pickup_address} onChange={v => setForm(p => ({ ...p, pickup_address: v }))} textarea />
          <div className="grid grid-cols-3 gap-4">
            <Field label="Building" value={form.pickup_building} onChange={v => setForm(p => ({ ...p, pickup_building: v }))} placeholder="Optional" />
            <Field label="Floor" value={form.pickup_floor} onChange={v => setForm(p => ({ ...p, pickup_floor: v }))} placeholder="Optional" />
            <Field label="Flat/Unit" value={form.pickup_apartment} onChange={v => setForm(p => ({ ...p, pickup_apartment: v }))} placeholder="Optional" />
          </div>
          <Field label="How to get there" value={form.pickup_note} onChange={v => setForm(p => ({ ...p, pickup_note: v }))} placeholder="Landmarks, gate instructions for courier" />
          <div className="grid grid-cols-2 gap-4">
            <Field label="Latitude" value={form.pickup_latitude} onChange={v => setForm(p => ({ ...p, pickup_latitude: v }))} />
            <Field label="Longitude" value={form.pickup_longitude} onChange={v => setForm(p => ({ ...p, pickup_longitude: v }))} />
          </div>
          <Field label="Pickup Phone" value={form.pickup_phone} onChange={v => setForm(p => ({ ...p, pickup_phone: v }))} placeholder="919876543210" />
          <Field label="Delivery Radius (km)" value={String(form.delivery_radius_km)} onChange={v => setForm(p => ({ ...p, delivery_radius_km: parseInt(v) || 10 }))} type="number" />
        </Section>

        {/* Password */}
        <Section title="Security">
          <Field label="New Password (leave blank to keep current)" value={newPassword} onChange={setNewPassword} type="password" />
        </Section>

        <button
          type="submit"
          disabled={saving}
          className="bg-amber-600 text-white px-6 py-3 rounded-xl font-medium hover:bg-amber-700 disabled:opacity-50 transition-colors"
        >
          {saving ? 'Saving...' : saved ? 'Saved!' : 'Save Settings'}
        </button>
      </form>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm">
      <h2 className="font-semibold text-amber-900 mb-4">{title}</h2>
      <div className="space-y-4">{children}</div>
    </div>
  )
}

function Field({
  label, value, onChange, type = 'text', placeholder, textarea
}: {
  label: string; value: string; onChange: (v: string) => void; type?: string; placeholder?: string; textarea?: boolean
}) {
  const className = "w-full px-4 py-2.5 border border-amber-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-400 text-sm"
  return (
    <div>
      <label className="block text-sm font-medium text-amber-800 mb-1">{label}</label>
      {textarea ? (
        <textarea value={value} onChange={e => onChange(e.target.value)} className={className} rows={3} placeholder={placeholder} />
      ) : (
        <input type={type} value={value} onChange={e => onChange(e.target.value)} className={className} placeholder={placeholder} />
      )}
    </div>
  )
}
