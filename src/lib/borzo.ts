const BORZO_API_URL = process.env.BORZO_API_URL || 'https://robotapitest-in.borzodelivery.com/api/business/1.6'
const BORZO_API_TOKEN = process.env.BORZO_API_TOKEN || ''

export interface AddressDetails {
  address: string
  building_number?: string
  floor_number?: string
  apartment_number?: string
  note?: string
  latitude?: string
  longitude?: string
}

interface BorzoPoint {
  address: string
  building_number?: string
  floor_number?: string
  apartment_number?: string
  latitude?: string
  longitude?: string
  contact_person: {
    phone: string
    name: string
  }
  note?: string
  client_order_id?: string
}

interface BorzoOrderRequest {
  matter: string
  vehicle_type_id: number
  total_weight_kg: number
  payment_method: string
  is_contact_person_notification_enabled: boolean
  points: BorzoPoint[]
}

export interface BorzoCalculateResult {
  is_successful: boolean
  order?: {
    payment_amount: string
    delivery_fee_amount: string
  }
  errors?: Array<{ code: string; message: string }>
}

export interface BorzoCreateResult {
  is_successful: boolean
  order?: {
    order_id: number
    order_name: string
    status: string
    payment_amount: string
  }
  errors?: Array<{ code: string; message: string }>
}

async function borzoRequest(endpoint: string, body: BorzoOrderRequest) {
  const res = await fetch(`${BORZO_API_URL}/${endpoint}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-DV-Auth-Token': BORZO_API_TOKEN,
    },
    body: JSON.stringify(body),
  })
  return res.json()
}

function formatPhone(phone: string): string {
  const digits = phone.replace(/\D/g, '')
  if (digits.startsWith('91')) return digits
  if (digits.startsWith('0')) return '91' + digits.slice(1)
  return '91' + digits
}

function buildPoint(addr: AddressDetails, phone: string, name: string): BorzoPoint {
  const point: BorzoPoint = {
    address: addr.address,
    contact_person: {
      phone: formatPhone(phone),
      name,
    },
  }
  if (addr.building_number) point.building_number = addr.building_number
  if (addr.floor_number) point.floor_number = addr.floor_number
  if (addr.apartment_number) point.apartment_number = addr.apartment_number
  if (addr.note) point.note = addr.note
  if (addr.latitude) point.latitude = addr.latitude
  if (addr.longitude) point.longitude = addr.longitude
  return point
}

export async function calculateDeliveryCost(
  pickup: AddressDetails,
  pickupPhone: string,
  pickupName: string,
  drop: AddressDetails,
  customerPhone: string,
  customerName: string
): Promise<BorzoCalculateResult> {
  const body: BorzoOrderRequest = {
    matter: 'Food / Bakery items',
    vehicle_type_id: 8,
    total_weight_kg: 2,
    payment_method: 'balance',
    is_contact_person_notification_enabled: true,
    points: [
      buildPoint(pickup, pickupPhone, pickupName),
      buildPoint(drop, customerPhone, customerName),
    ],
  }
  return borzoRequest('calculate-order', body)
}

export async function createBorzoOrder(
  pickup: AddressDetails,
  pickupPhone: string,
  pickupName: string,
  drop: AddressDetails,
  customerPhone: string,
  customerName: string,
  orderNumber: string
): Promise<BorzoCreateResult> {
  const pickupPoint = buildPoint(pickup, pickupPhone, pickupName)
  pickupPoint.client_order_id = orderNumber

  const dropPoint = buildPoint(drop, customerPhone, customerName)
  dropPoint.note = [drop.note, `Order: ${orderNumber}`].filter(Boolean).join(' | ')

  const body: BorzoOrderRequest = {
    matter: 'Food / Bakery items',
    vehicle_type_id: 8,
    total_weight_kg: 2,
    payment_method: 'balance',
    is_contact_person_notification_enabled: true,
    points: [pickupPoint, dropPoint],
  }
  return borzoRequest('create-order', body)
}
