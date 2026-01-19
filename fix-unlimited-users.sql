-- Fix: Set unlimited users for organizations that should have unlimited users
-- Run this in Supabase SQL Editor

-- Option 1: Set unlimited for ALL organizations (use with caution)
-- UPDATE organizations SET max_users = -1 WHERE max_users IS NOT NULL;

-- Option 2: Set unlimited for specific organization by ID
-- UPDATE organizations SET max_users = -1 WHERE id = 'YOUR_ORGANIZATION_ID_HERE';

-- Option 3: Set unlimited for organizations with specific subscription plan
-- UPDATE organizations 
-- SET max_users = -1 
-- WHERE subscription_plan = 'enterprise' OR subscription_plan = 'Enterprise';

-- Option 4: Set unlimited for organizations that have more users than their limit
-- This fixes organizations that are incorrectly limited
UPDATE organizations 
SET max_users = -1 
WHERE id IN (
  SELECT o.id 
  FROM organizations o
  JOIN (
    SELECT organization_id, COUNT(*) as user_count
    FROM profiles
    WHERE organization_id IS NOT NULL
      AND is_active IS NOT FALSE
      AND deleted_at IS NULL
    GROUP BY organization_id
  ) u ON o.id = u.organization_id
  WHERE o.max_users IS NOT NULL 
    AND o.max_users > 0 
    AND o.max_users < 999999
    AND u.user_count > o.max_users
);

-- Option 5: Set unlimited for specific organization by name (if multiple orgs with same name)
-- UPDATE organizations 
-- SET max_users = -1 
-- WHERE name = 'WeldCor Supplies SK' 
--   AND max_users != -1
--   AND id IN (
--     SELECT organization_id 
--     FROM profiles 
--     WHERE organization_id IS NOT NULL 
--     GROUP BY organization_id 
--     HAVING COUNT(*) > 5
--   );

-- Verify the update - shows organizations with their user counts
SELECT 
  id, 
  name, 
  max_users, 
  subscription_plan,
  (SELECT COUNT(*) FROM profiles 
   WHERE organization_id = organizations.id 
     AND is_active IS NOT FALSE 
     AND deleted_at IS NULL) as current_users,
  CASE 
    WHEN max_users = -1 THEN 'Unlimited'
    WHEN max_users IS NULL THEN 'NULL (treated as unlimited)'
    ELSE max_users::text
  END as limit_display
FROM organizations
ORDER BY name, id;

