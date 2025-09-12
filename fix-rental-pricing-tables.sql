-- Quick check and creation script for rental pricing tables
-- Run this in your Supabase SQL editor to ensure tables exist

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

-- Create tables if they don't exist (run this if any are missing)

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
  )
);

-- 3. Demurrage Rules (Late return penalties)
CREATE TABLE IF NOT EXISTS demurrage_rules (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  gas_type TEXT NOT NULL DEFAULT 'propane',
  grace_period_days INTEGER NOT NULL DEFAULT 30,
  daily_penalty DECIMAL(10,2) NOT NULL DEFAULT 5.00,
  max_penalty DECIMAL(10,2), -- Maximum total penalty (NULL = no limit)
  penalty_calculation TEXT DEFAULT 'daily', -- 'daily', 'weekly', 'compound'
  applies_to_customer_type TEXT, -- NULL means applies to all customers
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT demurrage_rules_check CHECK (
    grace_period_days >= 0 AND 
    daily_penalty >= 0 AND 
    (max_penalty IS NULL OR max_penalty >= daily_penalty)
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

-- RLS Policies for pricing_tiers
DROP POLICY IF EXISTS "Users can view pricing tiers for their organization" ON pricing_tiers;
CREATE POLICY "Users can view pricing tiers for their organization" 
ON pricing_tiers FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.organization_id::text = pricing_tiers.organization_id::text
  )
);

DROP POLICY IF EXISTS "Admins can manage pricing tiers" ON pricing_tiers;
CREATE POLICY "Admins can manage pricing tiers" 
ON pricing_tiers FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.organization_id::text = pricing_tiers.organization_id::text
    AND profiles.role IN ('admin', 'owner', 'manager')
  )
);

-- RLS Policies for customer_pricing
DROP POLICY IF EXISTS "Users can view customer pricing for their organization" ON customer_pricing;
CREATE POLICY "Users can view customer pricing for their organization" 
ON customer_pricing FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.organization_id::text = customer_pricing.organization_id::text
  )
);

DROP POLICY IF EXISTS "Admins can manage customer pricing" ON customer_pricing;
CREATE POLICY "Admins can manage customer pricing" 
ON customer_pricing FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.organization_id::text = customer_pricing.organization_id::text
    AND profiles.role IN ('admin', 'owner', 'manager')
  )
);

-- RLS Policies for demurrage_rules
DROP POLICY IF EXISTS "Users can view demurrage rules for their organization" ON demurrage_rules;
CREATE POLICY "Users can view demurrage rules for their organization" 
ON demurrage_rules FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.organization_id::text = demurrage_rules.organization_id::text
  )
);

DROP POLICY IF EXISTS "Admins can manage demurrage rules" ON demurrage_rules;
CREATE POLICY "Admins can manage demurrage rules" 
ON demurrage_rules FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.organization_id::text = demurrage_rules.organization_id::text
    AND profiles.role IN ('admin', 'owner', 'manager')
  )
);

-- RLS Policies for pricing_calculations
DROP POLICY IF EXISTS "Users can view pricing calculations for their organization" ON pricing_calculations;
CREATE POLICY "Users can view pricing calculations for their organization" 
ON pricing_calculations FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.organization_id::text = pricing_calculations.organization_id::text
  )
);

DROP POLICY IF EXISTS "Users can create pricing calculations for their organization" ON pricing_calculations;
CREATE POLICY "Users can create pricing calculations for their organization" 
ON pricing_calculations FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.organization_id::text = pricing_calculations.organization_id::text
  )
);

-- Insert some sample data for testing (optional)
INSERT INTO pricing_tiers (organization_id, name, gas_type, min_quantity, daily_rate, weekly_rate, monthly_rate)
SELECT 
  o.id,
  'Standard Tier',
  'propane',
  1,
  2.50,
  15.00,
  60.00
FROM organizations o
WHERE NOT EXISTS (
  SELECT 1 FROM pricing_tiers WHERE organization_id = o.id
)
LIMIT 1;
