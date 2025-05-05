-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- USER PROFILES (linked to Supabase Auth)
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text,
  role text CHECK (role IN ('admin', 'manager', 'user')) DEFAULT 'user'
);

-- Drop old customers table if it exists (CAUTION: this deletes all customer data!)
DROP TABLE IF EXISTS customers CASCADE;

-- CUSTOMERS
CREATE TABLE customers (
  "CustomerListID" text PRIMARY KEY,
  customer_number text UNIQUE,         -- e.g. "CUST-001"
  name text,                           -- full name or business name
  contact_details text,                -- phone/email/address
  bill_city text,
  bill_state text,
  bill_postal_code text,
  phone text,
  barcode text,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now())
);

-- CYLINDERS
CREATE TABLE IF NOT EXISTS cylinders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  serial_number text UNIQUE NOT NULL,
  barcode_number text UNIQUE,
  gas_type text NOT NULL,
  assigned_customer text REFERENCES customers("CustomerListID"),
  rental_start_date date,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
  category text,
  group_name text,
  type text,
  product_code text,
  description text,
  in_house_total integer,
  with_customer_total integer,
  lost_total integer,
  total integer,
  dock_stock text
);

-- RENTALS
CREATE TABLE IF NOT EXISTS rentals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id text REFERENCES customers("CustomerListID"),
  cylinder_id uuid REFERENCES cylinders(id),
  rental_type text CHECK (rental_type IN ('monthly', 'yearly')) NOT NULL,
  rental_start_date date NOT NULL,
  rental_end_date date,
  status text CHECK (status IN ('active', 'ended')) DEFAULT 'active',
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now())
);

-- INVOICES
CREATE TABLE IF NOT EXISTS invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id text,
  rental_id uuid REFERENCES rentals(id),
  invoice_date date NOT NULL,
  amount numeric NOT NULL,
  details text,
  generated_by uuid REFERENCES profiles(id),
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now())
);

-- Ensure the foreign key relationship exists
ALTER TABLE invoices
DROP CONSTRAINT IF EXISTS invoices_customer_id_fkey;

ALTER TABLE invoices
ADD CONSTRAINT invoices_customer_id_fkey
FOREIGN KEY (customer_id) REFERENCES customers("CustomerListID");

ALTER TABLE invoices ADD COLUMN IF NOT EXISTS generated_by uuid;

ALTER TABLE invoices DROP CONSTRAINT IF EXISTS invoices_generated_by_fkey;

ALTER TABLE invoices
ADD CONSTRAINT invoices_generated_by_fkey
FOREIGN KEY (generated_by) REFERENCES profiles(id);

-- SALES ORDERS
CREATE TABLE IF NOT EXISTS sales_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id text,
  customer_name text,
  order_date date,
  gas_type text,
  sales_order_number text,
  shipped_bottles integer,
  returned_bottles integer,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now())
);

-- Enable Row Level Security (RLS)
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE cylinders ENABLE ROW LEVEL SECURITY;
ALTER TABLE rentals ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales_orders ENABLE ROW LEVEL SECURITY;

-- POLICIES

-- PROFILES
DROP POLICY IF EXISTS "Users can view their own profile" ON profiles;
CREATE POLICY "Users can view their own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "Admins can update any profile, users their own" ON profiles;
CREATE POLICY "Admins can update any profile, users their own" ON profiles
  FOR UPDATE USING (
    (auth.uid() = id) OR
    (exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'admin'))
  );

-- CUSTOMERS
DROP POLICY IF EXISTS "All roles can view customers" ON customers;
CREATE POLICY "All roles can view customers" ON customers
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admins and managers can modify customers" ON customers;
CREATE POLICY "Admins and managers can modify customers" ON customers
  FOR ALL USING (
    exists (
      select 1 from profiles p
      where p.id = auth.uid() and p.role in ('admin', 'manager')
    )
  );

-- CYLINDERS
DROP POLICY IF EXISTS "All roles can view cylinders" ON cylinders;
CREATE POLICY "All roles can view cylinders" ON cylinders
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admins and managers can modify cylinders" ON cylinders;
CREATE POLICY "Admins and managers can modify cylinders" ON cylinders
  FOR ALL USING (
    exists (
      select 1 from profiles p
      where p.id = auth.uid() and p.role in ('admin', 'manager')
    )
  );

-- RENTALS
DROP POLICY IF EXISTS "All roles can view rentals" ON rentals;
CREATE POLICY "All roles can view rentals" ON rentals
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admins and managers can modify rentals" ON rentals;
CREATE POLICY "Admins and managers can modify rentals" ON rentals
  FOR ALL USING (
    exists (
      select 1 from profiles p
      where p.id = auth.uid() and p.role in ('admin', 'manager')
    )
  );

-- INVOICES
DROP POLICY IF EXISTS "All roles can view invoices" ON invoices;
CREATE POLICY "All roles can view invoices" ON invoices
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admins can modify invoices" ON invoices;
CREATE POLICY "Admins can modify invoices" ON invoices
  FOR ALL USING (
    exists (
      select 1 from profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  );

-- SALES ORDERS POLICIES
DROP POLICY IF EXISTS "All roles can view sales orders" ON sales_orders;
CREATE POLICY "All roles can view sales orders" ON sales_orders
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admins and managers can modify sales orders" ON sales_orders;
CREATE POLICY "Admins and managers can modify sales orders" ON sales_orders
  FOR ALL USING (
    exists (
      select 1 from profiles p
      where p.id = auth.uid() and p.role in ('admin', 'manager')
    )
  );

-- NOTE: For case-insensitive lookups on CustomerListID, use LOWER(CustomerListID) or ILIKE in queries. 

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS full_name text;

ALTER TABLE cylinders
ALTER COLUMN assigned_customer TYPE text
USING assigned_customer::text;

ALTER TABLE cylinders
DROP CONSTRAINT IF EXISTS cylinders_assigned_customer_fkey;

ALTER TABLE cylinders
ADD CONSTRAINT cylinders_assigned_customer_fkey
FOREIGN KEY (assigned_customer) REFERENCES customers("CustomerListID");

ALTER TABLE rentals
ALTER COLUMN customer_id TYPE text
USING customer_id::text;

ALTER TABLE rentals
DROP CONSTRAINT IF EXISTS rentals_customer_id_fkey;

ALTER TABLE rentals
ADD CONSTRAINT rentals_customer_id_fkey
FOREIGN KEY (customer_id) REFERENCES customers("CustomerListID"); 