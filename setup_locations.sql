-- Create locations table
CREATE TABLE IF NOT EXISTS locations (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    gst_rate DECIMAL(5,2) NOT NULL DEFAULT 5.0,
    pst_rate DECIMAL(5,2) NOT NULL DEFAULT 0.0,
    total_tax_rate DECIMAL(5,2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add missing columns to existing locations table
ALTER TABLE locations ADD COLUMN IF NOT EXISTS gst_rate DECIMAL(5,2) DEFAULT 5.0;
ALTER TABLE locations ADD COLUMN IF NOT EXISTS pst_rate DECIMAL(5,2) DEFAULT 0.0;
ALTER TABLE locations ADD COLUMN IF NOT EXISTS total_tax_rate DECIMAL(5,2) DEFAULT 5.0;
ALTER TABLE locations ADD COLUMN IF NOT EXISTS province TEXT;
ALTER TABLE locations ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
ALTER TABLE locations ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Add unique constraint on name column (will fail silently if already exists)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'locations_name_unique'
    ) THEN
        ALTER TABLE locations ADD CONSTRAINT locations_name_unique UNIQUE (name);
    END IF;
END $$;

-- Insert initial locations with current tax rates (as of 2024)
-- Using UUID format for id column
INSERT INTO locations (id, name, province, gst_rate, pst_rate, total_tax_rate) VALUES
    (gen_random_uuid(), 'Saskatoon', 'Saskatchewan', 5.0, 6.0, 11.0),
    (gen_random_uuid(), 'Regina', 'Saskatchewan', 5.0, 6.0, 11.0),
    (gen_random_uuid(), 'Chilliwack', 'British Columbia', 5.0, 7.0, 12.0),
    (gen_random_uuid(), 'Prince George', 'British Columbia', 5.0, 7.0, 12.0)
ON CONFLICT (name) DO UPDATE SET
    province = EXCLUDED.province,
    gst_rate = EXCLUDED.gst_rate,
    pst_rate = EXCLUDED.pst_rate,
    total_tax_rate = EXCLUDED.total_tax_rate,
    updated_at = NOW();

-- Add location column to cylinders table if it doesn't exist
ALTER TABLE cylinders ADD COLUMN IF NOT EXISTS location TEXT;

-- Add location column to rentals table if it doesn't exist
ALTER TABLE rentals ADD COLUMN IF NOT EXISTS location TEXT;

-- Add status column to rentals table if it doesn't exist
ALTER TABLE rentals ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active';

-- Create index on location for better performance
CREATE INDEX IF NOT EXISTS idx_cylinders_location ON cylinders(location);
CREATE INDEX IF NOT EXISTS idx_rentals_location ON rentals(location);
CREATE INDEX IF NOT EXISTS idx_rentals_status ON rentals(status); 