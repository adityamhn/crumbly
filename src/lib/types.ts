export interface Settings {
  id: string
  bakery_name: string
  description: string
  logo_url: string | null
  upi_id: string
  qr_code_url: string | null
  whatsapp_number: string
  admin_password_hash: string
  page_mode: 'closed' | 'preorder' | 'live'
  pickup_address: string
  pickup_building: string
  pickup_floor: string
  pickup_apartment: string
  pickup_note: string
  pickup_latitude: string
  pickup_longitude: string
  pickup_phone: string
  delivery_radius_km: number
  max_delivery_fee: number
}

export interface MenuItem {
  id: string
  name: string
  description: string
  price: number
  image_url: string | null
  available_quantity: number
  is_available: boolean
  sort_order: number
  created_at: string
}

export interface DeliverySlot {
  id: string
  date: string
  start_time: string
  end_time: string
  max_orders: number
  current_orders: number
  is_active: boolean
}

export interface Order {
  id: string
  order_number: string
  customer_name: string
  whatsapp_number: string
  is_dd_resident: boolean
  address: string
  building_number: string
  floor_number: string
  apartment_number: string
  delivery_note: string
  delivery_slot_id: string
  subtotal: number
  delivery_charge: number
  total_amount: number
  payment_screenshot_url: string
  status: 'confirmed' | 'preparing' | 'ready' | 'delivered'
  borzo_order_id: string | null
  borzo_status: string | null
  created_at: string
  delivery_slot?: DeliverySlot
  order_items?: OrderItem[]
}

export interface OrderItem {
  id: string
  order_id: string
  menu_item_id: string
  item_name: string
  item_price: number
  quantity: number
}

export interface CartItem {
  menuItem: MenuItem
  quantity: number
}

export type PageMode = 'closed' | 'preorder' | 'live'
