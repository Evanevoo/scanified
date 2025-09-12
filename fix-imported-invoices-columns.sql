-- Add missing columns to imported_invoices table for bulk operations
ALTER TABLE imported_invoices
ADD COLUMN IF NOT EXISTS rejected_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS rejected_by UUID,
ADD COLUMN IF NOT EXISTS verified_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS verified_by UUID,
ADD COLUMN IF NOT EXISTS investigation_started_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS investigation_started_by UUID,
ADD COLUMN IF NOT EXISTS auto_approved BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS auto_approval_reason TEXT;

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_imported_invoices_rejected_at ON imported_invoices(rejected_at);
CREATE INDEX IF NOT EXISTS idx_imported_invoices_verified_at ON imported_invoices(verified_at);
CREATE INDEX IF NOT EXISTS idx_imported_invoices_investigation_started_at ON imported_invoices(investigation_started_at);

-- Add comments for documentation
COMMENT ON COLUMN imported_invoices.rejected_at IS 'Timestamp when the invoice was rejected';
COMMENT ON COLUMN imported_invoices.rejected_by IS 'ID of the user who rejected the invoice';
COMMENT ON COLUMN imported_invoices.verified_at IS 'Timestamp when the invoice was verified/approved';
COMMENT ON COLUMN imported_invoices.verified_by IS 'ID of the user who verified the invoice';
COMMENT ON COLUMN imported_invoices.investigation_started_at IS 'Timestamp when investigation was started';
COMMENT ON COLUMN imported_invoices.investigation_started_by IS 'ID of the user who started the investigation';
COMMENT ON COLUMN imported_invoices.auto_approved IS 'Whether the invoice was auto-approved due to quantity matching';
COMMENT ON COLUMN imported_invoices.auto_approval_reason IS 'Reason for auto-approval';
