-- Find organizations that currently have more users than their max_users limit
-- This identifies organizations that need to be set to unlimited

SELECT 
  o.id,
  o.name,
  o.max_users,
  o.subscription_plan,
  COUNT(p.id) as current_users,
  CASE 
    WHEN COUNT(p.id) > o.max_users THEN '⚠️ NEEDS FIX - Exceeds limit'
    WHEN o.max_users = -1 THEN '✅ Unlimited'
    WHEN o.max_users IS NULL THEN '✅ NULL (unlimited)'
    WHEN COUNT(p.id) <= o.max_users THEN '✅ OK'
    ELSE '❓ Unknown'
  END as status,
  CASE 
    WHEN COUNT(p.id) > o.max_users THEN COUNT(p.id) - o.max_users
    ELSE 0
  END as users_over_limit
FROM organizations o
LEFT JOIN profiles p ON p.organization_id = o.id 
  AND p.is_active IS NOT FALSE 
  AND p.deleted_at IS NULL
WHERE o.deleted_at IS NULL
GROUP BY o.id, o.name, o.max_users, o.subscription_plan
HAVING COUNT(p.id) > COALESCE(o.max_users, 999999) 
   OR (o.max_users IS NOT NULL AND o.max_users > 0 AND o.max_users < 999999 AND COUNT(p.id) > o.max_users)
ORDER BY users_over_limit DESC, o.name;

-- If you want to see ALL organizations (not just ones needing fix):
-- SELECT 
--   o.id,
--   o.name,
--   o.max_users,
--   o.subscription_plan,
--   COUNT(p.id) as current_users,
--   CASE 
--     WHEN o.max_users = -1 THEN 'Unlimited'
--     WHEN o.max_users IS NULL THEN 'NULL (unlimited)'
--     WHEN COUNT(p.id) > o.max_users THEN '⚠️ Exceeds limit'
--     ELSE 'OK'
--   END as status
-- FROM organizations o
-- LEFT JOIN profiles p ON p.organization_id = o.id 
--   AND p.is_active IS NOT FALSE 
--   AND p.deleted_at IS NULL
-- WHERE o.deleted_at IS NULL
-- GROUP BY o.id, o.name, o.max_users, o.subscription_plan
-- ORDER BY o.name, o.id;

