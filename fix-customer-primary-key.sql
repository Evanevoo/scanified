-- Fix Customer Primary Key for Multi-Tenancy
-- This migration changes the customers table to support proper multi-tenancy

-- 1. Add a new UUID primary key column
ALTER TABLE customers ADD COLUMN IF NOT EXISTS id UUID DEFAULT gen_random_uuid();

-- 2. Update existing customers to have unique UUIDs if they don't already
UPDATE customers SET id = gen_random_uuid() WHERE id IS NULL;

-- 3. Make the id column NOT NULL
ALTER TABLE customers ALTER COLUMN id SET NOT NULL;

-- 4. Drop all foreign key constraints that reference customers_pkey
ALTER TABLE invoices DROP CONSTRAINT IF EXISTS invoices_customer_id_fkey;
ALTER TABLE rentals DROP CONSTRAINT IF EXISTS rentals_customer_id_fkey;
ALTER TABLE asset_records DROP CONSTRAINT IF EXISTS asset_records_customer_id_fkey;
ALTER TABLE bottles DROP CONSTRAINT IF EXISTS bottles_assigned_customer_fkey;
ALTER TABLE bottles DROP CONSTRAINT IF EXISTS bottles_customer_list_id_fkey;
ALTER TABLE bottle_scans DROP CONSTRAINT IF EXISTS bottle_scans_customer_id_fkey;
ALTER TABLE deliveries DROP CONSTRAINT IF EXISTS deliveries_customer_id_fkey;

-- 5. Add new columns to reference tables to store the customer UUID
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS customer_uuid UUID;
ALTER TABLE rentals ADD COLUMN IF NOT EXISTS customer_uuid UUID;
ALTER TABLE asset_records ADD COLUMN IF NOT EXISTS customer_uuid UUID;
ALTER TABLE bottles ADD COLUMN IF NOT EXISTS customer_uuid UUID;
ALTER TABLE bottle_scans ADD COLUMN IF NOT EXISTS customer_uuid UUID;
ALTER TABLE deliveries ADD COLUMN IF NOT EXISTS customer_uuid UUID;

-- 6. Update the new UUID columns with the corresponding customer UUIDs
UPDATE invoices SET customer_uuid = c.id 
FROM customers c 
WHERE invoices.customer_id = c."CustomerListID";

UPDATE rentals SET customer_uuid = c.id 
FROM customers c 
WHERE rentals.customer_id = c."CustomerListID";

UPDATE asset_records SET customer_uuid = c.id 
FROM customers c 
WHERE asset_records.customer_id = c."CustomerListID";

UPDATE bottles SET customer_uuid = c.id 
FROM customers c 
WHERE bottles.assigned_customer = c."CustomerListID";

UPDATE bottle_scans SET customer_uuid = c.id 
FROM customers c 
WHERE bottle_scans.customer_id = c."CustomerListID";

UPDATE deliveries SET customer_uuid = c.id 
FROM customers c 
WHERE deliveries.customer_id = c."CustomerListID";

-- 7. Drop the old primary key constraint with CASCADE to handle any remaining dependencies
ALTER TABLE customers DROP CONSTRAINT IF EXISTS customers_pkey CASCADE;

-- 8. Make the new id column the primary key
ALTER TABLE customers ADD CONSTRAINT customers_pkey PRIMARY KEY (id);

-- 9. Create a unique constraint for organization_id + CustomerListID combination
-- This allows the same CustomerListID to exist in different organizations
ALTER TABLE customers ADD CONSTRAINT customers_organization_customerlistid_unique 
UNIQUE (organization_id, "CustomerListID");

-- 10. Recreate foreign key constraints using the new UUID columns
ALTER TABLE invoices ADD CONSTRAINT invoices_customer_uuid_fkey 
FOREIGN KEY (customer_uuid) REFERENCES customers(id);

ALTER TABLE rentals ADD CONSTRAINT rentals_customer_uuid_fkey 
FOREIGN KEY (customer_uuid) REFERENCES customers(id);

ALTER TABLE asset_records ADD CONSTRAINT asset_records_customer_uuid_fkey 
FOREIGN KEY (customer_uuid) REFERENCES customers(id);

ALTER TABLE bottles ADD CONSTRAINT bottles_customer_uuid_fkey 
FOREIGN KEY (customer_uuid) REFERENCES customers(id);

ALTER TABLE bottle_scans ADD CONSTRAINT bottle_scans_customer_uuid_fkey 
FOREIGN KEY (customer_uuid) REFERENCES customers(id);

ALTER TABLE deliveries ADD CONSTRAINT deliveries_customer_uuid_fkey 
FOREIGN KEY (customer_uuid) REFERENCES customers(id);

-- 11. Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_customers_organization_customerlistid 
ON customers (organization_id, "CustomerListID");

CREATE INDEX IF NOT EXISTS idx_customers_customerlistid 
ON customers ("CustomerListID");

CREATE INDEX IF NOT EXISTS idx_invoices_customer_uuid 
ON invoices (customer_uuid);

CREATE INDEX IF NOT EXISTS idx_rentals_customer_uuid 
ON rentals (customer_uuid);

CREATE INDEX IF NOT EXISTS idx_asset_records_customer_uuid 
ON asset_records (customer_uuid);

CREATE INDEX IF NOT EXISTS idx_bottles_customer_uuid 
ON bottles (customer_uuid);

CREATE INDEX IF NOT EXISTS idx_bottle_scans_customer_uuid 
ON bottle_scans (customer_uuid);

CREATE INDEX IF NOT EXISTS idx_deliveries_customer_uuid 
ON deliveries (customer_uuid);

-- 12. Verify the changes
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'customers' 
AND column_name IN ('id', 'CustomerListID', 'organization_id')
ORDER BY column_name;

-- 13. Show the new constraints
SELECT 
    constraint_name,
    constraint_type
FROM information_schema.table_constraints 
WHERE table_name = 'customers'
AND constraint_type IN ('PRIMARY KEY', 'UNIQUE'); 