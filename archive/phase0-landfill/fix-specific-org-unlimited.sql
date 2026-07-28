-- Fix specific organization to have unlimited users
-- Replace 'YOUR_ORGANIZATION_ID' with the actual organization ID

-- First, find the organization that needs fixing (has more users than limit)
SELECT 
  o.id,
  o.name,
  o.max_users,
  o.subscription_plan,
  COUNT(p.id) as current_users,
  CASE 
    WHEN COUNT(p.id) > o.max_users THEN 'NEEDS FIX'
    ELSE 'OK'
  END as status
FROM organizations o
LEFT JOIN profiles p ON p.organization_id = o.id 
  AND p.is_active IS NOT FALSE 
  AND p.deleted_at IS NULL
WHERE o.max_users IS NOT NULL 
  AND o.max_users > 0 
  AND o.max_users < 999999
GROUP BY o.id, o.name, o.max_users, o.subscription_plan
HAVING COUNT(p.id) > o.max_users
ORDER BY o.name;

-- Then fix the specific organization (uncomment and replace ID):
-- UPDATE organizations 
-- SET max_users = -1 
-- WHERE id = 'YOUR_ORGANIZATION_ID_HERE';

-- Or fix all organizations with the same name that have this issue:
-- UPDATE organizations 
-- SET max_users = -1 
-- WHERE name = 'WeldCor Supplies SK'
--   AND id IN (
--     SELECT o.id 
--     FROM organizations o
--     JOIN (
--       SELECT organization_id, COUNT(*) as user_count
--       FROM profiles
--       WHERE organization_id IS NOT NULL
--         AND is_active IS NOT FALSE
--         AND deleted_at IS NULL
--       GROUP BY organization_id
--     ) u ON o.id = u.organization_id
--     WHERE o.max_users IS NOT NULL 
--       AND o.max_users > 0 
--       AND o.max_users < 999999
--       AND u.user_count > o.max_users
--   );

