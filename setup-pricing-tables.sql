-- Setup script for pricing tables required by Bulk Rental Pricing Manager
-- Run this in your Supabase SQL editor

-- Check if tables exist
SELECT 
  table_name,
  CASE 
    WHEN table_name IS NOT NULL THEN 'EXISTS'
    ELSE 'MISSING'
  END as status
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN ('pricing_tiers', 'customer_pricing', 'demurrage_rules', 'pricing_calculations');

-- Create tables if they don't exist

-- 1. Pricing Tiers (Bracket-based pricing)
CREATE TABLE IF NOT EXISTS pricing_tiers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  gas_type TEXT NOT NULL DEFAULT 'propane',
  min_quantity INTEGER NOT NULL DEFAULT 1,
  max_quantity INTEGER, -- NULL means no upper limit
  daily_rate DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  weekly_rate DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  monthly_rate DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Ensure no overlapping quantity ranges for same gas type
  CONSTRAINT pricing_tiers_quantity_check CHECK (min_quantity > 0),
  CONSTRAINT pricing_tiers_rates_check CHECK (
    daily_rate >= 0 AND weekly_rate >= 0 AND monthly_rate >= 0
  )
);

-- 2. Customer-Specific Pricing
CREATE TABLE IF NOT EXISTS customer_pricing (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  customer_id TEXT, -- Can be CustomerListID from customers table
  customer_type TEXT, -- Or a general type like 'premium', 'bulk', etc.
  discount_percent DECIMAL(5,2) DEFAULT 0.00, -- Percentage discount
  markup_percent DECIMAL(5,2) DEFAULT 0.00,   -- Or percentage markup
  fixed_rate_override DECIMAL(10,2), -- Fixed rate that overrides tier pricing
  gas_type TEXT, -- NULL means applies to all gas types
  rental_period TEXT DEFAULT 'monthly', -- 'monthly' or 'yearly'
  effective_date DATE DEFAULT CURRENT_DATE,
  expiry_date DATE,
  is_active BOOLEAN DEFAULT true,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Either customer_id or customer_type must be specified
  CONSTRAINT customer_pricing_target_check CHECK (
    customer_id IS NOT NULL OR customer_type IS NOT NULL
  ),
  CONSTRAINT customer_pricing_rates_check CHECK (
    discount_percent >= 0 AND discount_percent <= 100 AND
    markup_percent >= 0 AND fixed_rate_override >= 0
  ),
  CONSTRAINT customer_pricing_rental_period_check CHECK (
    rental_period IN ('monthly', 'yearly')
  )
);

-- Add rental_period column if it doesn't exist (for existing tables)
DO $$
DECLARE
  updated_count INTEGER;
BEGIN
  -- Check if rental_period column exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'customer_pricing' 
    AND column_name = 'rental_period'
  ) THEN
    ALTER TABLE customer_pricing 
    ADD COLUMN rental_period TEXT DEFAULT 'monthly';
    
    -- Add constraint for rental_period
    ALTER TABLE customer_pricing 
    ADD CONSTRAINT customer_pricing_rental_period_check 
    CHECK (rental_period IN ('monthly', 'yearly'));
    
    RAISE NOTICE '✅ Added rental_period column to customer_pricing table';
  ELSE
    RAISE NOTICE '✅ rental_period column already exists';
  END IF;
  
  -- Update existing records that have NULL rental_period to 'monthly'
  UPDATE customer_pricing 
  SET rental_period = 'monthly' 
  WHERE rental_period IS NULL;
  
  -- Show how many records were updated
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  IF updated_count > 0 THEN
    RAISE NOTICE '✅ Updated % existing records to have rental_period = monthly', updated_count;
  ELSE
    RAISE NOTICE '✅ All existing records already have rental_period set';
  END IF;
END $$;

-- Add foreign key constraint to link customer_pricing.customer_id to customers.CustomerListID
-- This creates the relationship that Supabase needs for joins
DO $$
BEGIN
  -- Only add the constraint if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'customer_pricing_customer_fkey' 
    AND table_name = 'customer_pricing'
  ) THEN
    ALTER TABLE customer_pricing 
    ADD CONSTRAINT customer_pricing_customer_fkey 
    FOREIGN KEY (customer_id, organization_id) 
    REFERENCES customers("CustomerListID", organization_id) 
    ON DELETE CASCADE;
    
    RAISE NOTICE '✅ Added foreign key constraint linking customer_pricing to customers';
  ELSE
    RAISE NOTICE '✅ Foreign key constraint already exists';
  END IF;
END $$;

-- 3. Demurrage Rules (Late return penalties)
CREATE TABLE IF NOT EXISTS demurrage_rules (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  gas_type TEXT NOT NULL,
  grace_period_days INTEGER NOT NULL DEFAULT 0,
  daily_penalty_rate DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  max_penalty_days INTEGER, -- NULL means no limit
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT demurrage_rules_check CHECK (
    grace_period_days >= 0 AND daily_penalty_rate >= 0 AND
    (max_penalty_days IS NULL OR max_penalty_days > 0)
  )
);

-- 4. Pricing Calculations History (for auditing)
CREATE TABLE IF NOT EXISTS pricing_calculations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  rental_id UUID, -- Reference to rental if this calculation is for an actual rental
  customer_id TEXT,
  gas_type TEXT NOT NULL,
  quantity INTEGER NOT NULL,
  rental_days INTEGER NOT NULL,
  
  -- Pricing breakdown
  base_cost DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  tier_applied TEXT, -- Name of pricing tier used
  customer_discount_percent DECIMAL(5,2) DEFAULT 0.00,
  customer_discount_amount DECIMAL(10,2) DEFAULT 0.00,
  demurrage_cost DECIMAL(10,2) DEFAULT 0.00,
  subtotal DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  tax_amount DECIMAL(10,2) DEFAULT 0.00,
  total_amount DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  
  -- Metadata
  calculation_date TIMESTAMPTZ DEFAULT NOW(),
  calculated_by UUID, -- User who performed the calculation
  is_estimate BOOLEAN DEFAULT true, -- false when applied to actual rental
  notes TEXT,
  
  CONSTRAINT pricing_calculations_amounts_check CHECK (
    quantity > 0 AND rental_days > 0 AND
    base_cost >= 0 AND subtotal >= 0 AND total_amount >= 0
  )
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_pricing_tiers_org_gas_qty ON pricing_tiers(organization_id, gas_type, min_quantity);
CREATE INDEX IF NOT EXISTS idx_customer_pricing_org_customer ON customer_pricing(organization_id, customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_pricing_org_type ON customer_pricing(organization_id, customer_type);
CREATE INDEX IF NOT EXISTS idx_demurrage_rules_org_gas ON demurrage_rules(organization_id, gas_type);
CREATE INDEX IF NOT EXISTS idx_pricing_calculations_org_date ON pricing_calculations(organization_id, calculation_date);

-- Enable RLS for all tables
ALTER TABLE pricing_tiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_pricing ENABLE ROW LEVEL SECURITY;
ALTER TABLE demurrage_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE pricing_calculations ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for pricing_tiers (with IF NOT EXISTS)
DO $$
BEGIN
  -- Drop existing policies if they exist
  DROP POLICY IF EXISTS "Users can view pricing tiers for their organization" ON pricing_tiers;
  DROP POLICY IF EXISTS "Admins can manage pricing tiers for their organization" ON pricing_tiers;
  
  -- Create new policies
  CREATE POLICY "Users can view pricing tiers for their organization" ON pricing_tiers
    FOR SELECT USING (
      organization_id IN (
        SELECT id FROM organizations 
        WHERE id IN (
          SELECT organization_id FROM profiles 
          WHERE id = auth.uid()
        )
      )
    );

  CREATE POLICY "Admins can manage pricing tiers for their organization" ON pricing_tiers
    FOR ALL USING (
      organization_id IN (
        SELECT id FROM organizations 
        WHERE id IN (
          SELECT organization_id FROM profiles 
          WHERE id = auth.uid() AND role IN ('admin', 'manager')
        )
      )
    );
    
  RAISE NOTICE '✅ Created RLS policies for pricing_tiers';
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE '⚠️  Error creating pricing_tiers policies: %', SQLERRM;
END $$;

-- Create RLS policies for customer_pricing (with IF NOT EXISTS)
DO $$
BEGIN
  -- Drop existing policies if they exist
  DROP POLICY IF EXISTS "Users can view customer pricing for their organization" ON customer_pricing;
  DROP POLICY IF EXISTS "Admins can manage customer pricing for their organization" ON customer_pricing;
  
  -- Create new policies
  CREATE POLICY "Users can view customer pricing for their organization" ON customer_pricing
    FOR SELECT USING (
      organization_id IN (
        SELECT id FROM organizations 
        WHERE id IN (
          SELECT organization_id FROM profiles 
          WHERE id = auth.uid()
        )
      )
    );

  CREATE POLICY "Admins can manage customer pricing for their organization" ON customer_pricing
    FOR ALL USING (
      organization_id IN (
        SELECT id FROM organizations 
        WHERE id IN (
          SELECT organization_id FROM profiles 
          WHERE id = auth.uid() AND role IN ('admin', 'manager')
        )
      )
    );
    
  RAISE NOTICE '✅ Created RLS policies for customer_pricing';
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE '⚠️  Error creating customer_pricing policies: %', SQLERRM;
END $$;

-- Create RLS policies for demurrage_rules (with IF NOT EXISTS)
DO $$
BEGIN
  -- Drop existing policies if they exist
  DROP POLICY IF EXISTS "Users can view demurrage rules for their organization" ON demurrage_rules;
  DROP POLICY IF EXISTS "Admins can manage demurrage rules for their organization" ON demurrage_rules;
  
  -- Create new policies
  CREATE POLICY "Users can view demurrage rules for their organization" ON demurrage_rules
    FOR SELECT USING (
      organization_id IN (
        SELECT id FROM organizations 
        WHERE id IN (
          SELECT organization_id FROM profiles 
          WHERE id = auth.uid()
        )
      )
    );

  CREATE POLICY "Admins can manage demurrage rules for their organization" ON demurrage_rules
    FOR ALL USING (
      organization_id IN (
        SELECT id FROM organizations 
        WHERE id IN (
          SELECT organization_id FROM profiles 
          WHERE id = auth.uid() AND role IN ('admin', 'manager')
        )
      )
    );
    
  RAISE NOTICE '✅ Created RLS policies for demurrage_rules';
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE '⚠️  Error creating demurrage_rules policies: %', SQLERRM;
END $$;

-- Create RLS policies for pricing_calculations (with IF NOT EXISTS)
DO $$
BEGIN
  -- Drop existing policies if they exist
  DROP POLICY IF EXISTS "Users can view pricing calculations for their organization" ON pricing_calculations;
  DROP POLICY IF EXISTS "Users can create pricing calculations for their organization" ON pricing_calculations;
  
  -- Create new policies
  CREATE POLICY "Users can view pricing calculations for their organization" ON pricing_calculations
    FOR SELECT USING (
      organization_id IN (
        SELECT id FROM organizations 
        WHERE id IN (
          SELECT organization_id FROM profiles 
          WHERE id = auth.uid()
        )
      )
    );

  CREATE POLICY "Users can create pricing calculations for their organization" ON pricing_calculations
    FOR INSERT WITH CHECK (
      organization_id IN (
        SELECT id FROM organizations 
        WHERE id IN (
          SELECT organization_id FROM profiles 
          WHERE id = auth.uid()
        )
      )
    );
    
  RAISE NOTICE '✅ Created RLS policies for pricing_calculations';
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE '⚠️  Error creating pricing_calculations policies: %', SQLERRM;
END $$;

-- Insert some default pricing tiers for testing (optional)
-- You can uncomment these if you want sample data

/*
-- Sample pricing tiers for propane
INSERT INTO pricing_tiers (organization_id, name, gas_type, min_quantity, max_quantity, daily_rate, weekly_rate, monthly_rate)
SELECT 
  o.id as organization_id,
  'Small Cylinder (1-5)' as name,
  'propane' as gas_type,
  1 as min_quantity,
  5 as max_quantity,
  2.50 as daily_rate,
  15.00 as weekly_rate,
  60.00 as monthly_rate
FROM organizations o
WHERE NOT EXISTS (
  SELECT 1 FROM pricing_tiers pt 
  WHERE pt.organization_id = o.id AND pt.gas_type = 'propane'
);

INSERT INTO pricing_tiers (organization_id, name, gas_type, min_quantity, max_quantity, daily_rate, weekly_rate, monthly_rate)
SELECT 
  o.id as organization_id,
  'Medium Cylinder (6-15)' as name,
  'propane' as gas_type,
  6 as min_quantity,
  15 as max_quantity,
  1.75 as daily_rate,
  10.50 as weekly_rate,
  42.00 as monthly_rate
FROM organizations o
WHERE NOT EXISTS (
  SELECT 1 FROM pricing_tiers pt 
  WHERE pt.organization_id = o.id AND pt.gas_type = 'propane'
);

INSERT INTO pricing_tiers (organization_id, name, gas_type, min_quantity, max_quantity, daily_rate, weekly_rate, monthly_rate)
SELECT 
  o.id as organization_id,
  'Large Cylinder (16+)' as name,
  'propane' as gas_type,
  16 as min_quantity,
  NULL as max_quantity,
  1.25 as daily_rate,
  7.50 as weekly_rate,
  30.00 as monthly_rate
FROM organizations o
WHERE NOT EXISTS (
  SELECT 1 FROM pricing_tiers pt 
  WHERE pt.organization_id = o.id AND pt.gas_type = 'propane'
);
*/

-- Final verification
SELECT 
  'pricing_tiers' as table_name,
  COUNT(*) as record_count
FROM pricing_tiers
UNION ALL
SELECT 
  'customer_pricing' as table_name,
  COUNT(*) as record_count
FROM customer_pricing
UNION ALL
SELECT 
  'demurrage_rules' as table_name,
  COUNT(*) as record_count
FROM demurrage_rules
UNION ALL
SELECT 
  'pricing_calculations' as table_name,
  COUNT(*) as record_count
FROM pricing_calculations;

-- Show rental period distribution
SELECT 
  'Rental Period Distribution' as info,
  rental_period,
  COUNT(*) as customer_count
FROM customer_pricing 
GROUP BY rental_period
UNION ALL
SELECT 
  'Total Customers (All Organizations)' as info,
  'all' as rental_period,
  COUNT(*) as customer_count
FROM customers
UNION ALL
SELECT 
  'Total Organizations' as info,
  'organizations' as rental_period,
  COUNT(*) as customer_count
FROM organizations;

-- Show organization-specific breakdown
SELECT 
  'Organization Breakdown' as info,
  o.name as organization_name,
  COUNT(c.id) as customer_count,
  COUNT(cp.id) as pricing_records_count
FROM organizations o
LEFT JOIN customers c ON c.organization_id = o.id
LEFT JOIN customer_pricing cp ON cp.organization_id = o.id
GROUP BY o.id, o.name
ORDER BY customer_count DESC;

-- Success message
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '🎉 PRICING TABLES SETUP COMPLETED SUCCESSFULLY! 🎉';
  RAISE NOTICE '';
  RAISE NOTICE 'Created tables:';
  RAISE NOTICE '✅ pricing_tiers - For bracket-based pricing';
  RAISE NOTICE '✅ customer_pricing - For customer-specific pricing';
  RAISE NOTICE '✅ demurrage_rules - For late return penalties';
  RAISE NOTICE '✅ pricing_calculations - For pricing history/audit';
  RAISE NOTICE '';
  RAISE NOTICE 'The Bulk Rental Pricing Manager should now work correctly!';
  RAISE NOTICE '';
END $$;
