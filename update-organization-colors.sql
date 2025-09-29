-- Update default organization colors to match Scanified branding
-- Run this in your Supabase SQL editor to update existing organizations

-- Update all organizations without custom colors to use Scanified colors
UPDATE organizations 
SET 
  primary_color = '#40B5AD',
  secondary_color = '#48C9B0'
WHERE 
  primary_color IS NULL 
  OR primary_color = '#2563eb' 
  OR primary_color = '';

-- Optional: Update ALL organizations to Scanified colors (uncomment if you want to override all custom colors)
-- UPDATE organizations 
-- SET 
--   primary_color = '#40B5AD',
--   secondary_color = '#48C9B0';

-- Verify the update
SELECT 
  id, 
  name, 
  primary_color, 
  secondary_color 
FROM organizations 
ORDER BY created_at DESC;
