'use client'

import { useEffect, useRef, useState } from 'react'
import type { MenuItem, DeliverySlot, CartItem } from '@/lib/types'

interface PublicSettings {
  bakery_name: string
  description: string
  logo_url: string | null
  upi_id: string
  qr_code_url: string | null
  whatsapp_number: string
  page_mode: 'closed' | 'preorder' | 'live'
}

export default function OrderPage() {
  const [settings, setSettings] = useState<PublicSettings | null>(null)
  const [menuItems, setMenuItems] = useState<MenuItem[]>([])
  const [slots, setSlots] = useState<DeliverySlot[]>([])
  const [cart, setCart] = useState<CartItem[]>([])
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(true)

  // Step 2 form fields
  const [name, setName] = useState('')
  const [whatsapp, setWhatsapp] = useState('')
  const [isDDResident, setIsDDResident] = useState(true)
  const [address, setAddress] = useState('')
  const [buildingNumber, setBuildingNumber] = useState('')
  const [floorNumber, setFloorNumber] = useState('')
  const [apartmentNumber, setApartmentNumber] = useState('')
  const [deliveryNote, setDeliveryNote] = useState('')
  const [selectedSlot, setSelectedSlot] = useState('')
  const [deliveryCost, setDeliveryCost] = useState<number | null>(null)
  const [deliveryError, setDeliveryError] = useState('')
  const [calculatingDelivery, setCalculatingDelivery] = useState(false)
  const [screenshotFile, setScreenshotFile] = useState<File | null>(null)
  const [submitting, setSubmitting] = useState(false)

  // Step 3
  const [orderResult, setOrderResult] = useState<{ order_id: string; order_number: string } | null>(null)

  useEffect(() => {
    // Load saved customer info from localStorage
    const saved = localStorage.getItem('crumbly_customer')
    if (saved) {
      const d = JSON.parse(saved)
      if (d.name) setName(d.name)
      if (d.whatsapp) setWhatsapp(d.whatsapp)
      if (d.address) setAddress(d.address)
      if (d.isDDResident !== undefined) setIsDDResident(d.isDDResident)
      if (d.buildingNumber) setBuildingNumber(d.buildingNumber)
      if (d.floorNumber) setFloorNumber(d.floorNumber)
      if (d.apartmentNumber) setApartmentNumber(d.apartmentNumber)
      if (d.deliveryNote) setDeliveryNote(d.deliveryNote)
    }

    Promise.all([
      fetch('/api/settings').then(r => r.json()).catch(() => null),
      fetch('/api/menu').then(r => r.json()).catch(() => []),
      fetch('/api/slots').then(r => r.json()).catch(() => []),
    ]).then(([s, m, sl]) => {
      setSettings(s)
      setMenuItems(Array.isArray(m) ? m : [])
      setSlots(Array.isArray(sl) ? sl : [])
      setLoading(false)
    })
  }, [])

  function updateCart(item: MenuItem, qty: number) {
    setCart(prev => {
      const existing = prev.find(c => c.menuItem.id === item.id)
      if (qty <= 0) return prev.filter(c => c.menuItem.id !== item.id)
      if (existing) return prev.map(c => c.menuItem.id === item.id ? { ...c, quantity: qty } : c)
      return [...prev, { menuItem: item, quantity: qty }]
    })
  }

  function getCartQty(itemId: string) {
    return cart.find(c => c.menuItem.id === itemId)?.quantity || 0
  }

  const subtotal = Math.round(cart.reduce((sum, c) => sum + c.menuItem.price * c.quantity, 0) * 100) / 100
  const total = Math.round((subtotal + (deliveryCost || 0)) * 100) / 100

  // Debounced save to localStorage
  const debounceRef = useRef<NodeJS.Timeout | null>(null)
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      if (name || whatsapp || address) {
        localStorage.setItem('crumbly_customer', JSON.stringify({ name, whatsapp, address, isDDResident, buildingNumber, floorNumber, apartmentNumber, deliveryNote }))
      }
    }, 500)
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [name, whatsapp, address, isDDResident, buildingNumber, floorNumber, apartmentNumber, deliveryNote])

  async function calculateDelivery() {
    if (isDDResident || !address.trim()) return
    setCalculatingDelivery(true)
    setDeliveryError('')
    setDeliveryCost(null)

    const res = await fetch('/api/delivery-cost', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ address, building_number: buildingNumber, floor_number: floorNumber, apartment_number: apartmentNumber, delivery_note: deliveryNote, customerPhone: whatsapp, customerName: name }),
    })

    const data = await res.json()
    setCalculatingDelivery(false)

    if (res.ok) {
      setDeliveryCost(data.delivery_cost)
    } else {
      setDeliveryError('Sorry, we cannot deliver to this address. We deliver within 10km of Diamond District.')
    }
  }

  async function handleSubmit() {
    if (!screenshotFile || !selectedSlot) return
    setSubmitting(true)

    // Upload screenshot
    const formData = new FormData()
    formData.append('file', screenshotFile)
    formData.append('bucket', 'screenshots')
    const uploadRes = await fetch('/api/upload', { method: 'POST', body: formData })
    const { url: screenshotUrl } = await uploadRes.json()

    if (!screenshotUrl) {
      alert('Failed to upload screenshot. Please try again.')
      setSubmitting(false)
      return
    }

    // Create order
    const orderRes = await fetch('/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customer_name: name,
        whatsapp_number: whatsapp,
        is_dd_resident: isDDResident,
        address,
        building_number: isDDResident ? '' : buildingNumber,
        floor_number: isDDResident ? '' : floorNumber,
        apartment_number: isDDResident ? '' : apartmentNumber,
        delivery_note: isDDResident ? '' : deliveryNote,
        delivery_slot_id: selectedSlot,
        items: cart.map(c => ({ menu_item_id: c.menuItem.id, quantity: c.quantity })),
        delivery_charge: isDDResident ? 0 : (deliveryCost || 0),
        payment_screenshot_url: screenshotUrl,
      }),
    })

    const result = await orderRes.json()
    setSubmitting(false)

    if (orderRes.ok) {
      setOrderResult(result)
      setStep(3)
    } else {
      alert(result.error || 'Failed to place order. Please try again.')
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-amber-50">
        <p className="text-amber-600">Loading...</p>
      </div>
    )
  }

  if (!settings) return null

  // Closed mode
  if (settings.page_mode === 'closed') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-amber-50 p-6 text-center">
        {settings.logo_url && <img src={settings.logo_url} alt={settings.bakery_name} className="h-24 mb-4 rounded-2xl" />}
        <h1 className="text-3xl font-bold text-amber-900 mb-2">{settings.bakery_name}</h1>
        <p className="text-amber-600 mb-4">{settings.description}</p>
        <div className="bg-white rounded-2xl p-6 shadow-sm max-w-sm w-full">
          <p className="text-amber-800 font-medium">We&apos;re currently closed</p>
          <p className="text-amber-500 text-sm mt-2">Check back on Friday evening for pre-orders!</p>
        </div>
        {settings.whatsapp_number && (
          <a
            href={`https://wa.me/${settings.whatsapp_number}`}
            target="_blank"
            className="mt-4 text-sm text-green-600 hover:underline"
          >
            WhatsApp us for queries
          </a>
        )}
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-amber-50">
      {/* Header */}
      <header className="bg-white border-b border-amber-100 sticky top-0 z-40">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center gap-3">
          {settings.logo_url && <img src={settings.logo_url} alt="" className="h-10 w-10 rounded-xl object-cover" />}
          <div>
            <h1 className="font-bold text-amber-900 text-lg leading-tight">{settings.bakery_name}</h1>
            <p className="text-xs text-amber-500">
              {settings.page_mode === 'preorder' ? 'Pre-order' : 'Order Now'}
            </p>
          </div>
        </div>
        {/* Step indicator */}
        <div className="max-w-lg mx-auto px-4 pb-2 flex gap-2">
          {[1, 2, 3].map(s => (
            <div key={s} className={`h-1 flex-1 rounded-full ${step >= s ? 'bg-amber-500' : 'bg-amber-200'}`} />
          ))}
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-4 pb-32">
        {/* Step 1: Menu */}
        {step === 1 && (
          <div>
            <h2 className="text-lg font-bold text-amber-900 mb-4">Choose your items</h2>
            <div className="space-y-3">
              {menuItems.map(item => {
                const qty = getCartQty(item.id)
                const soldOut = item.available_quantity <= 0
                return (
                  <div key={item.id} className={`bg-white rounded-2xl shadow-sm overflow-hidden ${soldOut ? 'opacity-60' : ''}`}>
                    <div className="flex">
                      {item.image_url ? (
                        <img src={item.image_url} alt={item.name} className="w-28 h-28 object-cover" />
                      ) : (
                        <div className="w-28 h-28 bg-amber-100 flex items-center justify-center text-amber-300 text-3xl">?</div>
                      )}
                      <div className="flex-1 p-3 flex flex-col justify-between">
                        <div>
                          <h3 className="font-semibold text-amber-900">{item.name}</h3>
                          {item.description && <p className="text-xs text-amber-500 mt-0.5 line-clamp-2">{item.description}</p>}
                        </div>
                        <div className="flex items-center justify-between mt-2">
                          <span className="font-bold text-amber-800">₹{item.price}</span>
                          {soldOut ? (
                            <span className="text-xs text-red-500 font-medium">Sold Out</span>
                          ) : (
                            <div className="flex items-center gap-2">
                              {qty > 0 && (
                                <button
                                  onClick={() => updateCart(item, qty - 1)}
                                  className="w-8 h-8 rounded-full bg-amber-100 text-amber-800 font-bold flex items-center justify-center"
                                >
                                  -
                                </button>
                              )}
                              {qty > 0 && <span className="font-semibold text-amber-900 w-4 text-center">{qty}</span>}
                              <button
                                onClick={() => {
                                  if (qty < item.available_quantity) updateCart(item, qty + 1)
                                }}
                                disabled={qty >= item.available_quantity}
                                className="w-8 h-8 rounded-full bg-amber-500 text-white font-bold flex items-center justify-center disabled:opacity-50"
                              >
                                +
                              </button>
                              {qty > 0 && <span className="text-xs text-amber-400">{item.available_quantity - qty} left</span>}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Step 2: Details & Payment */}
        {step === 2 && (
          <div className="space-y-4">
            <h2 className="text-lg font-bold text-amber-900">Your details</h2>

            <div className="bg-white rounded-2xl p-4 shadow-sm space-y-4">
              <InputField label="Name" value={name} onChange={setName} placeholder="Your name" />
              <InputField label="WhatsApp Number" value={whatsapp} onChange={setWhatsapp} placeholder="919876543210" />

              {/* DD Toggle */}
              <div>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isDDResident}
                    onChange={e => {
                      setIsDDResident(e.target.checked)
                      setDeliveryCost(null)
                      setDeliveryError('')
                    }}
                    className="w-5 h-5 rounded accent-amber-600"
                  />
                  <span className="text-sm font-medium text-amber-800">I live in Diamond District</span>
                </label>
              </div>

              {isDDResident ? (
                <InputField label="Block & Flat Number" value={address} onChange={setAddress} placeholder="e.g. Block A, Flat 301" />
              ) : (
                <div className="space-y-3">
                  <InputField label="Full Delivery Address" value={address} onChange={setAddress} placeholder="Full address with landmark, city" textarea />
                  <div className="grid grid-cols-3 gap-2">
                    <InputField label="Building" value={buildingNumber} onChange={setBuildingNumber} placeholder="Optional" />
                    <InputField label="Floor" value={floorNumber} onChange={setFloorNumber} placeholder="Optional" />
                    <InputField label="Flat/Unit" value={apartmentNumber} onChange={setApartmentNumber} placeholder="Optional" />
                  </div>
                  <InputField label="How to get there" value={deliveryNote} onChange={setDeliveryNote} placeholder="Landmarks, gate instructions, etc. (optional)" />
                  <button
                    onClick={calculateDelivery}
                    disabled={!address.trim() || calculatingDelivery}
                    className="bg-blue-600 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
                  >
                    {calculatingDelivery ? 'Calculating...' : 'Calculate Delivery Cost'}
                  </button>
                  {deliveryCost !== null && (
                    <p className="text-sm text-green-600 mt-2">Delivery charge: ₹{deliveryCost}</p>
                  )}
                  {deliveryError && (
                    <p className="text-sm text-red-600 mt-2">{deliveryError}</p>
                  )}
                </div>
              )}
            </div>

            {/* Delivery Slot */}
            <div className="bg-white rounded-2xl p-4 shadow-sm">
              <label className="block text-sm font-medium text-amber-800 mb-2">Delivery Slot</label>
              {slots.length === 0 ? (
                <p className="text-sm text-amber-500">No delivery slots available right now.</p>
              ) : (
                <div className="grid gap-2">
                  {slots.map(slot => {
                    const date = new Date(slot.date + 'T00:00:00').toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })
                    const formatT = (t: string) => {
                      const [h, m] = t.split(':')
                      const hour = parseInt(h)
                      return `${hour % 12 || 12}:${m} ${hour >= 12 ? 'PM' : 'AM'}`
                    }
                    const spotsLeft = slot.max_orders - slot.current_orders
                    return (
                      <button
                        key={slot.id}
                        onClick={() => setSelectedSlot(slot.id)}
                        className={`text-left p-3 rounded-xl border-2 transition-colors ${
                          selectedSlot === slot.id
                            ? 'border-amber-500 bg-amber-50'
                            : 'border-amber-100 hover:border-amber-300'
                        }`}
                      >
                        <p className="font-medium text-amber-900">{date}</p>
                        <p className="text-sm text-amber-600">{formatT(slot.start_time)} - {formatT(slot.end_time)}</p>
                        <p className="text-xs text-amber-400 mt-0.5">{spotsLeft} spot{spotsLeft !== 1 ? 's' : ''} left</p>
                      </button>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Order Summary */}
            <div className="bg-white rounded-2xl p-4 shadow-sm">
              <h3 className="font-semibold text-amber-900 mb-2">Order Summary</h3>
              {cart.map(c => (
                <div key={c.menuItem.id} className="flex justify-between text-sm py-1">
                  <span className="text-amber-700">{c.menuItem.name} x{c.quantity}</span>
                  <span className="font-medium">₹{c.menuItem.price * c.quantity}</span>
                </div>
              ))}
              <hr className="border-amber-100 my-2" />
              <div className="flex justify-between text-sm">
                <span className="text-amber-600">Subtotal</span>
                <span className="font-medium">₹{subtotal}</span>
              </div>
              {!isDDResident && deliveryCost !== null && (
                <div className="flex justify-between text-sm">
                  <span className="text-amber-600">Delivery</span>
                  <span className="font-medium">₹{deliveryCost}</span>
                </div>
              )}
              <div className="flex justify-between text-base mt-1">
                <span className="font-bold text-amber-900">Total</span>
                <span className="font-bold text-amber-900">₹{total}</span>
              </div>
            </div>

            {/* Payment */}
            {(isDDResident || deliveryCost !== null) && (
              <div className="bg-white rounded-2xl p-4 shadow-sm">
                <h3 className="font-semibold text-amber-900 mb-2">Payment</h3>
                <p className="text-sm text-amber-600 mb-3">
                  Pay <span className="font-bold text-amber-900">₹{total}</span> via UPI and upload the screenshot
                </p>
                {settings.upi_id && (
                  <p className="text-sm text-amber-700 mb-2">UPI ID: <span className="font-mono font-medium select-all">{settings.upi_id}</span></p>
                )}
                {settings.qr_code_url && (
                  <img src={settings.qr_code_url} alt="UPI QR" className="h-48 mx-auto rounded-xl mb-3" />
                )}
                <div>
                  <label className="block text-sm font-medium text-amber-800 mb-1">Payment Screenshot</label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={e => setScreenshotFile(e.target.files?.[0] || null)}
                    className="text-sm w-full"
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {/* Step 3: Confirmation */}
        {step === 3 && orderResult && (
          <div className="text-center py-8">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-amber-900 mb-2">Order Confirmed!</h2>
            <p className="text-amber-600 mb-6">Your order <span className="font-bold">{orderResult.order_number}</span> has been placed.</p>

            <div className="bg-white rounded-2xl p-4 shadow-sm text-left mb-4">
              <h3 className="font-semibold text-amber-900 mb-2">Order Details</h3>
              {cart.map(c => (
                <div key={c.menuItem.id} className="flex justify-between text-sm py-1">
                  <span>{c.menuItem.name} x{c.quantity}</span>
                  <span className="font-medium">₹{c.menuItem.price * c.quantity}</span>
                </div>
              ))}
              <hr className="border-amber-100 my-2" />
              <div className="flex justify-between font-bold">
                <span>Total</span>
                <span>₹{total}</span>
              </div>
            </div>

            {settings.whatsapp_number && (
              <a
                href={`https://wa.me/${settings.whatsapp_number}?text=Hi Crumbly! I just placed order ${orderResult.order_number}`}
                target="_blank"
                className="inline-block bg-green-600 text-white px-6 py-3 rounded-xl font-medium hover:bg-green-700 mb-3"
              >
                WhatsApp for Queries
              </a>
            )}

            <button
              onClick={() => {
                setCart([])
                setStep(1)
                setOrderResult(null)
                setScreenshotFile(null)
                setSelectedSlot('')
                setDeliveryCost(null)
                fetch('/api/menu').then(r => r.json()).then(setMenuItems)
                fetch('/api/slots').then(r => r.json()).then(setSlots)
              }}
              className="block w-full bg-amber-100 text-amber-800 px-6 py-3 rounded-xl font-medium hover:bg-amber-200"
            >
              Place Another Order
            </button>
          </div>
        )}
      </main>

      {/* Bottom Bar - Step 1 & 2 */}
      {step < 3 && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-amber-200 p-4 z-40">
          <div className="max-w-lg mx-auto">
            {step === 1 && (
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-amber-600">{cart.length} item{cart.length !== 1 ? 's' : ''}</p>
                  <p className="font-bold text-amber-900">₹{subtotal}</p>
                </div>
                <button
                  onClick={() => setStep(2)}
                  disabled={cart.length === 0}
                  className="bg-amber-600 text-white px-8 py-3 rounded-xl font-medium hover:bg-amber-700 disabled:opacity-50 transition-colors"
                >
                  Next
                </button>
              </div>
            )}
            {step === 2 && (
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setStep(1)}
                  className="bg-amber-100 text-amber-800 px-4 py-3 rounded-xl font-medium hover:bg-amber-200"
                >
                  Back
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={
                    submitting ||
                    !name.trim() ||
                    !whatsapp.trim() ||
                    !address.trim() ||
                    !selectedSlot ||
                    !screenshotFile ||
                    (!isDDResident && deliveryCost === null)
                  }
                  className="flex-1 bg-amber-600 text-white py-3 rounded-xl font-medium hover:bg-amber-700 disabled:opacity-50 transition-colors"
                >
                  {submitting ? 'Placing Order...' : `Place Order · ₹${total}`}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function InputField({
  label, value, onChange, placeholder, textarea
}: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string; textarea?: boolean
}) {
  const className = "w-full px-4 py-2.5 border border-amber-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-400 text-sm"
  return (
    <div>
      <label className="block text-sm font-medium text-amber-800 mb-1">{label}</label>
      {textarea ? (
        <textarea value={value} onChange={e => onChange(e.target.value)} className={className} rows={3} placeholder={placeholder} />
      ) : (
        <input value={value} onChange={e => onChange(e.target.value)} className={className} placeholder={placeholder} />
      )}
    </div>
  )
}
