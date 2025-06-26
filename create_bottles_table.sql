-- Create bottles table for bottle management functionality
-- Run this script in your Supabase SQL editor

-- Create bottles table if it doesn't exist
CREATE TABLE IF NOT EXISTS bottles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    barcode_number TEXT,
    serial_number TEXT,
    product_code TEXT,
    description TEXT,
    days_at_location INTEGER DEFAULT 0,
    customer_name TEXT,
    gas_type TEXT,
    assigned_customer TEXT,
    rental_start_date DATE,
    status TEXT DEFAULT 'available',
    category TEXT,
    group_name TEXT,
    type TEXT,
    in_house_total INTEGER DEFAULT 0,
    with_customer_total INTEGER DEFAULT 0,
    lost_total INTEGER DEFAULT 0,
    total INTEGER DEFAULT 0,
    dock_stock TEXT,
    location TEXT,
    organization_id UUID,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add organization_id column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_name = 'bottles' AND column_name = 'organization_id'
    ) THEN
        ALTER TABLE bottles ADD COLUMN organization_id UUID;
    END IF;
END $$;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_bottles_barcode_number ON bottles(barcode_number);
CREATE INDEX IF NOT EXISTS idx_bottles_serial_number ON bottles(serial_number);
CREATE INDEX IF NOT EXISTS idx_bottles_organization_id ON bottles(organization_id);
CREATE INDEX IF NOT EXISTS idx_bottles_status ON bottles(status);
CREATE INDEX IF NOT EXISTS idx_bottles_location ON bottles(location);

-- Enable Row Level Security
ALTER TABLE bottles ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Allow all operations on bottles" ON bottles;
DROP POLICY IF EXISTS "Allow users to read bottles in their organization" ON bottles;
DROP POLICY IF EXISTS "Allow users to insert bottles in their organization" ON bottles;
DROP POLICY IF EXISTS "Allow users to update bottles in their organization" ON bottles;
DROP POLICY IF EXISTS "Allow users to delete bottles in their organization" ON bottles;

-- Create proper RLS policies for organization-based access
CREATE POLICY "Allow users to read bottles in their organization" ON bottles
FOR SELECT USING (
    organization_id = (
        SELECT organization_id FROM profiles 
        WHERE id = auth.uid()
    )
);

CREATE POLICY "Allow users to insert bottles in their organization" ON bottles
FOR INSERT WITH CHECK (
    organization_id = (
        SELECT organization_id FROM profiles 
        WHERE id = auth.uid()
    )
);

CREATE POLICY "Allow users to update bottles in their organization" ON bottles
FOR UPDATE USING (
    organization_id = (
        SELECT organization_id FROM profiles 
        WHERE id = auth.uid()
    )
);

CREATE POLICY "Allow users to delete bottles in their organization" ON bottles
FOR DELETE USING (
    organization_id = (
        SELECT organization_id FROM profiles 
        WHERE id = auth.uid()
    )
);

-- Create trigger to automatically set organization_id
CREATE OR REPLACE FUNCTION set_bottle_organization_id()
RETURNS TRIGGER AS $$
DECLARE
    user_org_id UUID;
BEGIN
    -- Get the user's organization_id
    SELECT organization_id INTO user_org_id
    FROM profiles 
    WHERE id = auth.uid();
    
    -- If user has an organization_id, set it
    IF user_org_id IS NOT NULL THEN
        NEW.organization_id = user_org_id;
    ELSE
        -- If no organization_id, raise an error
        RAISE EXCEPTION 'User must be assigned to an organization to create bottles';
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS set_organization_id_bottles ON bottles;
CREATE TRIGGER set_organization_id_bottles
    BEFORE INSERT ON bottles
    FOR EACH ROW
    EXECUTE FUNCTION set_bottle_organization_id();

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_bottles_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_bottles_updated_at_trigger ON bottles;
CREATE TRIGGER update_bottles_updated_at_trigger
    BEFORE UPDATE ON bottles
    FOR EACH ROW
    EXECUTE FUNCTION update_bottles_updated_at();

-- Insert some sample data if the table is empty (without customer_list_id)
-- Note: These will only work if the user running the script has an organization_id
INSERT INTO bottles (
    barcode_number,
    serial_number,
    product_code,
    description,
    customer_name,
    gas_type,
    status,
    location
) 
SELECT 
    'BC001', 'SN001', 'PC001', 'Propane Tank 20lb', 'Sample Customer 1', 'Propane', 'available', 'Saskatoon'
WHERE NOT EXISTS (SELECT 1 FROM bottles WHERE barcode_number = 'BC001');

INSERT INTO bottles (
    barcode_number,
    serial_number,
    product_code,
    description,
    customer_name,
    gas_type,
    status,
    location
) 
SELECT 
    'BC002', 'SN002', 'PC002', 'Oxygen Tank 40cf', 'Sample Customer 2', 'Oxygen', 'rented', 'Regina'
WHERE NOT EXISTS (SELECT 1 FROM bottles WHERE barcode_number = 'BC002');

INSERT INTO bottles (
    barcode_number,
    serial_number,
    product_code,
    description,
    customer_name,
    gas_type,
    status,
    location
) 
SELECT 
    'BC003', 'SN003', 'PC003', 'Nitrogen Tank 80cf', 'Sample Customer 3', 'Nitrogen', 'available', 'Chilliwack'
WHERE NOT EXISTS (SELECT 1 FROM bottles WHERE barcode_number = 'BC003'); 