-- Enable UUID generation
-- CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- USER PROFILES (linked to Supabase Auth)
-- CREATE TABLE IF NOT EXISTS profiles (
--   id uuid PRIMARY KEY,
--   full_name text,
--   email text UNIQUE,
--   role text CHECK (role IN ('admin', 'user')) DEFAULT 'user',
--   created_at timestamp DEFAULT now(),
--   updated_at timestamp DEFAULT now()
-- );

-- Drop old customers table if it exists (CAUTION: this deletes all customer data!)
-- DROP TABLE IF EXISTS customers CASCADE;

-- Create the customers table with all necessary columns
-- If your environment does not support CREATE TABLE IF NOT EXISTS, run this manually:
-- CREATE TABLE customers (
--   "CustomerListID" text PRIMARY KEY,
--   customer_number text UNIQUE,
--   name text,
--   contact_details text,
--   bill_city text,
--   bill_state text,
--   bill_postal_code text,
--   phone text,
--   barcode text,
--   customer_barcode text,
--   "AccountNumber" text,
--   created_at timestamp DEFAULT now()
-- );

-- CYLINDERS
-- CREATE TABLE IF NOT EXISTS cylinders (
--   id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
--   serial_number text NOT NULL,
--   barcode_number text,
--   gas_type text NOT NULL,
--   assigned_customer text REFERENCES customers("CustomerListID"),
--   rental_start_date date,
--   created_at timestamp DEFAULT now(),
--   category text,
--   group_name text,
--   type text,
--   product_code text,
--   description text,
--   in_house_total integer,
--   with_customer_total integer,
--   lost_total integer,
--   total integer,
--   dock_stock text
-- );

-- RENTALS
-- CREATE TABLE rentals (
--   id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
--   customer_id text REFERENCES customers("CustomerListID"),
--   cylinder_id uuid REFERENCES cylinders(id),
--   rental_type text CHECK (rental_type IN ('monthly', 'yearly')) NOT NULL,
--   rental_start_date date NOT NULL,
--   rental_end_date date,
--   status text CHECK (status IN ('active', 'ended')) DEFAULT 'active',
--   created_at timestamp DEFAULT now()
-- );

-- INVOICES
-- CREATE TABLE invoices (
--   id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
--   customer_id text,
--   rental_id uuid REFERENCES rentals(id),
--   invoice_date date NOT NULL,
--   amount numeric NOT NULL,
--   details text,
--   generated_by uuid REFERENCES profiles(id),
--   created_at timestamp DEFAULT now()
-- );

-- SALES ORDERS
-- CREATE TABLE sales_orders (
--   id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
--   customer_id text,
--   customer_name text,
--   order_date date,
--   gas_type text,
--   sales_order_number text,
--   shipped_bottles integer,
--   returned_bottles integer,
--   created_at timestamp DEFAULT now()
-- );

-- INVOICE LINE ITEMS
-- If your environment does not support CREATE TABLE IF NOT EXISTS, run this manually:
-- CREATE TABLE invoice_line_items (
--   id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
--   invoice_id uuid REFERENCES invoices(id),
--   product_code text,
--   qty_out integer,
--   qty_in integer,
--   created_at timestamp DEFAULT now(),
--   description text,
--   rate numeric,
--   amount numeric,
--   serial_number text
-- );

-- IMPORT HISTORY TABLE
-- If your environment does not support CREATE TABLE IF NOT EXISTS, run this manually:
-- CREATE TABLE import_history (
--   id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
--   file_name text,
--   import_type text,
--   user_id uuid,
--   user_email text,
--   started_at timestamp DEFAULT now(),
--   finished_at timestamp,
--   status text,
--   summary jsonb,
--   error_message text
-- );

-- TEMPORARY IMPORT TABLES FOR APPROVAL WORKFLOW
-- CREATE TABLE imported_invoices (
--   id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
--   data jsonb NOT NULL,
--   status text DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
--   uploaded_at timestamp DEFAULT now(),
--   uploaded_by uuid,
--   approved_at timestamp,
--   approved_by uuid,
--   notes text
-- );

-- CREATE TABLE imported_sales_receipts (
--   id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
--   data jsonb NOT NULL,
--   status text DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
--   uploaded_at timestamp DEFAULT now(),
--   uploaded_by uuid,
--   approved_at timestamp,
--   approved_by uuid,
--   notes text
-- );

-- AUDIT LOGS TABLE FOR IMPORT APPROVALS
-- CREATE TABLE audit_logs (
--   id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
--   action text NOT NULL,
--   import_id uuid,
--   user_id uuid,
--   timestamp timestamp DEFAULT now(),
--   details jsonb,
--   old_value jsonb,
--   new_value jsonb,
--   warning text
-- );

-- Enable Row Level Security (RLS)
-- ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE cylinders ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE rentals ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE sales_orders ENABLE ROW LEVEL SECURITY;

-- POLICIES

-- PROFILES
-- DROP POLICY IF EXISTS "Users can view their own profile" ON profiles;
-- CREATE POLICY "Users can view their own profile" ON profiles
--   FOR SELECT USING (auth.uid() = id);

-- DROP POLICY IF EXISTS "Admins can update any profile, users their own" ON profiles;
-- CREATE POLICY "Admins can update any profile, users their own" ON profiles
--   FOR UPDATE USING (
--     (auth.uid() = id) OR
--     (exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'admin'))
--   );

-- CUSTOMERS
-- DROP POLICY IF EXISTS "All roles can view customers" ON customers;
-- CREATE POLICY "All roles can view customers" ON customers
--   FOR SELECT USING (true);

-- DROP POLICY IF EXISTS "Admins and managers can modify customers" ON customers;
-- CREATE POLICY "Admins and managers can modify customers" ON customers
--   FOR ALL USING (
--     exists (
--       select 1 from profiles p
--       where p.id = auth.uid() and p.role in ('admin', 'manager')
--     )
--   );

-- CYLINDERS
-- DROP POLICY IF EXISTS "All roles can view cylinders" ON cylinders;
-- CREATE POLICY "All roles can view cylinders" ON cylinders
--   FOR SELECT USING (true);

-- DROP POLICY IF EXISTS "Admins and managers can modify cylinders" ON cylinders;
-- CREATE POLICY "Admins and managers can modify cylinders" ON cylinders
--   FOR ALL USING (
--     exists (
--       select 1 from profiles p
--       where p.id = auth.uid() and p.role in ('admin', 'manager')
--     )
--   );

-- RENTALS
-- DROP POLICY IF EXISTS "All roles can view rentals" ON rentals;
-- CREATE POLICY "All roles can view rentals" ON rentals
--   FOR SELECT USING (true);

-- DROP POLICY IF EXISTS "Admins and managers can modify rentals" ON rentals;
-- CREATE POLICY "Admins and managers can modify rentals" ON rentals
--   FOR ALL USING (
--     exists (
--       select 1 from profiles p
--       where p.id = auth.uid() and p.role in ('admin', 'manager')
--     )
--   );

-- INVOICES
-- DROP POLICY IF EXISTS "All roles can view invoices" ON invoices;
-- CREATE POLICY "All roles can view invoices" ON invoices
--   FOR SELECT USING (true);

-- DROP POLICY IF EXISTS "Admins can modify invoices" ON invoices;
-- CREATE POLICY "Admins can modify invoices" ON invoices
--   FOR ALL USING (
--     exists (
--       select 1 from profiles p
--       where p.id = auth.uid() and p.role = 'admin'
--     )
--   );

-- SALES ORDERS POLICIES
-- DROP POLICY IF EXISTS "All roles can view sales orders" ON sales_orders;
-- CREATE POLICY "All roles can view sales orders" ON sales_orders
--   FOR SELECT USING (true);

-- DROP POLICY IF EXISTS "Admins and managers can modify sales orders" ON sales_orders;
-- CREATE POLICY "Admins and managers can modify sales orders" ON sales_orders
--   FOR ALL USING (
--     exists (
--       select 1 from profiles p
--       where p.id = auth.uid() and p.role in ('admin', 'manager')
--     )
--   );

-- NOTE: For case-insensitive lookups on CustomerListID, use LOWER(CustomerListID) or ILIKE in queries. 

-- ALTER TABLE profiles ADD COLUMN full_name text;

-- ALTER TABLE cylinders
-- ALTER COLUMN assigned_customer TYPE text
-- USING assigned_customer::text;

-- ALTER TABLE cylinders
-- DROP CONSTRAINT IF EXISTS cylinders_assigned_customer_fkey;

-- ALTER TABLE cylinders
-- ADD CONSTRAINT cylinders_assigned_customer_fkey
-- FOREIGN KEY (assigned_customer) REFERENCES customers("CustomerListID");

-- ALTER TABLE rentals
-- ALTER COLUMN customer_id TYPE text
-- USING customer_id::text;

-- ALTER TABLE rentals
-- DROP CONSTRAINT IF EXISTS rentals_customer_id_fkey;

-- ALTER TABLE rentals
-- ADD CONSTRAINT rentals_customer_id_fkey
-- FOREIGN KEY (customer_id) REFERENCES customers("CustomerListID");

-- ALTER TABLE cylinders ADD COLUMN IF NOT EXISTS barcode_number text;

-- ALTER TABLE cylinders DROP CONSTRAINT IF EXISTS unique_product_code_serial;

-- ALTER TABLE cylinders ADD CONSTRAINT unique_product_code_serial UNIQUE (product_code, serial_number);

-- ALTER TABLE cylinders DROP CONSTRAINT IF EXISTS cylinders_barcode_number_key;

-- SELECT conname FROM pg_constraint WHERE conrelid = 'cylinders'::regclass;

-- ASSET RECORDS TABLE
-- If your environment does not support CREATE TABLE IF NOT EXISTS, run this manually:
-- CREATE TABLE asset_records (
--   id serial PRIMARY KEY,
--   asset_id uuid references cylinders(id) on delete cascade,
--   event_type text not null, -- e.g., 'assigned', 'returned', 'maintenance'
--   event_date timestamptz not null default now(),
--   details jsonb, -- optional: for extra info
--   performed_by uuid references profiles(id),
--   customer_id text references customers("CustomerListID"),
--   notes text,
--   created_at timestamptz not null default now()
-- );

-- Normalization and barcode generation for all relevant fields
UPDATE customers
SET
  "CustomerListID" = LOWER(REGEXP_REPLACE(TRIM("CustomerListID"), '\s+', '', 'g')),
  customer_number = LOWER(REGEXP_REPLACE(TRIM(customer_number), '\s+', '', 'g')),
  barcode = regexp_replace(barcode, '^\*%|%?\*$', '', 'g'),
  customer_barcode = regexp_replace(customer_barcode, '^\*%|%?\*$', '', 'g')
WHERE "CustomerListID" IS NOT NULL;

UPDATE cylinders
SET assigned_customer = LOWER(REGEXP_REPLACE(TRIM(assigned_customer), '\s+', '', 'g'))
WHERE assigned_customer IS NOT NULL;

UPDATE rentals
SET customer_id = LOWER(REGEXP_REPLACE(TRIM(customer_id), '\s+', '', 'g'))
WHERE customer_id IS NOT NULL;

UPDATE asset_records
SET customer_id = LOWER(REGEXP_REPLACE(TRIM(customer_id), '\s+', '', 'g'))
WHERE customer_id IS NOT NULL;

DELETE FROM customers
WHERE ctid NOT IN (
  SELECT min(ctid)
  FROM customers
  GROUP BY LOWER(REGEXP_REPLACE(TRIM("CustomerListID"), '\s+', '', 'g'))
);

-- Example: Update a single customer
UPDATE customers
SET
  name = 'Acme Corp',
  contact_details = '123 Main St, New York, NY',
  phone = '555-1234'
WHERE "CustomerListID" = '1370000-1230594764';

-- Example: Bulk update from an import table (customize as needed)
-- The following is just an example. To use it, you must first create and populate the customer_imports table.
UPDATE customers
SET customer_barcode = ci."Customer Barcode"
FROM customer_imports ci
WHERE customers."CustomerListID" = ci."CustomerListID";

-- Ensure all customer barcodes are populated
UPDATE customers
SET barcode = COALESCE(customer_barcode, "CustomerListID")
WHERE barcode IS NULL OR barcode = '';

-- Remove any *%...* wrapping from all barcodes
UPDATE customers
SET
  barcode = regexp_replace(barcode, '^[*]+|[*]+$', '', 'g'),
  customer_barcode = regexp_replace(customer_barcode, '^[*]+|[*]+$', '', 'g')
WHERE barcode LIKE '*%' OR barcode LIKE '%*' OR customer_barcode LIKE '*%' OR customer_barcode LIKE '%*';

-- Populate missing barcodes with normalized CustomerListID (no extra characters)
UPDATE customers
SET barcode = LOWER(REGEXP_REPLACE(TRIM("CustomerListID"), '\\s+', '', 'g'))
WHERE "CustomerListID" IS NOT NULL AND (barcode IS NULL OR barcode = '');

CREATE TABLE IF NOT EXISTS customer_imports (
  "CustomerListID" text,
  name text,
  "Customer Barcode" text,
  -- add other columns as needed
  created_at timestamp DEFAULT now()
);

DROP TABLE IF EXISTS customer_imports;

UPDATE customers
SET barcode = customer_barcode
WHERE customer_barcode IS NOT NULL AND (barcode IS NULL OR barcode = '');

ALTER TABLE customers ADD COLUMN barcode text;

-- GAS TYPES TABLE (for Add Cylinder dropdown)
CREATE TABLE IF NOT EXISTS gas_types (
  id serial PRIMARY KEY,
  name text UNIQUE NOT NULL
);

-- Populate with common gas types (idempotent)
INSERT INTO gas_types (name) VALUES
  ('Oxygen'),
  ('Nitrogen'),
  ('Argon'),
  ('CO2'),
  ('Helium')
ON CONFLICT (name) DO NOTHING; 