-- Create Subscription Plans Table
CREATE TABLE subscription_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    price NUMERIC(10, 2) NOT NULL,
    price_interval TEXT NOT NULL, -- 'month' or 'year'
    features JSONB NOT NULL,
    max_cylinders INT NOT NULL,
    max_users INT NOT NULL,
    stripe_price_id TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    is_most_popular BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS Policies for subscription_plans
ALTER TABLE subscription_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access"
ON subscription_plans
FOR SELECT
USING (is_active = TRUE);

CREATE POLICY "Allow admin full access"
ON subscription_plans
FOR ALL
USING (auth.role() = 'service_role' OR (SELECT role FROM profiles WHERE id = auth.uid()) = 'owner');

-- Seed initial plans
INSERT INTO subscription_plans (name, price, price_interval, features, max_cylinders, max_users, stripe_price_id, is_most_popular)
VALUES 
('Starter', 99.00, 'month', '["Up to 1,000 cylinders", "5 users", "Basic reporting", "Mobile app access", "Email support"]', 1000, 5, 'price_starter_monthly', FALSE),
('Professional', 299.00, 'month', '["Up to 10,000 cylinders", "25 users", "Advanced analytics", "Delivery management", "Priority support", "Custom integrations"]', 10000, 25, 'price_professional_monthly', TRUE),
('Enterprise', 0.00, 'custom', '["Unlimited cylinders", "Unlimited users", "Custom development", "Dedicated support", "White-label options", "API access"]', -1, -1, 'price_enterprise_custom', FALSE);

-- Create Discounts Table
CREATE TABLE discounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    type TEXT NOT NULL, -- 'percentage' or 'fixed_amount'
    value NUMERIC(10, 2) NOT NULL,
    start_date TIMESTAMPTZ,
    end_date TIMESTAMPTZ,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS Policies for discounts
ALTER TABLE discounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow admin full access"
ON discounts
FOR ALL
USING (auth.role() = 'service_role' OR (SELECT role FROM profiles WHERE id = auth.uid()) = 'owner');

CREATE POLICY "Allow organization members to read their own discounts"
ON discounts
FOR SELECT
USING (organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid()));

-- Add subscription_plan_id to organizations table
ALTER TABLE organizations
ADD COLUMN subscription_plan_id UUID REFERENCES subscription_plans(id);

-- Add discount_id to organizations table
ALTER TABLE organizations
ADD COLUMN active_discount_id UUID REFERENCES discounts(id); 