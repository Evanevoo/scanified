-- Add status column to scans table to track rejected scans
-- This prevents rejected scanned-only records from reappearing

-- Add status column to scans table
ALTER TABLE scans 
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected'));

-- Add rejection tracking columns
ALTER TABLE scans 
ADD COLUMN IF NOT EXISTS rejected_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS rejected_by UUID;

-- Create indexes for the new columns
CREATE INDEX IF NOT EXISTS idx_scans_status ON scans(status);
CREATE INDEX IF NOT EXISTS idx_scans_rejected_at ON scans(rejected_at);
CREATE INDEX IF NOT EXISTS idx_scans_rejected_by ON scans(rejected_by);

-- Add comments for documentation
COMMENT ON COLUMN scans.status IS 'Status of the scan: pending, approved, rejected';
COMMENT ON COLUMN scans.rejected_at IS 'Timestamp when the scan was rejected';
COMMENT ON COLUMN scans.rejected_by IS 'User ID who rejected the scan';

-- Update existing scans to have 'pending' status
UPDATE scans SET status = 'pending' WHERE status IS NULL;
