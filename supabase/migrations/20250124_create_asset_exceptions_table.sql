-- Create asset_exceptions table for tracking return exceptions
CREATE TABLE IF NOT EXISTS asset_exceptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  asset_id UUID REFERENCES bottles(id) ON DELETE SET NULL,
  asset_barcode TEXT,
  customer_id TEXT,
  customer_name TEXT,
  exception_type TEXT NOT NULL,
  resolution_status TEXT NOT NULL DEFAULT 'PENDING',
  resolution_note TEXT,
  transaction_id UUID, -- Can reference bottle_scans or other transaction records
  transaction_type TEXT, -- e.g., 'RETURN', 'DELIVERY', etc.
  order_number TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  resolved_at TIMESTAMP WITH TIME ZONE,
  resolved_by UUID REFERENCES profiles(id),
  metadata JSONB, -- For additional context
  CONSTRAINT valid_resolution_status CHECK (resolution_status IN ('PENDING', 'RESOLVED', 'IGNORED'))
);

-- Create index for efficient queries
CREATE INDEX IF NOT EXISTS idx_asset_exceptions_organization ON asset_exceptions(organization_id);
CREATE INDEX IF NOT EXISTS idx_asset_exceptions_asset ON asset_exceptions(asset_id);
CREATE INDEX IF NOT EXISTS idx_asset_exceptions_customer ON asset_exceptions(customer_id);
CREATE INDEX IF NOT EXISTS idx_asset_exceptions_type ON asset_exceptions(exception_type);
CREATE INDEX IF NOT EXISTS idx_asset_exceptions_status ON asset_exceptions(resolution_status);
CREATE INDEX IF NOT EXISTS idx_asset_exceptions_created ON asset_exceptions(created_at DESC);

-- Enable RLS
ALTER TABLE asset_exceptions ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view exceptions from their organization"
  ON asset_exceptions FOR SELECT
  USING (organization_id IN (
    SELECT organization_id FROM profiles WHERE id = auth.uid()
  ));

CREATE POLICY "Users can insert exceptions for their organization"
  ON asset_exceptions FOR INSERT
  WITH CHECK (organization_id IN (
    SELECT organization_id FROM profiles WHERE id = auth.uid()
  ));

CREATE POLICY "Users can update exceptions from their organization"
  ON asset_exceptions FOR UPDATE
  USING (organization_id IN (
    SELECT organization_id FROM profiles WHERE id = auth.uid()
  ));

-- Add comment
COMMENT ON TABLE asset_exceptions IS 'Tracks exceptions for asset transactions, particularly returns where assets were not on customer balance';

