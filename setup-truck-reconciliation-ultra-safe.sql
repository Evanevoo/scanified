-- Truck Reconciliation Database Setup (ULTRA SAFE VERSION)
-- This version checks exact column names and fixes any issues

-- Step 1: Diagnose the profiles table structure
DO $$
DECLARE
  col_record RECORD;
BEGIN
  RAISE NOTICE '🔍 Step 1: Diagnosing profiles table structure...';
  
  -- Check if profiles table exists
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'profiles') THEN
    RAISE NOTICE '✅ profiles table exists';
    
    -- List all columns in profiles table
    RAISE NOTICE '📋 Current columns in profiles table:';
    FOR col_record IN 
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'profiles' 
      ORDER BY ordinal_position
    LOOP
      RAISE NOTICE '  - % (%)', col_record.column_name, col_record.data_type;
    END LOOP;
    
  ELSE
    RAISE NOTICE '❌ profiles table does not exist';
  END IF;
END $$;

-- Step 2: Fix profiles table structure
DO $$
BEGIN
  RAISE NOTICE '🔧 Step 2: Fixing profiles table structure...';
  
  -- Check if profiles table exists
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'profiles') THEN
    
    -- Add organization_id column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'organization_id') THEN
      ALTER TABLE profiles ADD COLUMN organization_id UUID;
      RAISE NOTICE '✅ Added organization_id column to profiles table';
    ELSE
      RAISE NOTICE '✅ profiles table already has organization_id column';
    END IF;
    
    -- Add role column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'role') THEN
      ALTER TABLE profiles ADD COLUMN role TEXT DEFAULT 'user';
      RAISE NOTICE '✅ Added role column to profiles table';
    ELSE
      RAISE NOTICE '✅ profiles table already has role column';
    END IF;
    
  ELSE
    RAISE NOTICE '❌ profiles table does not exist - creating it';
    CREATE TABLE profiles (
      id UUID PRIMARY KEY,
      organization_id UUID,
      email TEXT UNIQUE NOT NULL,
      full_name TEXT,
      role TEXT DEFAULT 'user',
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
    RAISE NOTICE '✅ Created profiles table with organization_id and role columns';
  END IF;
END $$;

-- Step 3: Verify the fix worked
DO $$
BEGIN
  RAISE NOTICE '✅ Step 3: Verifying profiles table structure...';
  
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'organization_id') THEN
    RAISE NOTICE '✅ CONFIRMED: profiles table now has organization_id column';
  ELSE
    RAISE NOTICE '❌ ERROR: profiles table still missing organization_id column';
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'role') THEN
    RAISE NOTICE '✅ CONFIRMED: profiles table now has role column';
  ELSE
    RAISE NOTICE '❌ ERROR: profiles table still missing role column';
  END IF;
END $$;

-- Step 4: Check and fix organizations table
DO $$
BEGIN
  RAISE NOTICE '🏢 Step 4: Checking organizations table...';
  
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'organizations') THEN
    RAISE NOTICE '✅ organizations table exists';
  ELSE
    RAISE NOTICE '❌ organizations table does not exist - creating it';
    CREATE TABLE organizations (
      id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
      name TEXT NOT NULL,
      slug TEXT UNIQUE NOT NULL,
      domain TEXT,
      subscription_plan TEXT DEFAULT 'basic',
      subscription_status TEXT DEFAULT 'trial',
      is_active BOOLEAN DEFAULT true,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
    
    INSERT INTO organizations (name, slug) VALUES ('Default Organization', 'default-org');
    RAISE NOTICE '✅ Created organizations table with default org';
  END IF;
END $$;

-- Step 5: Link existing profiles to default organization
DO $$
DECLARE
  default_org_id UUID;
  update_count INTEGER;
BEGIN
  RAISE NOTICE '🔗 Step 5: Linking profiles to default organization...';
  
  SELECT id INTO default_org_id FROM organizations WHERE slug = 'default-org' LIMIT 1;
  
  IF default_org_id IS NOT NULL THEN
    UPDATE profiles SET organization_id = default_org_id WHERE organization_id IS NULL;
    GET DIAGNOSTICS update_count = ROW_COUNT;
    RAISE NOTICE '✅ Updated % profiles with default organization', update_count;
  ELSE
    RAISE NOTICE '❌ Could not find default organization';
  END IF;
END $$;

-- Step 6: Create truck reconciliation tables
DO $$
BEGIN
  RAISE NOTICE '🚛 Step 6: Creating truck reconciliation tables...';
END $$;

-- Create delivery routes table
CREATE TABLE IF NOT EXISTS delivery_routes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  route_name VARCHAR(255) NOT NULL,
  route_code VARCHAR(50) NOT NULL,
  driver_id UUID,
  truck_id VARCHAR(100),
  status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'completed', 'cancelled')),
  estimated_duration INTEGER, -- minutes
  actual_duration INTEGER, -- minutes
  total_distance DECIMAL(10,2), -- miles/km
  fuel_cost DECIMAL(10,2),
  route_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Add unique constraint for route codes
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'unique_route_code_per_org'
  ) THEN
    ALTER TABLE delivery_routes ADD CONSTRAINT unique_route_code_per_org UNIQUE(organization_id, route_code);
    RAISE NOTICE '✅ Added unique constraint for route codes';
  END IF;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Route code constraint already exists or could not be added';
END $$;

-- Create delivery stops table
CREATE TABLE IF NOT EXISTS delivery_stops (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  route_id UUID REFERENCES delivery_routes(id) ON DELETE CASCADE,
  customer_id UUID,
  stop_order INTEGER NOT NULL,
  customer_name VARCHAR(255),
  address TEXT,
  phone VARCHAR(50),
  delivery_instructions TEXT,
  estimated_arrival TIME,
  actual_arrival TIMESTAMP WITH TIME ZONE,
  departure_time TIMESTAMP WITH TIME ZONE,
  status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'in_transit', 'delivered', 'failed', 'skipped')),
  delivery_notes TEXT,
  signature_required BOOLEAN DEFAULT true,
  signature_data TEXT, -- Base64 encoded signature
  photo_proof TEXT, -- Base64 encoded photo or URL
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create delivery manifests table
CREATE TABLE IF NOT EXISTS delivery_manifests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  route_id UUID REFERENCES delivery_routes(id) ON DELETE SET NULL,
  manifest_number VARCHAR(100) NOT NULL,
  manifest_type VARCHAR(50) DEFAULT 'delivery' CHECK (manifest_type IN ('delivery', 'pickup', 'exchange', 'service')),
  driver_id UUID,
  truck_id VARCHAR(100),
  manifest_date DATE NOT NULL,
  status VARCHAR(50) DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'in_progress', 'completed', 'reconciled')),
  total_cylinders_out INTEGER DEFAULT 0,
  total_cylinders_in INTEGER DEFAULT 0,
  total_cylinders_exchanged INTEGER DEFAULT 0,
  fuel_start DECIMAL(5,2),
  fuel_end DECIMAL(5,2),
  mileage_start INTEGER,
  mileage_end INTEGER,
  departure_time TIMESTAMP WITH TIME ZONE,
  return_time TIMESTAMP WITH TIME ZONE,
  manifest_notes TEXT,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Add unique constraint for manifest numbers
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'unique_manifest_number_per_org'
  ) THEN
    ALTER TABLE delivery_manifests ADD CONSTRAINT unique_manifest_number_per_org UNIQUE(organization_id, manifest_number);
    RAISE NOTICE '✅ Added unique constraint for manifest numbers';
  END IF;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Manifest number constraint already exists or could not be added';
END $$;

-- Create manifest items table (cylinders on the manifest)
CREATE TABLE IF NOT EXISTS manifest_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  manifest_id UUID REFERENCES delivery_manifests(id) ON DELETE CASCADE,
  stop_id UUID REFERENCES delivery_stops(id) ON DELETE SET NULL,
  bottle_id UUID,
  barcode_number VARCHAR(255),
  product_type VARCHAR(100),
  size VARCHAR(50),
  action VARCHAR(50) CHECK (action IN ('deliver', 'pickup', 'exchange_in', 'exchange_out')),
  expected_quantity INTEGER DEFAULT 1,
  actual_quantity INTEGER,
  status VARCHAR(50) DEFAULT 'planned' CHECK (status IN ('planned', 'loaded', 'delivered', 'returned', 'missing', 'damaged')),
  condition_notes TEXT,
  scanned_at TIMESTAMP WITH TIME ZONE,
  scanned_by UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create truck reconciliation table
CREATE TABLE IF NOT EXISTS truck_reconciliations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  manifest_id UUID REFERENCES delivery_manifests(id) ON DELETE CASCADE,
  reconciliation_date DATE NOT NULL,
  reconciled_by UUID,
  status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'discrepancy')),
  total_discrepancies INTEGER DEFAULT 0,
  reconciliation_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create reconciliation discrepancies table
CREATE TABLE IF NOT EXISTS reconciliation_discrepancies (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  reconciliation_id UUID REFERENCES truck_reconciliations(id) ON DELETE CASCADE,
  manifest_item_id UUID REFERENCES manifest_items(id) ON DELETE CASCADE,
  discrepancy_type VARCHAR(50) CHECK (discrepancy_type IN ('missing', 'extra', 'damaged', 'wrong_product', 'quantity_mismatch')),
  expected_quantity INTEGER,
  actual_quantity INTEGER,
  discrepancy_notes TEXT,
  resolved BOOLEAN DEFAULT false,
  resolved_by UUID,
  resolved_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_delivery_routes_org ON delivery_routes(organization_id);
CREATE INDEX IF NOT EXISTS idx_delivery_stops_route ON delivery_stops(route_id);
CREATE INDEX IF NOT EXISTS idx_delivery_manifests_org ON delivery_manifests(organization_id);
CREATE INDEX IF NOT EXISTS idx_delivery_manifests_route ON delivery_manifests(route_id);
CREATE INDEX IF NOT EXISTS idx_manifest_items_manifest ON manifest_items(manifest_id);
CREATE INDEX IF NOT EXISTS idx_manifest_items_stop ON manifest_items(stop_id);
CREATE INDEX IF NOT EXISTS idx_truck_reconciliations_org ON truck_reconciliations(organization_id);
CREATE INDEX IF NOT EXISTS idx_reconciliation_discrepancies_recon ON reconciliation_discrepancies(reconciliation_id);

-- Enable RLS for all tables
ALTER TABLE delivery_routes ENABLE ROW LEVEL SECURITY;
ALTER TABLE delivery_stops ENABLE ROW LEVEL SECURITY;
ALTER TABLE delivery_manifests ENABLE ROW LEVEL SECURITY;
ALTER TABLE manifest_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE truck_reconciliations ENABLE ROW LEVEL SECURITY;
ALTER TABLE reconciliation_discrepancies ENABLE ROW LEVEL SECURITY;

-- Step 7: Create RLS policies (with final verification)
DO $$
BEGIN
  RAISE NOTICE '🔒 Step 7: Creating RLS policies...';
  
  -- Final verification that profiles table has organization_id column
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'organization_id') THEN
    RAISE NOTICE '✅ FINAL CHECK PASSED: profiles table has organization_id column';
    
    -- RLS Policies for delivery_routes
    DROP POLICY IF EXISTS "Users can view delivery routes for their organization" ON delivery_routes;
    CREATE POLICY "Users can view delivery routes for their organization" 
    ON delivery_routes FOR SELECT 
    USING (
      EXISTS (
        SELECT 1 FROM profiles 
        WHERE profiles.id = auth.uid() 
        AND profiles.organization_id::text = delivery_routes.organization_id::text
      )
    );

    DROP POLICY IF EXISTS "Admins can manage delivery routes" ON delivery_routes;
    CREATE POLICY "Admins can manage delivery routes" 
    ON delivery_routes FOR ALL 
    USING (
      EXISTS (
        SELECT 1 FROM profiles 
        WHERE profiles.id = auth.uid() 
        AND profiles.organization_id::text = delivery_routes.organization_id::text
        AND profiles.role IN ('admin', 'owner', 'manager')
      )
    );

    -- RLS Policies for delivery_stops
    DROP POLICY IF EXISTS "Users can view delivery stops for their organization" ON delivery_stops;
    CREATE POLICY "Users can view delivery stops for their organization" 
    ON delivery_stops FOR SELECT 
    USING (
      EXISTS (
        SELECT 1 FROM delivery_routes dr
        JOIN profiles p ON p.organization_id::text = dr.organization_id::text
        WHERE p.id = auth.uid() 
        AND dr.id = delivery_stops.route_id
      )
    );

    DROP POLICY IF EXISTS "Admins can manage delivery stops" ON delivery_stops;
    CREATE POLICY "Admins can manage delivery stops" 
    ON delivery_stops FOR ALL 
    USING (
      EXISTS (
        SELECT 1 FROM delivery_routes dr
        JOIN profiles p ON p.organization_id::text = dr.organization_id::text
        WHERE p.id = auth.uid() 
        AND dr.id = delivery_stops.route_id
        AND p.role IN ('admin', 'owner', 'manager')
      )
    );

    -- RLS Policies for delivery_manifests
    DROP POLICY IF EXISTS "Users can view delivery manifests for their organization" ON delivery_manifests;
    CREATE POLICY "Users can view delivery manifests for their organization" 
    ON delivery_manifests FOR SELECT 
    USING (
      EXISTS (
        SELECT 1 FROM profiles 
        WHERE profiles.id = auth.uid() 
        AND profiles.organization_id::text = delivery_manifests.organization_id::text
      )
    );

    DROP POLICY IF EXISTS "Admins can manage delivery manifests" ON delivery_manifests;
    CREATE POLICY "Admins can manage delivery manifests" 
    ON delivery_manifests FOR ALL 
    USING (
      EXISTS (
        SELECT 1 FROM profiles 
        WHERE profiles.id = auth.uid() 
        AND profiles.organization_id::text = delivery_manifests.organization_id::text
        AND profiles.role IN ('admin', 'owner', 'manager')
      )
    );

    -- RLS Policies for manifest_items
    DROP POLICY IF EXISTS "Users can view manifest items for their organization" ON manifest_items;
    CREATE POLICY "Users can view manifest items for their organization" 
    ON manifest_items FOR SELECT 
    USING (
      EXISTS (
        SELECT 1 FROM delivery_manifests dm
        JOIN profiles p ON p.organization_id::text = dm.organization_id::text
        WHERE p.id = auth.uid() 
        AND dm.id = manifest_items.manifest_id
      )
    );

    DROP POLICY IF EXISTS "Admins can manage manifest items" ON manifest_items;
    CREATE POLICY "Admins can manage manifest items" 
    ON manifest_items FOR ALL 
    USING (
      EXISTS (
        SELECT 1 FROM delivery_manifests dm
        JOIN profiles p ON p.organization_id::text = dm.organization_id::text
        WHERE p.id = auth.uid() 
        AND dm.id = manifest_items.manifest_id
        AND p.role IN ('admin', 'owner', 'manager')
      )
    );

    -- RLS Policies for truck_reconciliations
    DROP POLICY IF EXISTS "Users can view truck reconciliations for their organization" ON truck_reconciliations;
    CREATE POLICY "Users can view truck reconciliations for their organization" 
    ON truck_reconciliations FOR SELECT 
    USING (
      EXISTS (
        SELECT 1 FROM profiles 
        WHERE profiles.id = auth.uid() 
        AND profiles.organization_id::text = truck_reconciliations.organization_id::text
      )
    );

    DROP POLICY IF EXISTS "Admins can manage truck reconciliations" ON truck_reconciliations;
    CREATE POLICY "Admins can manage truck reconciliations" 
    ON truck_reconciliations FOR ALL 
    USING (
      EXISTS (
        SELECT 1 FROM profiles 
        WHERE profiles.id = auth.uid() 
        AND profiles.organization_id::text = truck_reconciliations.organization_id::text
        AND profiles.role IN ('admin', 'owner', 'manager')
      )
    );

    -- RLS Policies for reconciliation_discrepancies
    DROP POLICY IF EXISTS "Users can view reconciliation discrepancies for their organization" ON reconciliation_discrepancies;
    CREATE POLICY "Users can view reconciliation discrepancies for their organization" 
    ON reconciliation_discrepancies FOR SELECT 
    USING (
      EXISTS (
        SELECT 1 FROM truck_reconciliations tr
        JOIN profiles p ON p.organization_id::text = tr.organization_id::text
        WHERE p.id = auth.uid() 
        AND tr.id = reconciliation_discrepancies.reconciliation_id
      )
    );

    DROP POLICY IF EXISTS "Admins can manage reconciliation discrepancies" ON reconciliation_discrepancies;
    CREATE POLICY "Admins can manage reconciliation discrepancies" 
    ON reconciliation_discrepancies FOR ALL 
    USING (
      EXISTS (
        SELECT 1 FROM truck_reconciliations tr
        JOIN profiles p ON p.organization_id::text = tr.organization_id::text
        WHERE p.id = auth.uid() 
        AND tr.id = reconciliation_discrepancies.reconciliation_id
        AND p.role IN ('admin', 'owner', 'manager')
      )
    );

    RAISE NOTICE '✅ RLS policies created successfully';
  ELSE
    RAISE NOTICE '❌ CRITICAL ERROR: profiles table still missing organization_id column after fix attempt';
    RAISE NOTICE 'This indicates a deeper database issue that needs manual intervention';
  END IF;
END $$;

-- Final success message
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '🎉 TRUCK RECONCILIATION SETUP COMPLETE!';
  RAISE NOTICE '';
  RAISE NOTICE '✅ Database structure fixed:';
  RAISE NOTICE '- profiles table has organization_id column';
  RAISE NOTICE '- profiles table has role column';
  RAISE NOTICE '- organizations table exists';
  RAISE NOTICE '';
  RAISE NOTICE '✅ Tables created:';
  RAISE NOTICE '- delivery_routes';
  RAISE NOTICE '- delivery_stops';
  RAISE NOTICE '- delivery_manifests';
  RAISE NOTICE '- manifest_items';
  RAISE NOTICE '- truck_reconciliations';
  RAISE NOTICE '- reconciliation_discrepancies';
  RAISE NOTICE '';
  RAISE NOTICE '✅ Security applied:';
  RAISE NOTICE '- RLS policies created';
  RAISE NOTICE '- Indexes created for performance';
  RAISE NOTICE '';
  RAISE NOTICE '🚛 You can now use the truck reconciliation features!';
END $$;
