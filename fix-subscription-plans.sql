-- Fix subscription plans to ensure they match their descriptions
-- This script normalizes unlimited values and ensures plan limits are correct

-- Step 1: Normalize unlimited values (999999, null, or very large numbers -> -1)
UPDATE subscription_plans
SET 
  max_users = CASE 
    WHEN max_users IS NULL OR max_users >= 999999 THEN -1 
    ELSE max_users 
  END,
  max_cylinders = CASE 
    WHEN max_cylinders IS NULL OR max_cylinders >= 999999 THEN -1 
    ELSE max_cylinders 
  END,
  max_customers = CASE 
    WHEN max_customers IS NULL OR max_customers >= 999999 THEN -1 
    ELSE max_customers 
  END
WHERE 
  max_users IS NULL OR max_users >= 999999 OR
  max_cylinders IS NULL OR max_cylinders >= 999999 OR
  max_customers IS NULL OR max_customers >= 999999;

-- Step 2: Verify and display current plan values
SELECT 
  id,
  name,
  description,
  price,
  max_users,
  max_cylinders,
  max_customers,
  CASE 
    WHEN max_users = -1 THEN 'Unlimited'
    ELSE max_users::text
  END as users_display,
  CASE 
    WHEN max_cylinders = -1 THEN 'Unlimited'
    ELSE max_cylinders::text
  END as cylinders_display,
  CASE 
    WHEN max_customers = -1 THEN 'Unlimited'
    ELSE max_customers::text
  END as customers_display,
  is_active
FROM subscription_plans
ORDER BY price ASC, name;

-- Step 3: Common plan fixes (uncomment and modify as needed)
-- Fix Basic plan: 5 users, 100 customers, 1000 cylinders
-- UPDATE subscription_plans 
-- SET max_users = 5, max_customers = 100, max_cylinders = 1000
-- WHERE LOWER(name) LIKE '%basic%' AND is_active = true;

-- Fix Professional plan: 15 users, 500 customers, 5000 cylinders  
-- UPDATE subscription_plans 
-- SET max_users = 15, max_customers = 500, max_cylinders = 5000
-- WHERE LOWER(name) LIKE '%professional%' OR LOWER(name) LIKE '%pro%' AND is_active = true;

-- Fix Enterprise plan: Unlimited everything
-- UPDATE subscription_plans 
-- SET max_users = -1, max_customers = -1, max_cylinders = -1
-- WHERE LOWER(name) LIKE '%enterprise%' AND is_active = true;

-- Step 4: Update organizations that have plans with incorrect limits
-- This ensures organizations get the correct limits when their plan is applied
UPDATE organizations o
SET 
  max_users = CASE 
    WHEN sp.max_users = -1 THEN -1
    ELSE sp.max_users
  END,
  max_cylinders = CASE 
    WHEN sp.max_cylinders = -1 THEN -1
    ELSE sp.max_cylinders
  END,
  max_customers = CASE 
    WHEN sp.max_customers = -1 THEN -1
    ELSE sp.max_customers
  END
FROM subscription_plans sp
WHERE o.subscription_plan_id = sp.id
  AND (
    o.max_users != COALESCE(sp.max_users, -1) OR
    o.max_cylinders != COALESCE(sp.max_cylinders, -1) OR
    o.max_customers != COALESCE(sp.max_customers, -1)
  );

-- Step 5: Verify organizations are correctly updated
SELECT 
  o.id,
  o.name as org_name,
  sp.name as plan_name,
  o.max_users as org_max_users,
  sp.max_users as plan_max_users,
  o.max_cylinders as org_max_cylinders,
  sp.max_cylinders as plan_max_cylinders,
  o.max_customers as org_max_customers,
  sp.max_customers as plan_max_customers,
  CASE 
    WHEN o.max_users = sp.max_users AND 
         o.max_cylinders = sp.max_cylinders AND 
         o.max_customers = sp.max_customers THEN '✅ Match'
    ELSE '⚠️ Mismatch'
  END as status
FROM organizations o
LEFT JOIN subscription_plans sp ON o.subscription_plan_id = sp.id
WHERE o.deleted_at IS NULL
ORDER BY status DESC, o.name;

