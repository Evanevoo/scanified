-- Rental Class Groups table for rental configuration
CREATE TABLE IF NOT EXISTS rental_class_groups (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS
ALTER TABLE rental_class_groups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow org members to manage rental_class_groups"
  ON rental_class_groups FOR ALL
  USING (
    organization_id IN (
      SELECT organization_id FROM profiles WHERE id = auth.uid()
    )
  )
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM profiles WHERE id = auth.uid()
    )
  );

-- Index for org lookups
CREATE INDEX IF NOT EXISTS idx_rental_class_groups_org ON rental_class_groups(organization_id);
