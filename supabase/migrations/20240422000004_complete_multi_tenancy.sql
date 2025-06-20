-- Complete Multi-Tenancy Setup Migration
-- This migration ensures all data is properly isolated by organization

-- 1. Create organizations table if it doesn't exist
CREATE TABLE IF NOT EXISTS organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    email TEXT,
    phone TEXT,
    address TEXT,
    city TEXT,
    state TEXT,
    postal_code TEXT,
    country TEXT DEFAULT 'US',
    subscription_plan_id UUID,
    active_discount_id UUID,
    stripe_customer_id TEXT,
    stripe_subscription_id TEXT,
    subscription_status TEXT DEFAULT 'trial',
    trial_ends_at TIMESTAMPTZ,
    max_users INT DEFAULT 5,
    max_customers INT DEFAULT 100,
    max_cylinders INT DEFAULT 1000,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 1.5. Add missing columns to existing organizations table
DO $$
DECLARE
    column_exists BOOLEAN;
BEGIN
    -- Add trial_ends_at if it doesn't exist
    SELECT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_name = 'organizations' AND column_name = 'trial_ends_at'
    ) INTO column_exists;
    
    IF NOT column_exists THEN
        ALTER TABLE organizations ADD COLUMN trial_ends_at TIMESTAMPTZ;
    END IF;
    
    -- Add subscription_status if it doesn't exist
    SELECT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_name = 'organizations' AND column_name = 'subscription_status'
    ) INTO column_exists;
    
    IF NOT column_exists THEN
        ALTER TABLE organizations ADD COLUMN subscription_status TEXT DEFAULT 'trial';
    END IF;
    
    -- Add max_users if it doesn't exist
    SELECT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_name = 'organizations' AND column_name = 'max_users'
    ) INTO column_exists;
    
    IF NOT column_exists THEN
        ALTER TABLE organizations ADD COLUMN max_users INT DEFAULT 5;
    END IF;
    
    -- Add max_customers if it doesn't exist
    SELECT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_name = 'organizations' AND column_name = 'max_customers'
    ) INTO column_exists;
    
    IF NOT column_exists THEN
        ALTER TABLE organizations ADD COLUMN max_customers INT DEFAULT 100;
    END IF;
    
    -- Add max_cylinders if it doesn't exist
    SELECT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_name = 'organizations' AND column_name = 'max_cylinders'
    ) INTO column_exists;
    
    IF NOT column_exists THEN
        ALTER TABLE organizations ADD COLUMN max_cylinders INT DEFAULT 1000;
    END IF;
    
    -- Add is_active if it doesn't exist
    SELECT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_name = 'organizations' AND column_name = 'is_active'
    ) INTO column_exists;
    
    IF NOT column_exists THEN
        ALTER TABLE organizations ADD COLUMN is_active BOOLEAN DEFAULT TRUE;
    END IF;
    
    -- Add stripe_customer_id if it doesn't exist
    SELECT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_name = 'organizations' AND column_name = 'stripe_customer_id'
    ) INTO column_exists;
    
    IF NOT column_exists THEN
        ALTER TABLE organizations ADD COLUMN stripe_customer_id TEXT;
    END IF;
    
    -- Add stripe_subscription_id if it doesn't exist
    SELECT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_name = 'organizations' AND column_name = 'stripe_subscription_id'
    ) INTO column_exists;
    
    IF NOT column_exists THEN
        ALTER TABLE organizations ADD COLUMN stripe_subscription_id TEXT;
    END IF;
END $$;

-- Add foreign key constraints if the referenced tables exist
DO $$
BEGIN
    -- Add subscription_plans foreign key if table exists
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'subscription_plans') THEN
        ALTER TABLE organizations ADD CONSTRAINT fk_organizations_subscription_plan 
        FOREIGN KEY (subscription_plan_id) REFERENCES subscription_plans(id);
    END IF;
    
    -- Add discounts foreign key if table exists
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'discounts') THEN
        ALTER TABLE organizations ADD CONSTRAINT fk_organizations_discount 
        FOREIGN KEY (active_discount_id) REFERENCES discounts(id);
    END IF;
END $$;

-- 2. Add organization_id to existing tables (only if they exist)
DO $$ 
DECLARE
    table_exists BOOLEAN;
    column_exists BOOLEAN;
BEGIN
    -- Add organization_id to profiles if table exists and column doesn't exist
    SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'profiles'
    ) INTO table_exists;
    
    IF table_exists THEN
        SELECT EXISTS (
            SELECT FROM information_schema.columns 
            WHERE table_name = 'profiles' AND column_name = 'organization_id'
        ) INTO column_exists;
        
        IF NOT column_exists THEN
            ALTER TABLE profiles ADD COLUMN organization_id UUID REFERENCES organizations(id);
        END IF;
    END IF;
    
    -- Add organization_id to customers if table exists and column doesn't exist
    SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'customers'
    ) INTO table_exists;
    
    IF table_exists THEN
        SELECT EXISTS (
            SELECT FROM information_schema.columns 
            WHERE table_name = 'customers' AND column_name = 'organization_id'
        ) INTO column_exists;
        
        IF NOT column_exists THEN
            ALTER TABLE customers ADD COLUMN organization_id UUID REFERENCES organizations(id);
        END IF;
    END IF;
    
    -- Add organization_id to bottles if table exists and column doesn't exist
    SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'bottles'
    ) INTO table_exists;
    
    IF table_exists THEN
        SELECT EXISTS (
            SELECT FROM information_schema.columns 
            WHERE table_name = 'bottles' AND column_name = 'organization_id'
        ) INTO column_exists;
        
        IF NOT column_exists THEN
            ALTER TABLE bottles ADD COLUMN organization_id UUID REFERENCES organizations(id);
        END IF;
    END IF;
    
    -- Add organization_id to rentals if table exists and column doesn't exist
    SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'rentals'
    ) INTO table_exists;
    
    IF table_exists THEN
        SELECT EXISTS (
            SELECT FROM information_schema.columns 
            WHERE table_name = 'rentals' AND column_name = 'organization_id'
        ) INTO column_exists;
        
        IF NOT column_exists THEN
            ALTER TABLE rentals ADD COLUMN organization_id UUID REFERENCES organizations(id);
        END IF;
    END IF;
    
    -- Add organization_id to invoices if table exists and column doesn't exist
    SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'invoices'
    ) INTO table_exists;
    
    IF table_exists THEN
        SELECT EXISTS (
            SELECT FROM information_schema.columns 
            WHERE table_name = 'invoices' AND column_name = 'organization_id'
        ) INTO column_exists;
        
        IF NOT column_exists THEN
            ALTER TABLE invoices ADD COLUMN organization_id UUID REFERENCES organizations(id);
        END IF;
    END IF;
    
    -- Add organization_id to cylinder_fills if table exists and column doesn't exist
    SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'cylinder_fills'
    ) INTO table_exists;
    
    IF table_exists THEN
        SELECT EXISTS (
            SELECT FROM information_schema.columns 
            WHERE table_name = 'cylinder_fills' AND column_name = 'organization_id'
        ) INTO column_exists;
        
        IF NOT column_exists THEN
            ALTER TABLE cylinder_fills ADD COLUMN organization_id UUID REFERENCES organizations(id);
        END IF;
    END IF;
    
    -- Add organization_id to deliveries if table exists and column doesn't exist
    SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'deliveries'
    ) INTO table_exists;
    
    IF table_exists THEN
        SELECT EXISTS (
            SELECT FROM information_schema.columns 
            WHERE table_name = 'deliveries' AND column_name = 'organization_id'
        ) INTO column_exists;
        
        IF NOT column_exists THEN
            ALTER TABLE deliveries ADD COLUMN organization_id UUID REFERENCES organizations(id);
        END IF;
    END IF;
    
    -- Add organization_id to notifications if table exists and column doesn't exist
    SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'notifications'
    ) INTO table_exists;
    
    IF table_exists THEN
        SELECT EXISTS (
            SELECT FROM information_schema.columns 
            WHERE table_name = 'notifications' AND column_name = 'organization_id'
        ) INTO column_exists;
        
        IF NOT column_exists THEN
            ALTER TABLE notifications ADD COLUMN organization_id UUID REFERENCES organizations(id);
        END IF;
    END IF;
    
    -- Add organization_id to audit_logs if table exists and column doesn't exist
    SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'audit_logs'
    ) INTO table_exists;
    
    IF table_exists THEN
        SELECT EXISTS (
            SELECT FROM information_schema.columns 
            WHERE table_name = 'audit_logs' AND column_name = 'organization_id'
        ) INTO column_exists;
        
        IF NOT column_exists THEN
            ALTER TABLE audit_logs ADD COLUMN organization_id UUID REFERENCES organizations(id);
        END IF;
    END IF;
END $$;

-- 3. Create default organization for existing data
INSERT INTO organizations (name, slug, subscription_status, trial_ends_at)
VALUES ('Default Organization', 'default', 'trial', NOW() + INTERVAL '7 days')
ON CONFLICT (slug) DO NOTHING;

-- 4. Update existing data to belong to default organization (only for tables that exist)
DO $$
DECLARE
    table_exists BOOLEAN;
BEGIN
    -- Update profiles
    SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'profiles'
    ) INTO table_exists;
    
    IF table_exists THEN
        UPDATE profiles SET organization_id = (SELECT id FROM organizations WHERE slug = 'default') WHERE organization_id IS NULL;
    END IF;
    
    -- Update customers
    SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'customers'
    ) INTO table_exists;
    
    IF table_exists THEN
        UPDATE customers SET organization_id = (SELECT id FROM organizations WHERE slug = 'default') WHERE organization_id IS NULL;
    END IF;
    
    -- Update bottles
    SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'bottles'
    ) INTO table_exists;
    
    IF table_exists THEN
        UPDATE bottles SET organization_id = (SELECT id FROM organizations WHERE slug = 'default') WHERE organization_id IS NULL;
    END IF;
    
    -- Update rentals
    SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'rentals'
    ) INTO table_exists;
    
    IF table_exists THEN
        UPDATE rentals SET organization_id = (SELECT id FROM organizations WHERE slug = 'default') WHERE organization_id IS NULL;
    END IF;
    
    -- Update invoices
    SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'invoices'
    ) INTO table_exists;
    
    IF table_exists THEN
        UPDATE invoices SET organization_id = (SELECT id FROM organizations WHERE slug = 'default') WHERE organization_id IS NULL;
    END IF;
    
    -- Update cylinder_fills
    SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'cylinder_fills'
    ) INTO table_exists;
    
    IF table_exists THEN
        UPDATE cylinder_fills SET organization_id = (SELECT id FROM organizations WHERE slug = 'default') WHERE organization_id IS NULL;
    END IF;
    
    -- Update deliveries
    SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'deliveries'
    ) INTO table_exists;
    
    IF table_exists THEN
        UPDATE deliveries SET organization_id = (SELECT id FROM organizations WHERE slug = 'default') WHERE organization_id IS NULL;
    END IF;
    
    -- Update notifications
    SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'notifications'
    ) INTO table_exists;
    
    IF table_exists THEN
        UPDATE notifications SET organization_id = (SELECT id FROM organizations WHERE slug = 'default') WHERE organization_id IS NULL;
    END IF;
    
    -- Update audit_logs
    SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'audit_logs'
    ) INTO table_exists;
    
    IF table_exists THEN
        UPDATE audit_logs SET organization_id = (SELECT id FROM organizations WHERE slug = 'default') WHERE organization_id IS NULL;
    END IF;
END $$;

-- 5. Make organization_id required for all tables (only for tables that exist)
DO $$
DECLARE
    table_exists BOOLEAN;
    column_exists BOOLEAN;
BEGIN
    -- Make organization_id required for profiles
    SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'profiles'
    ) INTO table_exists;
    
    IF table_exists THEN
        SELECT EXISTS (
            SELECT FROM information_schema.columns 
            WHERE table_name = 'profiles' AND column_name = 'organization_id'
        ) INTO column_exists;
        
        IF column_exists THEN
            ALTER TABLE profiles ALTER COLUMN organization_id SET NOT NULL;
        END IF;
    END IF;
    
    -- Make organization_id required for customers
    SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'customers'
    ) INTO table_exists;
    
    IF table_exists THEN
        SELECT EXISTS (
            SELECT FROM information_schema.columns 
            WHERE table_name = 'customers' AND column_name = 'organization_id'
        ) INTO column_exists;
        
        IF column_exists THEN
            ALTER TABLE customers ALTER COLUMN organization_id SET NOT NULL;
        END IF;
    END IF;
    
    -- Make organization_id required for bottles
    SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'bottles'
    ) INTO table_exists;
    
    IF table_exists THEN
        SELECT EXISTS (
            SELECT FROM information_schema.columns 
            WHERE table_name = 'bottles' AND column_name = 'organization_id'
        ) INTO column_exists;
        
        IF column_exists THEN
            ALTER TABLE bottles ALTER COLUMN organization_id SET NOT NULL;
        END IF;
    END IF;
    
    -- Make organization_id required for rentals
    SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'rentals'
    ) INTO table_exists;
    
    IF table_exists THEN
        SELECT EXISTS (
            SELECT FROM information_schema.columns 
            WHERE table_name = 'rentals' AND column_name = 'organization_id'
        ) INTO column_exists;
        
        IF column_exists THEN
            ALTER TABLE rentals ALTER COLUMN organization_id SET NOT NULL;
        END IF;
    END IF;
    
    -- Make organization_id required for invoices
    SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'invoices'
    ) INTO table_exists;
    
    IF table_exists THEN
        SELECT EXISTS (
            SELECT FROM information_schema.columns 
            WHERE table_name = 'invoices' AND column_name = 'organization_id'
        ) INTO column_exists;
        
        IF column_exists THEN
            ALTER TABLE invoices ALTER COLUMN organization_id SET NOT NULL;
        END IF;
    END IF;
    
    -- Make organization_id required for cylinder_fills
    SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'cylinder_fills'
    ) INTO table_exists;
    
    IF table_exists THEN
        SELECT EXISTS (
            SELECT FROM information_schema.columns 
            WHERE table_name = 'cylinder_fills' AND column_name = 'organization_id'
        ) INTO column_exists;
        
        IF column_exists THEN
            ALTER TABLE cylinder_fills ALTER COLUMN organization_id SET NOT NULL;
        END IF;
    END IF;
    
    -- Make organization_id required for deliveries
    SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'deliveries'
    ) INTO table_exists;
    
    IF table_exists THEN
        SELECT EXISTS (
            SELECT FROM information_schema.columns 
            WHERE table_name = 'deliveries' AND column_name = 'organization_id'
        ) INTO column_exists;
        
        IF column_exists THEN
            ALTER TABLE deliveries ALTER COLUMN organization_id SET NOT NULL;
        END IF;
    END IF;
    
    -- Make organization_id required for notifications
    SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'notifications'
    ) INTO table_exists;
    
    IF table_exists THEN
        SELECT EXISTS (
            SELECT FROM information_schema.columns 
            WHERE table_name = 'notifications' AND column_name = 'organization_id'
        ) INTO column_exists;
        
        IF column_exists THEN
            ALTER TABLE notifications ALTER COLUMN organization_id SET NOT NULL;
        END IF;
    END IF;
    
    -- Make organization_id required for audit_logs
    SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'audit_logs'
    ) INTO table_exists;
    
    IF table_exists THEN
        SELECT EXISTS (
            SELECT FROM information_schema.columns 
            WHERE table_name = 'audit_logs' AND column_name = 'organization_id'
        ) INTO column_exists;
        
        IF column_exists THEN
            ALTER TABLE audit_logs ALTER COLUMN organization_id SET NOT NULL;
        END IF;
    END IF;
END $$;

-- 6. Enable RLS on organizations table
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;

-- 7. Create RLS policies for organizations
DROP POLICY IF EXISTS "Allow users to read their own organization" ON organizations;
CREATE POLICY "Allow users to read their own organization"
ON organizations FOR SELECT
USING (id = (SELECT organization_id FROM profiles WHERE id = auth.uid()));

DROP POLICY IF EXISTS "Allow owners to manage their organization" ON organizations;
CREATE POLICY "Allow owners to manage their organization"
ON organizations FOR ALL
USING (
    (SELECT role FROM profiles WHERE id = auth.uid()) = 'owner' 
    AND id = (SELECT organization_id FROM profiles WHERE id = auth.uid())
);

-- 8. Update RLS policies for all tables to include organization isolation (only for tables that exist)
DO $$
DECLARE
    table_exists BOOLEAN;
BEGIN
    -- Profiles policies
    SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'profiles'
    ) INTO table_exists;
    
    IF table_exists THEN
        DROP POLICY IF EXISTS "Allow users to read their own profile" ON profiles;
        CREATE POLICY "Allow users to read profiles in their organization" ON profiles
        FOR SELECT USING (
            organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid())
            OR id = auth.uid()
        );

        DROP POLICY IF EXISTS "Allow users to update their own profile" ON profiles;
        CREATE POLICY "Allow users to update profiles in their organization" ON profiles
        FOR UPDATE USING (
            organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid())
            OR id = auth.uid()
        );
    END IF;
    
    -- Customers policies
    SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'customers'
    ) INTO table_exists;
    
    IF table_exists THEN
        DROP POLICY IF EXISTS "Allow authenticated users to see their own organization's customers" ON customers;
        CREATE POLICY "Allow users to manage customers in their organization" ON customers
        FOR ALL USING (organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid()));
    END IF;
    
    -- Bottles policies
    SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'bottles'
    ) INTO table_exists;
    
    IF table_exists THEN
        DROP POLICY IF EXISTS "Allow authenticated users to see their own organization's bottles" ON bottles;
        CREATE POLICY "Allow users to manage bottles in their organization" ON bottles
        FOR ALL USING (organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid()));
    END IF;
    
    -- Rentals policies
    SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'rentals'
    ) INTO table_exists;
    
    IF table_exists THEN
        DROP POLICY IF EXISTS "Allow authenticated users to see their own organization's rentals" ON rentals;
        CREATE POLICY "Allow users to manage rentals in their organization" ON rentals
        FOR ALL USING (organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid()));
    END IF;
    
    -- Invoices policies
    SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'invoices'
    ) INTO table_exists;
    
    IF table_exists THEN
        DROP POLICY IF EXISTS "Allow authenticated users to see their own organization's invoices" ON invoices;
        CREATE POLICY "Allow users to manage invoices in their organization" ON invoices
        FOR ALL USING (organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid()));
    END IF;
    
    -- Cylinder Fills policies
    SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'cylinder_fills'
    ) INTO table_exists;
    
    IF table_exists THEN
        DROP POLICY IF EXISTS "Allow authenticated users to see their own organization's cylinder_fills" ON cylinder_fills;
        CREATE POLICY "Allow users to manage cylinder_fills in their organization" ON cylinder_fills
        FOR ALL USING (organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid()));
    END IF;
    
    -- Deliveries policies
    SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'deliveries'
    ) INTO table_exists;
    
    IF table_exists THEN
        DROP POLICY IF EXISTS "Allow authenticated users to see their own organization's deliveries" ON deliveries;
        CREATE POLICY "Allow users to manage deliveries in their organization" ON deliveries
        FOR ALL USING (organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid()));
    END IF;
    
    -- Notifications policies
    SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'notifications'
    ) INTO table_exists;
    
    IF table_exists THEN
        DROP POLICY IF EXISTS "Allow authenticated users to see their own organization's notifications" ON notifications;
        CREATE POLICY "Allow users to manage notifications in their organization" ON notifications
        FOR ALL USING (organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid()));
    END IF;
    
    -- Audit Logs policies
    SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'audit_logs'
    ) INTO table_exists;
    
    IF table_exists THEN
        DROP POLICY IF EXISTS "Allow authenticated users to see their own organization's audit_logs" ON audit_logs;
        CREATE POLICY "Allow users to manage audit_logs in their organization" ON audit_logs
        FOR ALL USING (organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid()));
    END IF;
END $$;

-- 9. Create function to get current user's organization
CREATE OR REPLACE FUNCTION get_my_organization_id()
RETURNS UUID
LANGUAGE SQL
SECURITY DEFINER
AS $$
    SELECT organization_id FROM profiles WHERE id = auth.uid();
$$;

-- 10. Create function to check if user is in organization
CREATE OR REPLACE FUNCTION is_in_organization(org_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
SECURITY DEFINER
AS $$
    SELECT organization_id = org_id FROM profiles WHERE id = auth.uid();
$$;

-- 11. Create organization usage view
DROP VIEW IF EXISTS organization_usage;
CREATE OR REPLACE VIEW organization_usage AS
SELECT 
    o.id as organization_id,
    o.name as organization_name,
    o.slug,
    COALESCE(sp.name, 'No Plan') as subscription_plan,
    o.subscription_status,
    o.trial_ends_at,
    COALESCE(user_counts.user_count, 0) as current_users,
    COALESCE(customer_counts.customer_count, 0) as current_customers,
    COALESCE(cylinder_counts.cylinder_count, 0) as current_cylinders,
    o.max_users,
    o.max_customers,
    o.max_cylinders,
    CASE 
        WHEN o.trial_ends_at < NOW() THEN 'expired'
        WHEN o.trial_ends_at > NOW() THEN 'active'
        ELSE 'unknown'
    END as trial_status
FROM organizations o
LEFT JOIN subscription_plans sp ON o.subscription_plan_id = sp.id
LEFT JOIN (
    SELECT 
        organization_id,
        COUNT(*) as user_count
    FROM profiles 
    WHERE organization_id IS NOT NULL
    GROUP BY organization_id
) user_counts ON o.id = user_counts.organization_id
LEFT JOIN (
    SELECT 
        organization_id,
        COUNT(*) as customer_count
    FROM customers 
    WHERE organization_id IS NOT NULL
    GROUP BY organization_id
) customer_counts ON o.id = customer_counts.organization_id
LEFT JOIN (
    SELECT 
        organization_id,
        COUNT(*) as cylinder_count
    FROM bottles 
    WHERE organization_id IS NOT NULL
    GROUP BY organization_id
) cylinder_counts ON o.id = cylinder_counts.organization_id;

-- Note: Views don't support RLS policies directly. The security is handled by the underlying tables' RLS policies.
-- Users will only see data from their organization because the underlying tables (organizations, profiles, customers, bottles) have RLS policies.

-- 13. Create triggers to automatically set organization_id (only for tables that exist)
CREATE OR REPLACE FUNCTION set_organization_id()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.organization_id IS NULL THEN
        NEW.organization_id := (SELECT organization_id FROM profiles WHERE id = auth.uid());
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for all tables (only if they exist)
DO $$
DECLARE
    table_exists BOOLEAN;
    trigger_exists BOOLEAN;
BEGIN
    -- Customers trigger
    SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'customers'
    ) INTO table_exists;
    
    IF table_exists THEN
        SELECT EXISTS (
            SELECT FROM information_schema.triggers 
            WHERE trigger_name = 'set_organization_id_customers'
        ) INTO trigger_exists;
        
        IF NOT trigger_exists THEN
            CREATE TRIGGER set_organization_id_customers
                BEFORE INSERT ON customers
                FOR EACH ROW
                EXECUTE FUNCTION set_organization_id();
        END IF;
    END IF;
    
    -- Bottles trigger
    SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'bottles'
    ) INTO table_exists;
    
    IF table_exists THEN
        SELECT EXISTS (
            SELECT FROM information_schema.triggers 
            WHERE trigger_name = 'set_organization_id_bottles'
        ) INTO trigger_exists;
        
        IF NOT trigger_exists THEN
            CREATE TRIGGER set_organization_id_bottles
                BEFORE INSERT ON bottles
                FOR EACH ROW
                EXECUTE FUNCTION set_organization_id();
        END IF;
    END IF;
    
    -- Rentals trigger
    SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'rentals'
    ) INTO table_exists;
    
    IF table_exists THEN
        SELECT EXISTS (
            SELECT FROM information_schema.triggers 
            WHERE trigger_name = 'set_organization_id_rentals'
        ) INTO trigger_exists;
        
        IF NOT trigger_exists THEN
            CREATE TRIGGER set_organization_id_rentals
                BEFORE INSERT ON rentals
                FOR EACH ROW
                EXECUTE FUNCTION set_organization_id();
        END IF;
    END IF;
    
    -- Invoices trigger
    SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'invoices'
    ) INTO table_exists;
    
    IF table_exists THEN
        SELECT EXISTS (
            SELECT FROM information_schema.triggers 
            WHERE trigger_name = 'set_organization_id_invoices'
        ) INTO trigger_exists;
        
        IF NOT trigger_exists THEN
            CREATE TRIGGER set_organization_id_invoices
                BEFORE INSERT ON invoices
                FOR EACH ROW
                EXECUTE FUNCTION set_organization_id();
        END IF;
    END IF;
    
    -- Cylinder Fills trigger
    SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'cylinder_fills'
    ) INTO table_exists;
    
    IF table_exists THEN
        SELECT EXISTS (
            SELECT FROM information_schema.triggers 
            WHERE trigger_name = 'set_organization_id_cylinder_fills'
        ) INTO trigger_exists;
        
        IF NOT trigger_exists THEN
            CREATE TRIGGER set_organization_id_cylinder_fills
                BEFORE INSERT ON cylinder_fills
                FOR EACH ROW
                EXECUTE FUNCTION set_organization_id();
        END IF;
    END IF;
    
    -- Deliveries trigger
    SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'deliveries'
    ) INTO table_exists;
    
    IF table_exists THEN
        SELECT EXISTS (
            SELECT FROM information_schema.triggers 
            WHERE trigger_name = 'set_organization_id_deliveries'
        ) INTO trigger_exists;
        
        IF NOT trigger_exists THEN
            CREATE TRIGGER set_organization_id_deliveries
                BEFORE INSERT ON deliveries
                FOR EACH ROW
                EXECUTE FUNCTION set_organization_id();
        END IF;
    END IF;
    
    -- Notifications trigger
    SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'notifications'
    ) INTO table_exists;
    
    IF table_exists THEN
        SELECT EXISTS (
            SELECT FROM information_schema.triggers 
            WHERE trigger_name = 'set_organization_id_notifications'
        ) INTO trigger_exists;
        
        IF NOT trigger_exists THEN
            CREATE TRIGGER set_organization_id_notifications
                BEFORE INSERT ON notifications
                FOR EACH ROW
                EXECUTE FUNCTION set_organization_id();
        END IF;
    END IF;
    
    -- Audit Logs trigger
    SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'audit_logs'
    ) INTO table_exists;
    
    IF table_exists THEN
        SELECT EXISTS (
            SELECT FROM information_schema.triggers 
            WHERE trigger_name = 'set_organization_id_audit_logs'
        ) INTO trigger_exists;
        
        IF NOT trigger_exists THEN
            CREATE TRIGGER set_organization_id_audit_logs
                BEFORE INSERT ON audit_logs
                FOR EACH ROW
                EXECUTE FUNCTION set_organization_id();
        END IF;
    END IF;
END $$; 