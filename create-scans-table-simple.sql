-- Simple scans table creation for gas cylinder mobile app
-- This ensures proper UUID generation

-- First, ensure the uuid extension is enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Drop the table if it exists to recreate it properly
DROP TABLE IF EXISTS scans CASCADE;

-- Create the scans table with proper UUID generation
CREATE TABLE scans (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    organization_id UUID,
    barcode_number VARCHAR(255) NOT NULL,
    action VARCHAR(50) NOT NULL CHECK (action IN ('in', 'out', 'locate', 'fill')),
    location TEXT,
    notes TEXT,
    scanned_by UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX idx_scans_organization_id ON scans(organization_id);
CREATE INDEX idx_scans_barcode_number ON scans(barcode_number);
CREATE INDEX idx_scans_action ON scans(action);
CREATE INDEX idx_scans_created_at ON scans(created_at);
CREATE INDEX idx_scans_scanned_by ON scans(scanned_by);

-- Enable Row Level Security
ALTER TABLE scans ENABLE ROW LEVEL SECURITY;

-- Create RLS policies (simplified for now)
CREATE POLICY "Allow all operations for authenticated users" ON scans
    FOR ALL USING (auth.role() = 'authenticated');

-- Add comments for documentation
COMMENT ON TABLE scans IS 'Stores all barcode scans from the mobile gas cylinder app';
COMMENT ON COLUMN scans.barcode_number IS 'The scanned barcode number';
COMMENT ON COLUMN scans.action IS 'The action performed: in (check-in), out (check-out), locate, fill';
COMMENT ON COLUMN scans.location IS 'Optional location where scan was performed';
COMMENT ON COLUMN scans.notes IS 'Optional notes about the scan';
COMMENT ON COLUMN scans.scanned_by IS 'User who performed the scan';
