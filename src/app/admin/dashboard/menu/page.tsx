'use client'

import { useEffect, useState } from 'react'
import type { MenuItem } from '@/lib/types'

export default function MenuPage() {
  const [items, setItems] = useState<MenuItem[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState<Partial<MenuItem> | null>(null)
  const [uploading, setUploading] = useState(false)

  useEffect(() => { loadItems() }, [])

  async function loadItems() {
    const res = await fetch('/api/admin/menu')
    setItems(await res.json())
    setLoading(false)
  }

  async function handleUploadImage(file: File) {
    setUploading(true)
    const formData = new FormData()
    formData.append('file', file)
    formData.append('bucket', 'images')
    const res = await fetch('/api/upload', { method: 'POST', body: formData })
    const data = await res.json()
    setUploading(false)
    if (data.url) {
      setEditing(prev => prev ? { ...prev, image_url: data.url } : null)
    }
  }

  async function handleSave() {
    if (!editing) return
    const method = editing.id ? 'PUT' : 'POST'
    await fetch('/api/admin/menu', {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(editing),
    })
    setEditing(null)
    loadItems()
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this item?')) return
    await fetch('/api/admin/menu', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    })
    loadItems()
  }

  async function toggleAvailable(item: MenuItem) {
    await fetch('/api/admin/menu', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: item.id, is_available: !item.is_available }),
    })
    loadItems()
  }

  if (loading) return <div className="text-center py-12 text-amber-600">Loading...</div>

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-amber-900">Menu Items</h1>
        <button
          onClick={() => setEditing({ name: '', description: '', price: 0, available_quantity: 0, is_available: true, sort_order: items.length })}
          className="bg-amber-600 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-amber-700"
        >
          + Add Item
        </button>
      </div>

      {/* Item List */}
      <div className="grid gap-4">
        {items.map(item => (
          <div key={item.id} className="bg-white rounded-2xl p-4 shadow-sm flex items-center gap-4">
            {item.image_url ? (
              <img src={item.image_url} alt={item.name} className="w-16 h-16 rounded-xl object-cover" />
            ) : (
              <div className="w-16 h-16 rounded-xl bg-amber-100 flex items-center justify-center text-amber-400 text-xs">No img</div>
            )}
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-amber-900">{item.name}</h3>
              <p className="text-sm text-amber-600 truncate">{item.description}</p>
              <p className="text-sm font-medium text-amber-800">₹{item.price} · Qty: {item.available_quantity}</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => toggleAvailable(item)}
                className={`px-3 py-1 rounded-lg text-xs font-medium ${item.is_available ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}
              >
                {item.is_available ? 'Active' : 'Hidden'}
              </button>
              <button onClick={() => setEditing(item)} className="px-3 py-1 rounded-lg text-xs font-medium bg-amber-100 text-amber-700 hover:bg-amber-200">
                Edit
              </button>
              <button onClick={() => handleDelete(item.id)} className="px-3 py-1 rounded-lg text-xs font-medium bg-red-50 text-red-600 hover:bg-red-100">
                Delete
              </button>
            </div>
          </div>
        ))}
        {items.length === 0 && (
          <p className="text-center py-8 text-amber-500">No menu items yet. Add your first item!</p>
        )}
      </div>

      {/* Edit Modal */}
      {editing && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-bold text-amber-900 mb-4">{editing.id ? 'Edit Item' : 'New Item'}</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-amber-800 mb-1">Name</label>
                <input
                  value={editing.name || ''}
                  onChange={e => setEditing(p => p ? { ...p, name: e.target.value } : null)}
                  className="w-full px-4 py-2.5 border border-amber-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-400 text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-amber-800 mb-1">Description</label>
                <textarea
                  value={editing.description || ''}
                  onChange={e => setEditing(p => p ? { ...p, description: e.target.value } : null)}
                  className="w-full px-4 py-2.5 border border-amber-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-400 text-sm"
                  rows={2}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-amber-800 mb-1">Price (₹)</label>
                  <input
                    type="number"
                    value={editing.price || ''}
                    onChange={e => setEditing(p => p ? { ...p, price: parseFloat(e.target.value) || 0 } : null)}
                    className="w-full px-4 py-2.5 border border-amber-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-400 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-amber-800 mb-1">Quantity</label>
                  <input
                    type="number"
                    value={editing.available_quantity ?? ''}
                    onChange={e => setEditing(p => p ? { ...p, available_quantity: parseInt(e.target.value) || 0 } : null)}
                    className="w-full px-4 py-2.5 border border-amber-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-400 text-sm"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-amber-800 mb-1">Sort Order</label>
                <input
                  type="number"
                  value={editing.sort_order ?? 0}
                  onChange={e => setEditing(p => p ? { ...p, sort_order: parseInt(e.target.value) || 0 } : null)}
                  className="w-full px-4 py-2.5 border border-amber-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-400 text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-amber-800 mb-1">Image</label>
                {editing.image_url && <img src={editing.image_url} alt="" className="h-24 rounded-xl mb-2 object-cover" />}
                <input
                  type="file"
                  accept="image/*"
                  onChange={e => e.target.files?.[0] && handleUploadImage(e.target.files[0])}
                  className="text-sm"
                />
                {uploading && <p className="text-xs text-amber-500 mt-1">Uploading...</p>}
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={handleSave} className="flex-1 bg-amber-600 text-white py-2.5 rounded-xl font-medium hover:bg-amber-700">
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
