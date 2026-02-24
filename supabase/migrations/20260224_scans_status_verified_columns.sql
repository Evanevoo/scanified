-- Scans table: add status and verified columns so unverify can set status='pending'
-- and the Verified Orders list correctly excludes unverified scanned orders.
ALTER TABLE scans ADD COLUMN IF NOT EXISTS status TEXT;
ALTER TABLE scans ADD COLUMN IF NOT EXISTS verified_at TIMESTAMPTZ;
ALTER TABLE scans ADD COLUMN IF NOT EXISTS verified_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;

COMMENT ON COLUMN scans.status IS 'pending | approved | verified; used to show/hide in Verified Orders and Order Verification.';
COMMENT ON COLUMN scans.verified_at IS 'When this scan (or its order) was verified.';
COMMENT ON COLUMN scans.verified_by IS 'User who verified (if applicable).';
