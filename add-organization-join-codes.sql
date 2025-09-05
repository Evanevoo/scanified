-- Add join_code field to organizations table
-- This allows organizations to have unique codes for users to join without invites

-- Add the join_code column
ALTER TABLE organizations 
ADD COLUMN IF NOT EXISTS join_code TEXT UNIQUE;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_organizations_join_code ON organizations(join_code);

-- Generate join codes for existing organizations
-- Format: ORG_NAME-YEAR (e.g., WELDCOR-2024)
UPDATE organizations 
SET join_code = UPPER(
  REGEXP_REPLACE(
    REGEXP_REPLACE(name, '[^a-zA-Z0-9]', '', 'g'), 
    '(.{10}).*', 
    '\1'
  ) || '-' || EXTRACT(YEAR FROM NOW())::TEXT
)
WHERE join_code IS NULL;

-- Function to generate unique join code for new organizations
CREATE OR REPLACE FUNCTION generate_organization_join_code()
RETURNS TRIGGER AS $$
DECLARE
    base_code TEXT;
    final_code TEXT;
    counter INTEGER := 1;
BEGIN
    -- Generate base code from organization name
    base_code := UPPER(
        REGEXP_REPLACE(
            REGEXP_REPLACE(NEW.name, '[^a-zA-Z0-9]', '', 'g'), 
            '(.{10}).*', 
            '\1'
        ) || '-' || EXTRACT(YEAR FROM NOW())::TEXT
    );
    
    final_code := base_code;
    
    -- Ensure uniqueness
    WHILE EXISTS (SELECT 1 FROM organizations WHERE join_code = final_code) LOOP
        final_code := base_code || '-' || counter::TEXT;
        counter := counter + 1;
    END LOOP;
    
    NEW.join_code := final_code;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-generate join codes for new organizations
DROP TRIGGER IF EXISTS trigger_generate_join_code ON organizations;
CREATE TRIGGER trigger_generate_join_code
    BEFORE INSERT ON organizations
    FOR EACH ROW
    WHEN (NEW.join_code IS NULL)
    EXECUTE FUNCTION generate_organization_join_code();

-- Create function to regenerate join code (for admin use)
CREATE OR REPLACE FUNCTION regenerate_join_code(org_id UUID)
RETURNS TEXT AS $$
DECLARE
    org_name TEXT;
    base_code TEXT;
    final_code TEXT;
    counter INTEGER := 1;
BEGIN
    -- Get organization name
    SELECT name INTO org_name FROM organizations WHERE id = org_id;
    
    IF org_name IS NULL THEN
        RAISE EXCEPTION 'Organization not found';
    END IF;
    
    -- Generate base code
    base_code := UPPER(
        REGEXP_REPLACE(
            REGEXP_REPLACE(org_name, '[^a-zA-Z0-9]', '', 'g'), 
            '(.{10}).*', 
            '\1'
        ) || '-' || EXTRACT(YEAR FROM NOW())::TEXT
    );
    
    final_code := base_code;
    
    -- Ensure uniqueness
    WHILE EXISTS (SELECT 1 FROM organizations WHERE join_code = final_code AND id != org_id) LOOP
        final_code := base_code || '-' || counter::TEXT;
        counter := counter + 1;
    END LOOP;
    
    -- Update organization
    UPDATE organizations SET join_code = final_code WHERE id = org_id;
    
    RETURN final_code;
END;
$$ LANGUAGE plpgsql;

-- Add some example join codes for testing
-- Note: These will be overwritten by the UPDATE above, but this shows the format

COMMENT ON COLUMN organizations.join_code IS 'Unique code for users to join organization without invitation. Format: ORGNAME-YEAR or ORGNAME-YEAR-N for duplicates';
COMMENT ON FUNCTION generate_organization_join_code() IS 'Auto-generates unique join codes for new organizations';
COMMENT ON FUNCTION regenerate_join_code(UUID) IS 'Regenerates join code for existing organization';

-- Verify the changes
SELECT name, join_code, slug FROM organizations ORDER BY name;
