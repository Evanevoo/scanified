-- Create ownership_values table
-- This table stores unique ownership values for each organization
-- Ownership values are automatically populated when bottles are uploaded

CREATE TABLE IF NOT EXISTS ownership_values (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  value TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(organization_id, value)
);

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_ownership_values_organization_id 
  ON ownership_values(organization_id);

CREATE INDEX IF NOT EXISTS idx_ownership_values_value 
  ON ownership_values(value);

-- Enable RLS
ALTER TABLE ownership_values ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view ownership values in their organization" 
  ON ownership_values FOR SELECT 
  USING (
    organization_id IN (
      SELECT organization_id FROM profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can insert ownership values in their organization" 
  ON ownership_values FOR INSERT 
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can update ownership values in their organization" 
  ON ownership_values FOR UPDATE 
  USING (
    organization_id IN (
      SELECT organization_id FROM profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can delete ownership values in their organization" 
  ON ownership_values FOR DELETE 
  USING (
    organization_id IN (
      SELECT organization_id FROM profiles WHERE id = auth.uid()
    )
  );

-- Create function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_ownership_values_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to call the function
CREATE TRIGGER update_ownership_values_timestamp
  BEFORE UPDATE ON ownership_values
  FOR EACH ROW
  EXECUTE FUNCTION update_ownership_values_updated_at();

-- Populate existing ownership values from bottles table
INSERT INTO ownership_values (organization_id, value)
SELECT DISTINCT organization_id, ownership
FROM bottles
WHERE ownership IS NOT NULL 
  AND ownership != ''
ON CONFLICT (organization_id, value) DO NOTHING;

COMMENT ON TABLE ownership_values IS 'Stores unique ownership values for each organization. Automatically populated when bottles are uploaded.';
COMMENT ON COLUMN ownership_values.value IS 'The ownership value (e.g., WeldCor, RP&G, Customer Owned)';

