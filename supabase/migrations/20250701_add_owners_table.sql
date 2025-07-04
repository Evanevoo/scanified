-- Add owners table for bottle ownership, organization-specific
CREATE TABLE owners (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (name, organization_id)
);

CREATE INDEX idx_owners_organization_id ON owners(organization_id); 