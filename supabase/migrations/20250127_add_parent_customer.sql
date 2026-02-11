-- Parent-child customer relationship (e.g. Stevenson Industrial -> Stevenson Industrial Regina, Stevenson Industrial Saskatoon)
-- "Department" = child customer under a parent customer.

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_schema = 'public'
                 AND table_name = 'customers'
                 AND column_name = 'parent_customer_id') THEN
    ALTER TABLE customers ADD COLUMN parent_customer_id UUID REFERENCES customers(id) ON DELETE SET NULL;
    RAISE NOTICE 'Added parent_customer_id column to customers table';
  ELSE
    RAISE NOTICE 'Column customers.parent_customer_id already exists';
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_customers_parent_customer_id ON customers(parent_customer_id) WHERE parent_customer_id IS NOT NULL;

COMMENT ON COLUMN customers.parent_customer_id IS 'Parent customer (e.g. Stevenson Industrial). This customer is a location/department under that parent (e.g. Stevenson Industrial Regina under Stevenson Industrial).';
