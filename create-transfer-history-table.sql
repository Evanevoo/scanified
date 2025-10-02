-- Transfer History Table
-- This table tracks all asset transfer operations for audit trail and reporting

-- Create transfer_history table if it doesn't exist
CREATE TABLE IF NOT EXISTS transfer_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL,
  
  -- Source information
  from_customer_id TEXT NOT NULL,
  from_customer_name TEXT NOT NULL,
  
  -- Target information  
  to_customer_id TEXT, -- NULL for warehouse transfers
  to_customer_name TEXT, -- NULL for warehouse transfers
  
  -- Transfer details
  asset_ids JSONB NOT NULL, -- Array of transferred asset IDs
  asset_count INTEGER NOT NULL,
  transfer_type TEXT NOT NULL DEFAULT 'customer_to_customer', -- customer_to_customer, warehouse_return, etc.
  reason TEXT DEFAULT '',
  
  -- Additional metadata
  wallet_hazardous BOOLEAN DEFAULT false,
  requires_inspection BOOLEAN DEFAULT false,
  
  -- Timestamps
  transferred_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Metadata
  created_by_user_id UUID,
  transfer_method TEXT DEFAULT 'web_interface' -- web_interface, mobile_app, bulk_import, etc.
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_transfer_history_org_id ON transfer_history(organization_id);
CREATE INDEX IF NOT EXISTS idx_transfer_history_customers ON transfer_history(from_customer_id, to_customer_id);
CREATE INDEX IF NOT EXISTS idx_transfer_history_type ON transfer_history(transfer_type);
CREATE INDEX IF NOT EXISTS idx_transfer_history_date ON transfer_history(transferred_at DESC);

-- Add RLS policies
ALTER TABLE transfer_history ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see transfers for their organization
CREATE POLICY "Users can view transfers for their organization" ON transfer_history
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id 
      FROM profiles 
      WHERE id = auth.uid()
    )
  );

-- Policy: Users can insert transfers for their organization
CREATE POLICY "Users can insert transfers for their organization" ON transfer_history  
  FOR INSERT WITH CHECK (
    organization_id IN (
      SELECT organization_id 
      FROM profiles 
      WHERE id = auth.uid()
    )
  );

-- Add comments for documentation
COMMENT ON TABLE transfer_history IS 'Tracks all asset transfers between customers and warehouse operations for audit trail';
COMMENT ON COLUMN transfer_history.transfer_type IS 'Type of transfer: customer_to_customer, warehouse_return, warehouse_distribution, etc.';
COMMENT ON COLUMN transfer_history.asset_ids IS 'JSON array of transferred asset/bottle IDs';
COMMENT ON COLUMN transfer_history.wallet_hazardous IS 'Whether transfer involves hazardous materials requiring special handling';
COMMENT ON COLUMN transfer_history.requires_inspection IS 'Whether transferred assets require inspection before customer use';

-- Success message
SELECT 'Transfer history table created successfully!' as result;
