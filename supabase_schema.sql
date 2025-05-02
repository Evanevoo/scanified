-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- USER PROFILES (linked to Supabase Auth)
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text,
  role text CHECK (role IN ('admin', 'manager', 'user')) DEFAULT 'user'
);

-- CUSTOMERS
CREATE TABLE IF NOT EXISTS customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_number text UNIQUE NOT NULL,
  name text NOT NULL,
  contact_details text,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now())
);

-- CYLINDERS
CREATE TABLE IF NOT EXISTS cylinders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  serial_number text UNIQUE NOT NULL,
  barcode_number text UNIQUE,
  gas_type text NOT NULL,
  assigned_customer uuid REFERENCES customers(id),
  rental_start_date date,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now())
);

-- RENTALS
CREATE TABLE IF NOT EXISTS rentals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid REFERENCES customers(id),
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
  customer_id uuid REFERENCES customers(id),
  rental_id uuid REFERENCES rentals(id),
  invoice_date date NOT NULL,
  amount numeric NOT NULL,
  details text,
  generated_by uuid REFERENCES profiles(id),
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now())
);

-- Enable Row Level Security (RLS)
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE cylinders ENABLE ROW LEVEL SECURITY;
ALTER TABLE rentals ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;

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

-- If you already have a customers table and need to add the customer_number column:
-- ALTER TABLE customers ADD COLUMN customer_number text UNIQUE;
-- UPDATE customers SET customer_number = id::text WHERE customer_number IS NULL;
-- ALTER TABLE customers ALTER COLUMN customer_number SET NOT NULL; 