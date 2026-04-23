-- Crumbly Database Schema
-- Run this in Supabase SQL Editor

-- Settings table (single row)
CREATE TABLE settings (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  bakery_name text NOT NULL DEFAULT 'Crumbly',
  description text DEFAULT 'Fresh homemade baked goods',
  logo_url text,
  upi_id text DEFAULT '',
  qr_code_url text,
  whatsapp_number text DEFAULT '',
  admin_password_hash text NOT NULL,
  page_mode text NOT NULL DEFAULT 'closed' CHECK (page_mode IN ('closed', 'preorder', 'live')),
  pickup_address text DEFAULT '',
  pickup_latitude text DEFAULT '',
  pickup_longitude text DEFAULT '',
  pickup_phone text DEFAULT '',
  delivery_radius_km int DEFAULT 10
);

-- Insert default settings row (password: admin123 - CHANGE THIS)
INSERT INTO settings (admin_password_hash) VALUES ('$2a$10$X7UrE4MJLP5nMhS5gQ5iku1eHhLqJ3K/47JFLXBIuCGCKVf3FMb3m');

-- Menu items
CREATE TABLE menu_items (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  description text DEFAULT '',
  price decimal(10,2) NOT NULL,
  image_url text,
  available_quantity int NOT NULL DEFAULT 0,
  is_available boolean NOT NULL DEFAULT true,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Delivery slots
CREATE TABLE delivery_slots (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  date date NOT NULL,
  start_time time NOT NULL,
  end_time time NOT NULL,
  max_orders int NOT NULL DEFAULT 5,
  current_orders int NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true
);

-- Orders
CREATE TABLE orders (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  order_number text NOT NULL UNIQUE,
  customer_name text NOT NULL,
  whatsapp_number text NOT NULL,
  is_dd_resident boolean NOT NULL DEFAULT true,
  address text NOT NULL,
  delivery_slot_id uuid REFERENCES delivery_slots(id),
  subtotal decimal(10,2) NOT NULL,
  delivery_charge decimal(10,2) NOT NULL DEFAULT 0,
  total_amount decimal(10,2) NOT NULL,
  payment_screenshot_url text NOT NULL,
  status text NOT NULL DEFAULT 'confirmed' CHECK (status IN ('confirmed', 'preparing', 'ready', 'delivered')),
  borzo_order_id text,
  borzo_status text,
  created_at timestamptz DEFAULT now()
);

-- Order items
CREATE TABLE order_items (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  menu_item_id uuid REFERENCES menu_items(id),
  item_name text NOT NULL,
  item_price decimal(10,2) NOT NULL,
  quantity int NOT NULL
);

-- Create indexes
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_created ON orders(created_at DESC);
CREATE INDEX idx_delivery_slots_date ON delivery_slots(date);
CREATE INDEX idx_order_items_order ON order_items(order_id);

-- Enable RLS
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE menu_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE delivery_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;

-- All operations go through the publishable key (admin auth is handled by Next.js middleware)
-- So RLS policies must allow all needed operations

-- Settings: read by everyone, update by everyone (admin middleware protects the API route)
CREATE POLICY "Allow read settings" ON settings FOR SELECT USING (true);
CREATE POLICY "Allow update settings" ON settings FOR UPDATE USING (true) WITH CHECK (true);

-- Menu items: full CRUD (admin routes are middleware-protected)
CREATE POLICY "Allow read menu items" ON menu_items FOR SELECT USING (true);
CREATE POLICY "Allow insert menu items" ON menu_items FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow update menu items" ON menu_items FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Allow delete menu items" ON menu_items FOR DELETE USING (true);

-- Delivery slots: full CRUD
CREATE POLICY "Allow read delivery slots" ON delivery_slots FOR SELECT USING (true);
CREATE POLICY "Allow insert delivery slots" ON delivery_slots FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow update delivery slots" ON delivery_slots FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Allow delete delivery slots" ON delivery_slots FOR DELETE USING (true);

-- Orders: insert by customers, read/update by admin
CREATE POLICY "Allow read orders" ON orders FOR SELECT USING (true);
CREATE POLICY "Allow insert orders" ON orders FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow update orders" ON orders FOR UPDATE USING (true) WITH CHECK (true);

-- Order items: insert by customers, read by admin
CREATE POLICY "Allow read order items" ON order_items FOR SELECT USING (true);
CREATE POLICY "Allow insert order items" ON order_items FOR INSERT WITH CHECK (true);

-- Storage buckets (create these via Supabase dashboard):
-- 1. Create bucket 'images' (public) - for menu items, logo, QR code
-- 2. Create bucket 'screenshots' (public) - for payment screenshots
--
-- For each bucket, add a storage policy allowing uploads:
--   Allowed operation: INSERT
--   Policy: allow all (true)
--   Also add SELECT policy (true) for public reads
