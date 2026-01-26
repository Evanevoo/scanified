-- Create cylinder_fills table if it does not exist (used by Fill Cylinder app, Bottles for Day, Asset Detail history)
-- Then add any missing columns for cancel/edit support on existing installations.

CREATE TABLE IF NOT EXISTS cylinder_fills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cylinder_id UUID REFERENCES bottles(id) ON DELETE CASCADE,
  barcode_number TEXT,
  fill_date TIMESTAMPTZ NOT NULL,
  filled_by TEXT,
  notes TEXT,
  organization_id UUID REFERENCES organizations(id),
  fill_type TEXT,
  previous_status TEXT,
  previous_location TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add columns for existing tables that were created with only the core fields
ALTER TABLE cylinder_fills ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id);
ALTER TABLE cylinder_fills ADD COLUMN IF NOT EXISTS fill_type TEXT;
ALTER TABLE cylinder_fills ADD COLUMN IF NOT EXISTS previous_status TEXT;
ALTER TABLE cylinder_fills ADD COLUMN IF NOT EXISTS previous_location TEXT;

-- Indexes for organization filtering, bottles-for-day, and asset history
CREATE INDEX IF NOT EXISTS idx_cylinder_fills_cylinder ON cylinder_fills(cylinder_id);
CREATE INDEX IF NOT EXISTS idx_cylinder_fills_organization ON cylinder_fills(organization_id);
CREATE INDEX IF NOT EXISTS idx_cylinder_fills_fill_date ON cylinder_fills(fill_date DESC);
CREATE INDEX IF NOT EXISTS idx_cylinder_fills_barcode ON cylinder_fills(barcode_number);

COMMENT ON TABLE cylinder_fills IS 'Records for full/empty status changes from Fill Cylinder; used by Bottles for Day and cylinder history.';
COMMENT ON COLUMN cylinder_fills.fill_type IS 'Status set by this fill: full or empty';
COMMENT ON COLUMN cylinder_fills.previous_status IS 'Bottle status before this fill; used to revert on cancel';
COMMENT ON COLUMN cylinder_fills.previous_location IS 'Bottle location before this fill; used to revert on cancel';
