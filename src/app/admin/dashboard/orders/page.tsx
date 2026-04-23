'use client'

import { useEffect, useState } from 'react'
import type { Order } from '@/lib/types'

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'dd' | 'outside'>('all')
  const [statusFilter, setStatusFilter] = useState<string>('')
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)
  const [borzoPending, setBorzoPending] = useState<string | null>(null)

  useEffect(() => { loadOrders() }, [filter, statusFilter])

  async function loadOrders() {
    const params = new URLSearchParams()
    if (filter !== 'all') params.set('type', filter)
    if (statusFilter) params.set('status', statusFilter)
    const res = await fetch(`/api/admin/orders?${params}`)
    setOrders(await res.json())
    setLoading(false)
  }

  async function updateStatus(orderId: string, status: string) {
    await fetch(`/api/admin/orders/${orderId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    })
    loadOrders()
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
      loadOrders()
    } else {
      alert(`Borzo error: ${data.error}`)
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

  const statusColors: Record<string, string> = {
    confirmed: 'bg-blue-100 text-blue-700',
    preparing: 'bg-yellow-100 text-yellow-700',
    ready: 'bg-green-100 text-green-700',
    delivered: 'bg-gray-100 text-gray-600',
  }

  if (loading) return <div className="text-center py-12 text-amber-600">Loading...</div>

  return (
    <div>
      <h1 className="text-2xl font-bold text-amber-900 mb-4">Orders</h1>

      {/* Filters */}
      <div className="flex gap-2 mb-4 flex-wrap">
        {(['all', 'dd', 'outside'] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium ${filter === f ? 'bg-amber-200 text-amber-900' : 'bg-amber-50 text-amber-600'}`}
          >
            {f === 'all' ? 'All' : f === 'dd' ? 'Diamond District' : 'Outside DD'}
          </button>
        ))}
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          className="px-3 py-1.5 rounded-lg text-xs font-medium bg-amber-50 text-amber-600 border-none"
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
                  <span className="font-bold text-amber-900">{order.order_number}</span>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[order.status]}`}>
                    {order.status}
                  </span>
                  {order.is_dd_resident ? (
                    <span className="px-2 py-0.5 rounded-full text-xs bg-purple-50 text-purple-600">DD</span>
                  ) : (
                    <span className="px-2 py-0.5 rounded-full text-xs bg-orange-50 text-orange-600">Outside</span>
                  )}
                </div>
                <p className="text-sm text-amber-600 mt-1">{order.customer_name} · {order.address}</p>
                <p className="text-xs text-amber-400 mt-0.5">{formatSlot(order)}</p>
              </div>
              <div className="text-right">
                <p className="font-bold text-amber-900">₹{order.total_amount}</p>
                <p className="text-xs text-amber-500">{formatDate(order.created_at)}</p>
              </div>
            </div>
          </div>
        ))}
        {orders.length === 0 && (
          <p className="text-center py-8 text-amber-500">No orders yet.</p>
        )}
      </div>

      {/* Order Detail Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-amber-900">{selectedOrder.order_number}</h2>
              <button onClick={() => setSelectedOrder(null)} className="text-gray-400 hover:text-gray-600 text-xl">&times;</button>
            </div>

            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-amber-600">Customer</span>
                <span className="font-medium">{selectedOrder.customer_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-amber-600">WhatsApp</span>
                <a href={`https://wa.me/${selectedOrder.whatsapp_number}`} className="font-medium text-green-600" target="_blank">{selectedOrder.whatsapp_number}</a>
              </div>
              <div className="flex justify-between">
                <span className="text-amber-600">Address</span>
                <span className="font-medium text-right max-w-[60%]">{selectedOrder.address}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-amber-600">Type</span>
                <span className="font-medium">{selectedOrder.is_dd_resident ? 'Diamond District' : 'Outside DD'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-amber-600">Slot</span>
                <span className="font-medium">{formatSlot(selectedOrder)}</span>
              </div>

              <hr className="border-amber-100" />

              {/* Order Items */}
              <div>
                <p className="text-amber-600 mb-2">Items</p>
                {selectedOrder.order_items?.map(item => (
                  <div key={item.id} className="flex justify-between text-sm py-1">
                    <span>{item.item_name} x{item.quantity}</span>
                    <span className="font-medium">₹{item.item_price * item.quantity}</span>
                  </div>
                ))}
              </div>

              <hr className="border-amber-100" />

              <div className="flex justify-between">
                <span className="text-amber-600">Subtotal</span>
                <span className="font-medium">₹{selectedOrder.subtotal}</span>
              </div>
              {selectedOrder.delivery_charge > 0 && (
                <div className="flex justify-between">
                  <span className="text-amber-600">Delivery</span>
                  <span className="font-medium">₹{selectedOrder.delivery_charge}</span>
                </div>
              )}
              <div className="flex justify-between text-base">
                <span className="font-semibold text-amber-900">Total</span>
                <span className="font-bold text-amber-900">₹{selectedOrder.total_amount}</span>
              </div>

              <hr className="border-amber-100" />

              {/* Payment Screenshot */}
              <div>
                <p className="text-amber-600 mb-2">Payment Screenshot</p>
                <a href={selectedOrder.payment_screenshot_url} target="_blank" rel="noopener noreferrer">
                  <img src={selectedOrder.payment_screenshot_url} alt="Payment" className="w-full rounded-xl border border-amber-100" />
                </a>
              </div>

              <hr className="border-amber-100" />

              {/* Status Update */}
              <div>
                <p className="text-amber-600 mb-2">Update Status</p>
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
    </div>
  )
}
