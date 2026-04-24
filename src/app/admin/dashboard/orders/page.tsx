'use client'

import { useEffect, useRef, useState } from 'react'
import type { Order, MenuItem, DeliverySlot } from '@/lib/types'

interface ManualOrderForm {
  customer_name: string
  whatsapp_number: string
  is_dd_resident: boolean
  address: string
  building_number: string
  floor_number: string
  apartment_number: string
  delivery_note: string
  delivery_slot_id: string
  delivery_charge: number
  status: 'confirmed' | 'preparing' | 'ready' | 'delivered'
  items: { menu_item_id: string; quantity: number }[]
}

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'dd' | 'outside'>('all')
  const [statusFilter, setStatusFilter] = useState<string>('')
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)
  const [borzoPending, setBorzoPending] = useState<string | null>(null)
  const [notifPermission, setNotifPermission] = useState<NotificationPermission>('default')

  // Manual order
  const [creating, setCreating] = useState(false)
  const [menuItems, setMenuItems] = useState<MenuItem[]>([])
  const [slots, setSlots] = useState<DeliverySlot[]>([])
  const [manualForm, setManualForm] = useState<ManualOrderForm>({
    customer_name: '',
    whatsapp_number: '',
    is_dd_resident: true,
    address: '',
    building_number: '',
    floor_number: '',
    apartment_number: '',
    delivery_note: '',
    delivery_slot_id: '',
    delivery_charge: 0,
    status: 'confirmed',
    items: [],
  })
  const [submittingManual, setSubmittingManual] = useState(false)

  // Track seen IDs for notifications (avoid notifying on first load)
  const seenIdsRef = useRef<Set<string> | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  // Ask for notification permission on mount
  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setNotifPermission(Notification.permission)
      if (Notification.permission === 'default') {
        Notification.requestPermission().then(p => setNotifPermission(p))
      }
    }
    // Preload a simple chime using Web Audio — no external file needed
    audioRef.current = new Audio('data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAAAAA=')
  }, [])

  // Load orders + poll every 5s
  useEffect(() => {
    let cancelled = false

    async function tick() {
      const params = new URLSearchParams()
      if (filter !== 'all') params.set('type', filter)
      if (statusFilter) params.set('status', statusFilter)
      try {
        const res = await fetch(`/api/admin/orders?${params}`)
        if (!res.ok) return
        const data: Order[] = await res.json()
        if (cancelled || !Array.isArray(data)) return

        if (seenIdsRef.current === null) {
          // First load — just mark as seen, don't notify
          seenIdsRef.current = new Set(data.map(o => o.id))
        } else {
          const newOrders = data.filter(o => !seenIdsRef.current!.has(o.id))
          newOrders.forEach(o => {
            seenIdsRef.current!.add(o.id)
            if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
              const n = new Notification(`New Crumbly order: ${o.order_number}`, {
                body: `${o.customer_name} · ₹${o.total_amount}`,
                tag: o.id,
              })
              n.onclick = () => window.focus()
            }
            // Soft beep
            audioRef.current?.play().catch(() => {})
          })
        }

        setOrders(data)
        setLoading(false)
      } catch {
        // swallow network errors during polling
      }
    }

    tick()
    const iv = setInterval(tick, 5000)
    return () => {
      cancelled = true
      clearInterval(iv)
    }
  }, [filter, statusFilter])

  async function loadOrdersOnce() {
    const params = new URLSearchParams()
    if (filter !== 'all') params.set('type', filter)
    if (statusFilter) params.set('status', statusFilter)
    const res = await fetch(`/api/admin/orders?${params}`)
    const data = await res.json()
    if (Array.isArray(data)) {
      setOrders(data)
      data.forEach(o => seenIdsRef.current?.add(o.id))
    }
  }

  async function updateStatus(orderId: string, status: string) {
    await fetch(`/api/admin/orders/${orderId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    })
    loadOrdersOnce()
    if (selectedOrder?.id === orderId) {
      setSelectedOrder(prev => prev ? { ...prev, status: status as Order['status'] } : null)
    }
  }

  async function createBorzoOrder(orderId: string) {
    setBorzoPending(orderId)
    const res = await fetch(`/api/admin/orders/${orderId}/borzo`, { method: 'POST' })
    const data = await res.json()
    setBorzoPending(null)
    if (data.success) {
      alert('Borzo delivery created!')
      loadOrdersOnce()
    } else {
      alert(`Borzo error: ${data.error}`)
    }
  }

  async function openManualOrderModal() {
    const [menuRes, slotsRes] = await Promise.all([
      fetch('/api/admin/menu'),
      fetch('/api/admin/slots'),
    ])
    const [menu, slotList] = await Promise.all([menuRes.json(), slotsRes.json()])
    setMenuItems(Array.isArray(menu) ? menu : [])
    setSlots(Array.isArray(slotList) ? slotList : [])
    setManualForm({
      customer_name: '',
      whatsapp_number: '',
      is_dd_resident: true,
      address: '',
      building_number: '',
      floor_number: '',
      apartment_number: '',
      delivery_note: '',
      delivery_slot_id: '',
      delivery_charge: 0,
      status: 'confirmed',
      items: [],
    })
    setCreating(true)
  }

  function updateManualItem(menuItemId: string, qty: number) {
    setManualForm(prev => {
      const existing = prev.items.find(i => i.menu_item_id === menuItemId)
      if (qty <= 0) return { ...prev, items: prev.items.filter(i => i.menu_item_id !== menuItemId) }
      if (existing) return { ...prev, items: prev.items.map(i => i.menu_item_id === menuItemId ? { ...i, quantity: qty } : i) }
      return { ...prev, items: [...prev.items, { menu_item_id: menuItemId, quantity: qty }] }
    })
  }

  async function submitManualOrder() {
    if (!manualForm.customer_name || !manualForm.whatsapp_number || !manualForm.address || manualForm.items.length === 0) {
      alert('Please fill customer name, WhatsApp, address, and add at least one item.')
      return
    }
    setSubmittingManual(true)
    const res = await fetch('/api/admin/orders/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(manualForm),
    })
    const data = await res.json()
    setSubmittingManual(false)
    if (res.ok) {
      setCreating(false)
      loadOrdersOnce()
    } else {
      alert(data.error || 'Failed to create order')
    }
  }

  function formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
  }

  function formatSlot(order: Order) {
    if (!order.delivery_slot) return '-'
    const slot = order.delivery_slot
    const date = new Date(slot.date + 'T00:00:00').toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })
    const formatT = (t: string) => {
      const [h, m] = t.split(':')
      const hour = parseInt(h)
      return `${hour % 12 || 12}:${m} ${hour >= 12 ? 'PM' : 'AM'}`
    }
    return `${date}, ${formatT(slot.start_time)}-${formatT(slot.end_time)}`
  }

  const manualSubtotal = manualForm.items.reduce((sum, it) => {
    const m = menuItems.find(mi => mi.id === it.menu_item_id)
    return sum + (m ? m.price * it.quantity : 0)
  }, 0)
  const manualTotal = manualSubtotal + (manualForm.delivery_charge || 0)

  const statusColors: Record<string, string> = {
    confirmed: 'bg-blue-100 text-blue-700',
    preparing: 'bg-yellow-100 text-yellow-700',
    ready: 'bg-green-100 text-green-700',
    delivered: 'bg-gray-100 text-gray-600',
  }

  if (loading) return <div className="text-center py-12 text-pink-600">Loading...</div>

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold text-pink-900">Orders</h1>
        <div className="flex items-center gap-2">
          {notifPermission === 'default' && (
            <button
              onClick={() => Notification.requestPermission().then(setNotifPermission)}
              className="text-xs text-pink-600 underline"
            >
              Enable notifications
            </button>
          )}
          {notifPermission === 'denied' && (
            <span className="text-xs text-red-500">Notifications blocked</span>
          )}
          {notifPermission === 'granted' && (
            <span className="text-xs text-green-600">🔔 Live</span>
          )}
          <button
            onClick={openManualOrderModal}
            className="bg-pink-600 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-pink-700"
          >
            + Manual Order
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-2 mb-4 flex-wrap">
        {(['all', 'dd', 'outside'] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium ${filter === f ? 'bg-pink-200 text-pink-900' : 'bg-pink-50 text-pink-600'}`}
          >
            {f === 'all' ? 'All' : f === 'dd' ? 'Diamond District' : 'Outside DD'}
          </button>
        ))}
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          className="px-3 py-1.5 rounded-lg text-xs font-medium bg-pink-50 text-pink-600 border-none"
        >
          <option value="">All Status</option>
          <option value="confirmed">Confirmed</option>
          <option value="preparing">Preparing</option>
          <option value="ready">Ready</option>
          <option value="delivered">Delivered</option>
        </select>
      </div>

      {/* Orders List */}
      <div className="space-y-3">
        {orders.map(order => (
          <div
            key={order.id}
            className="bg-white rounded-2xl p-4 shadow-sm cursor-pointer hover:shadow-md transition-shadow"
            onClick={() => setSelectedOrder(order)}
          >
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-pink-900">{order.order_number}</span>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[order.status]}`}>
                    {order.status}
                  </span>
                  {order.is_dd_resident ? (
                    <span className="px-2 py-0.5 rounded-full text-xs bg-purple-50 text-purple-600">DD</span>
                  ) : (
                    <span className="px-2 py-0.5 rounded-full text-xs bg-orange-50 text-orange-600">Outside</span>
                  )}
                  {order.payment_screenshot_url === 'manual-order' && (
                    <span className="px-2 py-0.5 rounded-full text-xs bg-gray-100 text-gray-600">Manual</span>
                  )}
                </div>
                <p className="text-sm text-pink-600 mt-1">{order.customer_name} · {order.address}</p>
                <p className="text-xs text-pink-400 mt-0.5">{formatSlot(order)}</p>
              </div>
              <div className="text-right">
                <p className="font-bold text-pink-900">₹{order.total_amount}</p>
                <p className="text-xs text-pink-500">{formatDate(order.created_at)}</p>
              </div>
            </div>
          </div>
        ))}
        {orders.length === 0 && (
          <p className="text-center py-8 text-pink-500">No orders yet.</p>
        )}
      </div>

      {/* Order Detail Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-pink-900">{selectedOrder.order_number}</h2>
              <button onClick={() => setSelectedOrder(null)} className="text-gray-400 hover:text-gray-600 text-xl">&times;</button>
            </div>

            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-pink-600">Customer</span>
                <span className="font-medium">{selectedOrder.customer_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-pink-600">WhatsApp</span>
                <a href={`https://wa.me/${selectedOrder.whatsapp_number}`} className="font-medium text-green-600" target="_blank">{selectedOrder.whatsapp_number}</a>
              </div>
              <div className="flex justify-between">
                <span className="text-pink-600">Address</span>
                <span className="font-medium text-right max-w-[60%]">{selectedOrder.address}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-pink-600">Type</span>
                <span className="font-medium">{selectedOrder.is_dd_resident ? 'Diamond District' : 'Outside DD'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-pink-600">Slot</span>
                <span className="font-medium">{formatSlot(selectedOrder)}</span>
              </div>

              <hr className="border-pink-100" />

              {/* Order Items */}
              <div>
                <p className="text-pink-600 mb-2">Items</p>
                {selectedOrder.order_items?.map(item => (
                  <div key={item.id} className="flex justify-between text-sm py-1">
                    <span>{item.item_name} x{item.quantity}</span>
                    <span className="font-medium">₹{item.item_price * item.quantity}</span>
                  </div>
                ))}
              </div>

              <hr className="border-pink-100" />

              <div className="flex justify-between">
                <span className="text-pink-600">Subtotal</span>
                <span className="font-medium">₹{selectedOrder.subtotal}</span>
              </div>
              {selectedOrder.delivery_charge > 0 && (
                <div className="flex justify-between">
                  <span className="text-pink-600">Delivery</span>
                  <span className="font-medium">₹{selectedOrder.delivery_charge}</span>
                </div>
              )}
              <div className="flex justify-between text-base">
                <span className="font-semibold text-pink-900">Total</span>
                <span className="font-bold text-pink-900">₹{selectedOrder.total_amount}</span>
              </div>

              <hr className="border-pink-100" />

              {/* Payment Screenshot */}
              {selectedOrder.payment_screenshot_url === 'manual-order' ? (
                <p className="text-xs text-gray-500 italic">Manual order — no screenshot</p>
              ) : (
                <div>
                  <p className="text-pink-600 mb-2">Payment Screenshot</p>
                  <a href={selectedOrder.payment_screenshot_url} target="_blank" rel="noopener noreferrer">
                    <img src={selectedOrder.payment_screenshot_url} alt="Payment" className="w-full rounded-xl border border-pink-100" />
                  </a>
                </div>
              )}

              <hr className="border-pink-100" />

              {/* Status Update */}
              <div>
                <p className="text-pink-600 mb-2">Update Status</p>
                <div className="flex gap-2 flex-wrap">
                  {['confirmed', 'preparing', 'ready', 'delivered'].map(s => (
                    <button
                      key={s}
                      onClick={() => updateStatus(selectedOrder.id, s)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize ${
                        selectedOrder.status === s ? statusColors[s] + ' ring-2 ring-offset-1' : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              {/* Borzo Button for outside DD */}
              {!selectedOrder.is_dd_resident && !selectedOrder.borzo_order_id && (
                <button
                  onClick={() => createBorzoOrder(selectedOrder.id)}
                  disabled={borzoPending === selectedOrder.id}
                  className="w-full bg-blue-600 text-white py-2.5 rounded-xl font-medium hover:bg-blue-700 disabled:opacity-50 mt-2"
                >
                  {borzoPending === selectedOrder.id ? 'Creating Borzo Order...' : 'Create Borzo Delivery'}
                </button>
              )}
              {selectedOrder.borzo_order_id && (
                <p className="text-xs text-green-600 text-center">Borzo Order: #{selectedOrder.borzo_order_id}</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Manual Order Modal */}
      {creating && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-pink-900">Create Manual Order</h2>
              <button onClick={() => setCreating(false)} className="text-gray-400 hover:text-gray-600 text-xl">&times;</button>
            </div>

            <div className="space-y-3">
              <Field label="Customer Name" value={manualForm.customer_name} onChange={v => setManualForm(p => ({ ...p, customer_name: v }))} />
              <Field label="WhatsApp Number" value={manualForm.whatsapp_number} onChange={v => setManualForm(p => ({ ...p, whatsapp_number: v }))} placeholder="919876543210" />

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={manualForm.is_dd_resident}
                  onChange={e => setManualForm(p => ({ ...p, is_dd_resident: e.target.checked }))}
                  className="w-5 h-5 rounded accent-pink-600"
                />
                <span className="text-sm font-medium text-pink-800">Diamond District resident</span>
              </label>

              <Field
                label={manualForm.is_dd_resident ? 'Block & Flat Number' : 'Full Address'}
                value={manualForm.address}
                onChange={v => setManualForm(p => ({ ...p, address: v }))}
                textarea={!manualForm.is_dd_resident}
              />

              {!manualForm.is_dd_resident && (
                <>
                  <div className="grid grid-cols-3 gap-2">
                    <Field label="Building" value={manualForm.building_number} onChange={v => setManualForm(p => ({ ...p, building_number: v }))} placeholder="Opt" />
                    <Field label="Floor" value={manualForm.floor_number} onChange={v => setManualForm(p => ({ ...p, floor_number: v }))} placeholder="Opt" />
                    <Field label="Flat" value={manualForm.apartment_number} onChange={v => setManualForm(p => ({ ...p, apartment_number: v }))} placeholder="Opt" />
                  </div>
                  <Field label="Delivery charge (₹)" value={String(manualForm.delivery_charge)} onChange={v => setManualForm(p => ({ ...p, delivery_charge: parseFloat(v) || 0 }))} type="number" />
                </>
              )}

              {/* Items */}
              <div>
                <label className="block text-sm font-medium text-pink-800 mb-1">Items</label>
                <div className="space-y-2 max-h-60 overflow-y-auto border border-pink-100 rounded-xl p-2">
                  {menuItems.map(item => {
                    const current = manualForm.items.find(i => i.menu_item_id === item.id)?.quantity || 0
                    return (
                      <div key={item.id} className="flex items-center justify-between py-1">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate text-pink-900">{item.name}</p>
                          <p className="text-xs text-pink-500">₹{item.price}</p>
                        </div>
                        <div className="flex items-center gap-1">
                          <button onClick={() => updateManualItem(item.id, current - 1)} disabled={current <= 0} className="w-7 h-7 rounded-full bg-pink-100 text-pink-800 font-bold disabled:opacity-30">-</button>
                          <span className="w-6 text-center text-sm">{current}</span>
                          <button onClick={() => updateManualItem(item.id, current + 1)} className="w-7 h-7 rounded-full bg-pink-500 text-white font-bold">+</button>
                        </div>
                      </div>
                    )
                  })}
                  {menuItems.length === 0 && <p className="text-xs text-pink-400 text-center py-2">No menu items</p>}
                </div>
              </div>

              {/* Slot (optional) */}
              <div>
                <label className="block text-sm font-medium text-pink-800 mb-1">Delivery Slot (optional)</label>
                <select
                  value={manualForm.delivery_slot_id}
                  onChange={e => setManualForm(p => ({ ...p, delivery_slot_id: e.target.value }))}
                  className="w-full px-4 py-2.5 border border-pink-200 rounded-xl text-sm"
                >
                  <option value="">No slot</option>
                  {slots.map(s => (
                    <option key={s.id} value={s.id}>
                      {new Date(s.date + 'T00:00:00').toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })} · {s.start_time}-{s.end_time}
                    </option>
                  ))}
                </select>
              </div>

              {/* Status */}
              <div>
                <label className="block text-sm font-medium text-pink-800 mb-1">Status</label>
                <select
                  value={manualForm.status}
                  onChange={e => setManualForm(p => ({ ...p, status: e.target.value as ManualOrderForm['status'] }))}
                  className="w-full px-4 py-2.5 border border-pink-200 rounded-xl text-sm"
                >
                  <option value="confirmed">Confirmed</option>
                  <option value="preparing">Preparing</option>
                  <option value="ready">Ready</option>
                  <option value="delivered">Delivered</option>
                </select>
              </div>

              <div className="bg-pink-50 rounded-xl p-3 text-sm">
                <div className="flex justify-between"><span>Subtotal</span><span>₹{manualSubtotal}</span></div>
                {manualForm.delivery_charge > 0 && <div className="flex justify-between"><span>Delivery</span><span>₹{manualForm.delivery_charge}</span></div>}
                <div className="flex justify-between font-bold text-pink-900 mt-1"><span>Total</span><span>₹{manualTotal}</span></div>
              </div>

              <div className="flex gap-3 mt-4">
                <button onClick={submitManualOrder} disabled={submittingManual} className="flex-1 bg-pink-600 text-white py-2.5 rounded-xl font-medium hover:bg-pink-700 disabled:opacity-50">
                  {submittingManual ? 'Creating...' : 'Create Order'}
                </button>
                <button onClick={() => setCreating(false)} className="flex-1 bg-gray-100 text-gray-600 py-2.5 rounded-xl font-medium hover:bg-gray-200">
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function Field({
  label, value, onChange, type = 'text', placeholder, textarea
}: {
  label: string; value: string; onChange: (v: string) => void; type?: string; placeholder?: string; textarea?: boolean
}) {
  const cls = "w-full px-4 py-2.5 border border-pink-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-pink-400 text-sm"
  return (
    <div>
      <label className="block text-sm font-medium text-pink-800 mb-1">{label}</label>
      {textarea ? (
        <textarea value={value} onChange={e => onChange(e.target.value)} className={cls} rows={2} placeholder={placeholder} />
      ) : (
        <input type={type} value={value} onChange={e => onChange(e.target.value)} className={cls} placeholder={placeholder} />
      )}
    </div>
  )
}
