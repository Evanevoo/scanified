-- Create scans table for gas cylinder mobile app
-- This table stores all barcode scans from the mobile app

CREATE TABLE IF NOT EXISTS scans (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    barcode_number VARCHAR(255) NOT NULL,
    action VARCHAR(50) NOT NULL CHECK (action IN ('in', 'out', 'locate', 'fill')),
    location TEXT,
    notes TEXT,
    scanned_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Add indexes for better performance
    CONSTRAINT scans_organization_barcode_unique UNIQUE (organization_id, barcode_number, created_at)
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_scans_organization_id ON scans(organization_id);
CREATE INDEX IF NOT EXISTS idx_scans_barcode_number ON scans(barcode_number);
CREATE INDEX IF NOT EXISTS idx_scans_action ON scans(action);
CREATE INDEX IF NOT EXISTS idx_scans_created_at ON scans(created_at);
CREATE INDEX IF NOT EXISTS idx_scans_scanned_by ON scans(scanned_by);

-- Enable Row Level Security
ALTER TABLE scans ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view scans from their organization" ON scans
    FOR SELECT USING (
        organization_id IN (
            SELECT organization_id FROM profiles 
            WHERE id = auth.uid()
        )
    );

CREATE POLICY "Users can insert scans for their organization" ON scans
    FOR INSERT WITH CHECK (
        organization_id IN (
            SELECT organization_id FROM profiles 
            WHERE id = auth.uid()
        )
    );

CREATE POLICY "Users can update scans from their organization" ON scans
    FOR UPDATE USING (
        organization_id IN (
            SELECT organization_id FROM profiles 
            WHERE id = auth.uid()
        )
    );

CREATE POLICY "Users can delete scans from their organization" ON scans
    FOR DELETE USING (
        organization_id IN (
            SELECT organization_id FROM profiles 
            WHERE id = auth.uid()
        )
    );

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_scans_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_scans_updated_at_trigger
    BEFORE UPDATE ON scans
    FOR EACH ROW
    EXECUTE FUNCTION update_scans_updated_at();

-- Add comments for documentation
COMMENT ON TABLE scans IS 'Stores all barcode scans from the mobile gas cylinder app';
COMMENT ON COLUMN scans.barcode_number IS 'The scanned barcode number';
COMMENT ON COLUMN scans.action IS 'The action performed: in (check-in), out (check-out), locate, fill';
COMMENT ON COLUMN scans.location IS 'Optional location where scan was performed';
COMMENT ON COLUMN scans.notes IS 'Optional notes about the scan';
COMMENT ON COLUMN scans.scanned_by IS 'User who performed the scan';
