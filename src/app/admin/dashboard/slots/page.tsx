'use client'

import { useEffect, useState } from 'react'
import type { DeliverySlot } from '@/lib/types'

export default function SlotsPage() {
  const [slots, setSlots] = useState<DeliverySlot[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState<Partial<DeliverySlot> | null>(null)

  useEffect(() => { loadSlots() }, [])

  async function loadSlots() {
    const res = await fetch('/api/admin/slots')
    setSlots(await res.json())
    setLoading(false)
  }

  async function handleSave() {
    if (!editing) return
    const method = editing.id ? 'PUT' : 'POST'
    await fetch('/api/admin/slots', {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(editing),
    })
    setEditing(null)
    loadSlots()
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this slot?')) return
    await fetch('/api/admin/slots', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    })
    loadSlots()
  }

  async function toggleActive(slot: DeliverySlot) {
    await fetch('/api/admin/slots', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: slot.id, is_active: !slot.is_active }),
    })
    loadSlots()
  }

  function duplicateSlot(slot: DeliverySlot) {
    setEditing({
      date: slot.date,
      start_time: slot.start_time,
      end_time: slot.end_time,
      max_orders: slot.max_orders,
      is_active: true,
    })
  }

  function formatDate(dateStr: string) {
    return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })
  }

  function formatTime(time: string) {
    const [h, m] = time.split(':')
    const hour = parseInt(h)
    const ampm = hour >= 12 ? 'PM' : 'AM'
    const h12 = hour % 12 || 12
    return `${h12}:${m} ${ampm}`
  }

  if (loading) return <div className="text-center py-12 text-pink-600">Loading...</div>

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-pink-900">Delivery Slots</h1>
        <button
          onClick={() => setEditing({ date: '', start_time: '10:00', end_time: '12:00', max_orders: 5, is_active: true })}
          className="bg-pink-600 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-pink-700"
        >
          + Add Slot
        </button>
      </div>

      <div className="grid gap-3">
        {slots.map(slot => (
          <div key={slot.id} className="bg-white rounded-2xl p-4 shadow-sm flex items-center gap-4">
            <div className="flex-1">
              <p className="font-semibold text-pink-900">{formatDate(slot.date)}</p>
              <p className="text-sm text-pink-600">{formatTime(slot.start_time)} - {formatTime(slot.end_time)}</p>
              <p className="text-xs text-pink-500 mt-1">{slot.current_orders} / {slot.max_orders} orders</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => toggleActive(slot)}
                className={`px-3 py-1 rounded-lg text-xs font-medium ${slot.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}
              >
                {slot.is_active ? 'Active' : 'Inactive'}
              </button>
              <button onClick={() => duplicateSlot(slot)} className="px-3 py-1 rounded-lg text-xs font-medium bg-blue-50 text-blue-600 hover:bg-blue-100">
                Duplicate
              </button>
              <button onClick={() => setEditing(slot)} className="px-3 py-1 rounded-lg text-xs font-medium bg-pink-100 text-pink-700 hover:bg-pink-200">
                Edit
              </button>
              <button onClick={() => handleDelete(slot.id)} className="px-3 py-1 rounded-lg text-xs font-medium bg-red-50 text-red-600 hover:bg-red-100">
                Delete
              </button>
            </div>
          </div>
        ))}
        {slots.length === 0 && (
          <p className="text-center py-8 text-pink-500">No delivery slots. Add one to start accepting orders!</p>
        )}
      </div>

      {/* Edit Modal */}
      {editing && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm">
            <h2 className="text-lg font-bold text-pink-900 mb-4">{editing.id ? 'Edit Slot' : 'New Slot'}</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-pink-800 mb-1">Date</label>
                <input
                  type="date"
                  value={editing.date || ''}
                  onChange={e => setEditing(p => p ? { ...p, date: e.target.value } : null)}
                  className="w-full px-4 py-2.5 border border-pink-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-pink-400 text-sm"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-pink-800 mb-1">Start Time</label>
                  <input
                    type="time"
                    value={editing.start_time || '10:00'}
                    onChange={e => setEditing(p => p ? { ...p, start_time: e.target.value } : null)}
                    className="w-full px-4 py-2.5 border border-pink-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-pink-400 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-pink-800 mb-1">End Time</label>
                  <input
                    type="time"
                    value={editing.end_time || '12:00'}
                    onChange={e => setEditing(p => p ? { ...p, end_time: e.target.value } : null)}
                    className="w-full px-4 py-2.5 border border-pink-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-pink-400 text-sm"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-pink-800 mb-1">Max Orders</label>
                <input
                  type="number"
                  value={editing.max_orders ?? 5}
                  onChange={e => setEditing(p => p ? { ...p, max_orders: parseInt(e.target.value) || 5 } : null)}
                  className="w-full px-4 py-2.5 border border-pink-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-pink-400 text-sm"
                />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={handleSave} className="flex-1 bg-pink-600 text-white py-2.5 rounded-xl font-medium hover:bg-pink-700">
                Save
              </button>
              <button onClick={() => setEditing(null)} className="flex-1 bg-gray-100 text-gray-600 py-2.5 rounded-xl font-medium hover:bg-gray-200">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
