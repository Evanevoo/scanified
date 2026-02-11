-- Support for customers with departments
-- 1) Optional single department on customer (quick/simple use case)
-- 2) customer_departments table for customers with multiple departments

-- Single department field on customers (nullable)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_schema = 'public'
                 AND table_name = 'customers'
                 AND column_name = 'department') THEN
    ALTER TABLE customers ADD COLUMN department TEXT;
    RAISE NOTICE 'Added department column to customers table';
  ELSE
    RAISE NOTICE 'Column customers.department already exists';
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_customers_department ON customers(department) WHERE department IS NOT NULL;

-- Table for multiple departments per customer (optional; use when one customer has many departments)
CREATE TABLE IF NOT EXISTS customer_departments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL,
  name TEXT NOT NULL,
  code TEXT,
  address TEXT,
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- FK to customers: use id (uuid) if column exists
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints
                 WHERE constraint_name = 'customer_departments_customer_id_fkey'
                 AND table_name = 'customer_departments') THEN
    IF EXISTS (SELECT 1 FROM information_schema.columns
               WHERE table_schema = 'public' AND table_name = 'customers' AND column_name = 'id') THEN
      ALTER TABLE customer_departments
        ADD CONSTRAINT customer_departments_customer_id_fkey
        FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE;
    END IF;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_customer_departments_customer ON customer_departments(customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_departments_org ON customer_departments(organization_id);

COMMENT ON COLUMN customers.department IS 'Optional single department/location/cost center for this customer. Use customer_departments for multiple departments.';
COMMENT ON TABLE customer_departments IS 'Optional list of departments per customer. Use when one customer has multiple departments/locations/cost centers.';

-- Tell PostgREST to reload its schema cache so API requests see the new column
NOTIFY pgrst, 'reload schema';
