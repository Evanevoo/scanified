-- Drop the old unique constraint if it exists
ALTER TABLE locations DROP CONSTRAINT IF EXISTS locations_name_province_unique;

-- Add a new unique constraint for organization_id, name, and province
ALTER TABLE locations ADD CONSTRAINT locations_org_name_province_unique UNIQUE (organization_id, name, province); 