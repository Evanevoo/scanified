-- Add app_name field to organizations table and populate it
-- This ensures all organizations have a custom app name for branding

-- Add app_name column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'organizations' AND column_name = 'app_name') THEN
        ALTER TABLE organizations ADD COLUMN app_name TEXT;
    END IF;
END $$;

-- Update existing organizations to use their name as app_name if app_name is NULL
UPDATE organizations 
SET app_name = COALESCE(app_name, name || ' Scanner', 'Scanified')
WHERE app_name IS NULL;

-- Add comment for clarity
COMMENT ON COLUMN organizations.app_name IS 'Custom app name for organization branding (defaults to "Scanified")';

-- Ensure all organizations have an app_name
UPDATE organizations 
SET app_name = COALESCE(app_name, 'Scanified')
WHERE app_name = '';

-- Show the result
SELECT id, name, app_name, slug FROM organizations ORDER BY name;
