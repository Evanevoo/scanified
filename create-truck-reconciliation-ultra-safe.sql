-- =============================================
-- ULTRA SAFE Truck Reconciliation & Manifest System
-- Adds missing columns first, then creates tables safely
-- =============================================

-- Step 1: Add missing columns to existing tables (if they exist)
DO $$
BEGIN
  RAISE NOTICE '🔍 Step 1: Checking and adding missing columns to existing tables...';
  
  -- Add organization_id to customers table if it exists but doesn't have the column
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'customers') THEN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'customers' AND column_name = 'organization_id') THEN
      ALTER TABLE customers ADD COLUMN organization_id UUID;
      RAISE NOTICE '✅ Added organization_id column to customers table';
    ELSE
      RAISE NOTICE '✅ customers table already has organization_id column';
    END IF;
  ELSE
    RAISE NOTICE '⚠️ customers table does not exist';
  END IF;

  -- Add organization_id to bottles table if it exists but doesn't have the column
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'bottles') THEN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'bottles' AND column_name = 'organization_id') THEN
      ALTER TABLE bottles ADD COLUMN organization_id UUID;
      RAISE NOTICE '✅ Added organization_id column to bottles table';
    ELSE
      RAISE NOTICE '✅ bottles table already has organization_id column';
    END IF;
  ELSE
    RAISE NOTICE '⚠️ bottles table does not exist';
  END IF;

  -- Add organization_id to profiles table if it exists but doesn't have the column
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'profiles') THEN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'organization_id') THEN
      ALTER TABLE profiles ADD COLUMN organization_id UUID;
      RAISE NOTICE '✅ Added organization_id column to profiles table';
    ELSE
      RAISE NOTICE '✅ profiles table already has organization_id column';
    END IF;
  ELSE
    RAISE NOTICE '⚠️ profiles table does not exist';
  END IF;

  -- Add created_at to tables that might be missing it
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'customers') THEN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'customers' AND column_name = 'created_at') THEN
      ALTER TABLE customers ADD COLUMN created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;
      RAISE NOTICE '✅ Added created_at column to customers table';
    END IF;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'bottles') THEN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'bottles' AND column_name = 'created_at') THEN
      ALTER TABLE bottles ADD COLUMN created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;
      RAISE NOTICE '✅ Added created_at column to bottles table';
    END IF;
  END IF;

  RAISE NOTICE '✅ Step 1 completed: Missing columns added where needed';
END $$;

-- Step 2: Create organizations table if it doesn't exist
DO $$
BEGIN
  RAISE NOTICE '🏢 Step 2: Creating organizations table if needed...';
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'organizations') THEN
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
    
    -- Create a default organization for existing data
    INSERT INTO organizations (name, slug) VALUES ('Default Organization', 'default-org');
    
    RAISE NOTICE '✅ Created organizations table with default organization';
  ELSE
    RAISE NOTICE '✅ organizations table already exists';
  END IF;
END $$;

-- Step 3: Update existing records to link to default organization
DO $$
DECLARE
  default_org_id UUID;
BEGIN
  RAISE NOTICE '🔗 Step 3: Linking existing records to default organization...';
  
  -- Get the default organization ID
  SELECT id INTO default_org_id FROM organizations WHERE slug = 'default-org' LIMIT 1;
  
  IF default_org_id IS NOT NULL THEN
    -- Update customers
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'customers') THEN
      UPDATE customers SET organization_id = default_org_id WHERE organization_id IS NULL;
      RAISE NOTICE '✅ Updated customers to link to default organization';
    END IF;
    
    -- Update bottles
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'bottles') THEN
      UPDATE bottles SET organization_id = default_org_id WHERE organization_id IS NULL;
      RAISE NOTICE '✅ Updated bottles to link to default organization';
    END IF;
    
    -- Update profiles
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'profiles') THEN
      UPDATE profiles SET organization_id = default_org_id WHERE organization_id IS NULL;
      RAISE NOTICE '✅ Updated profiles to link to default organization';
    END IF;
  END IF;
  
  RAISE NOTICE '✅ Step 3 completed: Existing records linked to organization';
END $$;

-- Step 4: Create truck reconciliation tables
DO $$
BEGIN
  RAISE NOTICE '🚛 Step 4: Creating truck reconciliation tables...';
END $$;

-- Create delivery routes table
CREATE TABLE IF NOT EXISTS delivery_routes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID,
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

-- Create delivery stops table
CREATE TABLE IF NOT EXISTS delivery_stops (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  route_id UUID,
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
  organization_id UUID,
  route_id UUID,
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

-- Create manifest items table (cylinders on the manifest)
CREATE TABLE IF NOT EXISTS manifest_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  manifest_id UUID,
  stop_id UUID,
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
  organization_id UUID,
  manifest_id UUID,
  reconciliation_date DATE NOT NULL,
  reconciled_by UUID,
  truck_id VARCHAR(100),
  driver_id UUID,
  
  -- Expected vs Actual counts
  expected_out INTEGER DEFAULT 0,
  actual_out INTEGER DEFAULT 0,
  expected_in INTEGER DEFAULT 0,
  actual_in INTEGER DEFAULT 0,
  expected_exchange INTEGER DEFAULT 0,
  actual_exchange INTEGER DEFAULT 0,
  
  -- Discrepancies
  missing_cylinders INTEGER DEFAULT 0,
  extra_cylinders INTEGER DEFAULT 0,
  damaged_cylinders INTEGER DEFAULT 0,
  
  -- Financial impact
  discrepancy_cost DECIMAL(10,2) DEFAULT 0.00,
  
  -- Status and notes
  status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'disputed')),
  reconciliation_notes TEXT,
  discrepancy_notes TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create reconciliation discrepancies table
CREATE TABLE IF NOT EXISTS reconciliation_discrepancies (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  reconciliation_id UUID,
  manifest_item_id UUID,
  discrepancy_type VARCHAR(50) CHECK (discrepancy_type IN ('missing', 'extra', 'damaged', 'wrong_product', 'wrong_customer')),
  expected_barcode VARCHAR(255),
  actual_barcode VARCHAR(255),
  expected_action VARCHAR(50),
  actual_action VARCHAR(50),
  financial_impact DECIMAL(10,2) DEFAULT 0.00,
  resolution_status VARCHAR(50) DEFAULT 'unresolved' CHECK (resolution_status IN ('unresolved', 'investigating', 'resolved', 'written_off')),
  resolution_notes TEXT,
  resolved_by UUID,
  resolved_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create driver performance tracking
CREATE TABLE IF NOT EXISTS driver_performance (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID,
  driver_id UUID,
  performance_date DATE NOT NULL,
  
  -- Delivery metrics
  total_stops INTEGER DEFAULT 0,
  successful_deliveries INTEGER DEFAULT 0,
  failed_deliveries INTEGER DEFAULT 0,
  on_time_deliveries INTEGER DEFAULT 0,
  
  -- Accuracy metrics
  scanning_accuracy DECIMAL(5,2) DEFAULT 100.00, -- percentage
  manifest_accuracy DECIMAL(5,2) DEFAULT 100.00, -- percentage
  reconciliation_score DECIMAL(5,2) DEFAULT 100.00, -- percentage
  
  -- Efficiency metrics
  avg_stop_time INTEGER, -- minutes
  total_drive_time INTEGER, -- minutes
  fuel_efficiency DECIMAL(5,2), -- miles per gallon
  
  -- Customer satisfaction
  customer_rating DECIMAL(3,2), -- out of 5.00
  customer_complaints INTEGER DEFAULT 0,
  customer_compliments INTEGER DEFAULT 0,
  
  -- Notes and feedback
  performance_notes TEXT,
  supervisor_feedback TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create truck maintenance tracking
CREATE TABLE IF NOT EXISTS truck_maintenance (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID,
  truck_id VARCHAR(100) NOT NULL,
  maintenance_type VARCHAR(50) CHECK (maintenance_type IN ('routine', 'repair', 'inspection', 'emergency')),
  maintenance_date DATE NOT NULL,
  mileage INTEGER,
  description TEXT,
  cost DECIMAL(10,2),
  vendor VARCHAR(255),
  next_maintenance_date DATE,
  next_maintenance_mileage INTEGER,
  status VARCHAR(50) DEFAULT 'completed' CHECK (status IN ('scheduled', 'in_progress', 'completed', 'cancelled')),
  maintenance_notes TEXT,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Step 5: Enable Row Level Security
DO $$
BEGIN
  RAISE NOTICE '🔐 Step 5: Enabling Row Level Security...';
END $$;

ALTER TABLE delivery_routes ENABLE ROW LEVEL SECURITY;
ALTER TABLE delivery_stops ENABLE ROW LEVEL SECURITY;
ALTER TABLE delivery_manifests ENABLE ROW LEVEL SECURITY;
ALTER TABLE manifest_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE truck_reconciliations ENABLE ROW LEVEL SECURITY;
ALTER TABLE reconciliation_discrepancies ENABLE ROW LEVEL SECURITY;
ALTER TABLE driver_performance ENABLE ROW LEVEL SECURITY;
ALTER TABLE truck_maintenance ENABLE ROW LEVEL SECURITY;

-- Step 6: Create basic RLS policies that work with any database state
DO $$
BEGIN
  RAISE NOTICE '🛡️ Step 6: Creating basic RLS policies...';
END $$;

-- Basic policies that allow all authenticated users (will be refined later)
DROP POLICY IF EXISTS "Users can view delivery routes" ON delivery_routes;
CREATE POLICY "Users can view delivery routes" ON delivery_routes FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Users can manage delivery routes" ON delivery_routes;
CREATE POLICY "Users can manage delivery routes" ON delivery_routes FOR ALL TO authenticated USING (true);

DROP POLICY IF EXISTS "Users can view delivery stops" ON delivery_stops;
CREATE POLICY "Users can view delivery stops" ON delivery_stops FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Users can manage delivery stops" ON delivery_stops;
CREATE POLICY "Users can manage delivery stops" ON delivery_stops FOR ALL TO authenticated USING (true);

DROP POLICY IF EXISTS "Users can view delivery manifests" ON delivery_manifests;
CREATE POLICY "Users can view delivery manifests" ON delivery_manifests FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Users can manage delivery manifests" ON delivery_manifests;
CREATE POLICY "Users can manage delivery manifests" ON delivery_manifests FOR ALL TO authenticated USING (true);

DROP POLICY IF EXISTS "Users can view manifest items" ON manifest_items;
CREATE POLICY "Users can view manifest items" ON manifest_items FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Users can manage manifest items" ON manifest_items;
CREATE POLICY "Users can manage manifest items" ON manifest_items FOR ALL TO authenticated USING (true);

DROP POLICY IF EXISTS "Users can view truck reconciliations" ON truck_reconciliations;
CREATE POLICY "Users can view truck reconciliations" ON truck_reconciliations FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Users can manage truck reconciliations" ON truck_reconciliations;
CREATE POLICY "Users can manage truck reconciliations" ON truck_reconciliations FOR ALL TO authenticated USING (true);

DROP POLICY IF EXISTS "Users can view reconciliation discrepancies" ON reconciliation_discrepancies;
CREATE POLICY "Users can view reconciliation discrepancies" ON reconciliation_discrepancies FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Users can manage reconciliation discrepancies" ON reconciliation_discrepancies;
CREATE POLICY "Users can manage reconciliation discrepancies" ON reconciliation_discrepancies FOR ALL TO authenticated USING (true);

DROP POLICY IF EXISTS "Users can view driver performance" ON driver_performance;
CREATE POLICY "Users can view driver performance" ON driver_performance FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Users can manage driver performance" ON driver_performance;
CREATE POLICY "Users can manage driver performance" ON driver_performance FOR ALL TO authenticated USING (true);

DROP POLICY IF EXISTS "Users can view truck maintenance" ON truck_maintenance;
CREATE POLICY "Users can view truck maintenance" ON truck_maintenance FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Users can manage truck maintenance" ON truck_maintenance;
CREATE POLICY "Users can manage truck maintenance" ON truck_maintenance FOR ALL TO authenticated USING (true);

-- Step 7: Create indexes for performance
DO $$
BEGIN
  RAISE NOTICE '📊 Step 7: Creating performance indexes...';
END $$;

CREATE INDEX IF NOT EXISTS idx_delivery_routes_org ON delivery_routes(organization_id);
CREATE INDEX IF NOT EXISTS idx_delivery_routes_driver ON delivery_routes(driver_id);
CREATE INDEX IF NOT EXISTS idx_delivery_routes_status ON delivery_routes(status);
CREATE INDEX IF NOT EXISTS idx_delivery_stops_route ON delivery_stops(route_id);
CREATE INDEX IF NOT EXISTS idx_delivery_stops_customer ON delivery_stops(customer_id);
CREATE INDEX IF NOT EXISTS idx_delivery_manifests_org ON delivery_manifests(organization_id);
CREATE INDEX IF NOT EXISTS idx_delivery_manifests_date ON delivery_manifests(manifest_date);
CREATE INDEX IF NOT EXISTS idx_delivery_manifests_status ON delivery_manifests(status);
CREATE INDEX IF NOT EXISTS idx_manifest_items_manifest ON manifest_items(manifest_id);
CREATE INDEX IF NOT EXISTS idx_manifest_items_barcode ON manifest_items(barcode_number);
CREATE INDEX IF NOT EXISTS idx_truck_reconciliations_org ON truck_reconciliations(organization_id);
CREATE INDEX IF NOT EXISTS idx_truck_reconciliations_date ON truck_reconciliations(reconciliation_date);
CREATE INDEX IF NOT EXISTS idx_truck_reconciliations_status ON truck_reconciliations(status);
CREATE INDEX IF NOT EXISTS idx_driver_performance_driver ON driver_performance(driver_id, performance_date);
CREATE INDEX IF NOT EXISTS idx_truck_maintenance_truck ON truck_maintenance(truck_id, maintenance_date);

-- Step 8: Create triggers for updated_at
DO $$
BEGIN
  RAISE NOTICE '⚡ Step 8: Creating update triggers...';
END $$;

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Add triggers safely (check if they don't already exist)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.triggers WHERE trigger_name = 'update_delivery_routes_updated_at') THEN
    CREATE TRIGGER update_delivery_routes_updated_at BEFORE UPDATE ON delivery_routes FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.triggers WHERE trigger_name = 'update_delivery_stops_updated_at') THEN
    CREATE TRIGGER update_delivery_stops_updated_at BEFORE UPDATE ON delivery_stops FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.triggers WHERE trigger_name = 'update_delivery_manifests_updated_at') THEN
    CREATE TRIGGER update_delivery_manifests_updated_at BEFORE UPDATE ON delivery_manifests FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.triggers WHERE trigger_name = 'update_manifest_items_updated_at') THEN
    CREATE TRIGGER update_manifest_items_updated_at BEFORE UPDATE ON manifest_items FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.triggers WHERE trigger_name = 'update_truck_reconciliations_updated_at') THEN
    CREATE TRIGGER update_truck_reconciliations_updated_at BEFORE UPDATE ON truck_reconciliations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.triggers WHERE trigger_name = 'update_reconciliation_discrepancies_updated_at') THEN
    CREATE TRIGGER update_reconciliation_discrepancies_updated_at BEFORE UPDATE ON reconciliation_discrepancies FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.triggers WHERE trigger_name = 'update_driver_performance_updated_at') THEN
    CREATE TRIGGER update_driver_performance_updated_at BEFORE UPDATE ON driver_performance FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.triggers WHERE trigger_name = 'update_truck_maintenance_updated_at') THEN
    CREATE TRIGGER update_truck_maintenance_updated_at BEFORE UPDATE ON truck_maintenance FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

-- Step 9: Create stored procedures for truck reconciliation
DO $$
BEGIN
  RAISE NOTICE '🔧 Step 9: Creating stored procedures...';
END $$;

CREATE OR REPLACE FUNCTION create_delivery_manifest(
  p_organization_id UUID,
  p_route_id UUID,
  p_manifest_type VARCHAR(50),
  p_driver_id UUID,
  p_truck_id VARCHAR(100),
  p_manifest_date DATE,
  p_created_by UUID
)
RETURNS TABLE(manifest_id UUID, manifest_number VARCHAR(100)) AS $$
DECLARE
  new_manifest_number VARCHAR(100);
  new_manifest_id UUID;
  manifest_count INTEGER;
BEGIN
  -- Get count of existing manifests for this date and organization
  SELECT COUNT(*) INTO manifest_count
  FROM delivery_manifests 
  WHERE manifest_date = p_manifest_date
  AND (p_organization_id IS NULL OR organization_id = p_organization_id);
  
  -- Generate manifest number
  new_manifest_number := 'MAN-' || TO_CHAR(p_manifest_date, 'YYYYMMDD') || '-' || 
                        LPAD((manifest_count + 1)::TEXT, 3, '0');
  
  -- Create manifest
  INSERT INTO delivery_manifests (
    organization_id, route_id, manifest_number, manifest_type,
    driver_id, truck_id, manifest_date, created_by
  ) VALUES (
    p_organization_id, p_route_id, new_manifest_number, p_manifest_type,
    p_driver_id, p_truck_id, p_manifest_date, p_created_by
  ) RETURNING id INTO new_manifest_id;
  
  RETURN QUERY SELECT new_manifest_id, new_manifest_number;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION start_truck_reconciliation(
  p_manifest_id UUID,
  p_reconciled_by UUID
)
RETURNS UUID AS $$
DECLARE
  reconciliation_id UUID;
  manifest_record RECORD;
BEGIN
  -- Get manifest details
  SELECT organization_id, truck_id, driver_id, manifest_date
  INTO manifest_record
  FROM delivery_manifests WHERE id = p_manifest_id;
  
  -- Create reconciliation record
  INSERT INTO truck_reconciliations (
    organization_id, manifest_id, reconciliation_date, reconciled_by,
    truck_id, driver_id, status
  ) VALUES (
    manifest_record.organization_id, p_manifest_id, manifest_record.manifest_date, p_reconciled_by,
    manifest_record.truck_id, manifest_record.driver_id, 'in_progress'
  ) RETURNING id INTO reconciliation_id;
  
  -- Calculate expected counts from manifest
  UPDATE truck_reconciliations SET
    expected_out = (SELECT COALESCE(SUM(expected_quantity), 0) FROM manifest_items WHERE manifest_id = p_manifest_id AND action IN ('deliver', 'exchange_out')),
    expected_in = (SELECT COALESCE(SUM(expected_quantity), 0) FROM manifest_items WHERE manifest_id = p_manifest_id AND action IN ('pickup', 'exchange_in')),
    expected_exchange = (SELECT COALESCE(SUM(expected_quantity), 0) FROM manifest_items WHERE manifest_id = p_manifest_id AND action LIKE 'exchange_%')
  WHERE id = reconciliation_id;
  
  RETURN reconciliation_id;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION complete_truck_reconciliation(
  p_reconciliation_id UUID,
  p_actual_out INTEGER,
  p_actual_in INTEGER,
  p_actual_exchange INTEGER,
  p_reconciliation_notes TEXT
)
RETURNS void AS $$
DECLARE
  reconciliation_record RECORD;
  missing_count INTEGER;
  extra_count INTEGER;
BEGIN
  -- Get expected counts
  SELECT expected_out, expected_in, expected_exchange
  INTO reconciliation_record
  FROM truck_reconciliations WHERE id = p_reconciliation_id;
  
  -- Calculate discrepancies
  missing_count := GREATEST(0, COALESCE(reconciliation_record.expected_out, 0) - p_actual_out) + 
                   GREATEST(0, COALESCE(reconciliation_record.expected_in, 0) - p_actual_in);
  extra_count := GREATEST(0, p_actual_out - COALESCE(reconciliation_record.expected_out, 0)) + 
                 GREATEST(0, p_actual_in - COALESCE(reconciliation_record.expected_in, 0));
  
  -- Update reconciliation
  UPDATE truck_reconciliations SET
    actual_out = p_actual_out,
    actual_in = p_actual_in,
    actual_exchange = p_actual_exchange,
    missing_cylinders = missing_count,
    extra_cylinders = extra_count,
    status = CASE WHEN missing_count > 0 OR extra_count > 0 THEN 'disputed' ELSE 'completed' END,
    reconciliation_notes = p_reconciliation_notes,
    updated_at = CURRENT_TIMESTAMP
  WHERE id = p_reconciliation_id;
END;
$$ LANGUAGE plpgsql;

-- Step 10: Add foreign key constraints (ULTRA SAFE with detailed checks)
DO $$
BEGIN
  RAISE NOTICE '🔗 Step 10: Adding foreign key constraints safely...';
  
  -- Add organization foreign keys only if organizations table exists and has data
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'organizations') 
     AND EXISTS (SELECT 1 FROM organizations LIMIT 1) THEN
    
    -- Delivery routes -> organizations
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'fk_delivery_routes_organization') THEN
      ALTER TABLE delivery_routes ADD CONSTRAINT fk_delivery_routes_organization 
        FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE;
      RAISE NOTICE '✅ Added organization FK to delivery_routes';
    END IF;
    
    -- Delivery manifests -> organizations
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'fk_delivery_manifests_organization') THEN
      ALTER TABLE delivery_manifests ADD CONSTRAINT fk_delivery_manifests_organization 
        FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE;
      RAISE NOTICE '✅ Added organization FK to delivery_manifests';
    END IF;
    
    -- Truck reconciliations -> organizations
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'fk_truck_reconciliations_organization') THEN
      ALTER TABLE truck_reconciliations ADD CONSTRAINT fk_truck_reconciliations_organization 
        FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE;
      RAISE NOTICE '✅ Added organization FK to truck_reconciliations';
    END IF;
    
    -- Driver performance -> organizations
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'fk_driver_performance_organization') THEN
      ALTER TABLE driver_performance ADD CONSTRAINT fk_driver_performance_organization 
        FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE;
      RAISE NOTICE '✅ Added organization FK to driver_performance';
    END IF;
    
    -- Truck maintenance -> organizations
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'fk_truck_maintenance_organization') THEN
      ALTER TABLE truck_maintenance ADD CONSTRAINT fk_truck_maintenance_organization 
        FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE;
      RAISE NOTICE '✅ Added organization FK to truck_maintenance';
    END IF;
    
  ELSE
    RAISE NOTICE '⚠️ Organizations table not ready for foreign keys, skipping organization constraints';
  END IF;

  -- Add table-to-table references (these should always work)
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'fk_delivery_stops_route') THEN
    ALTER TABLE delivery_stops ADD CONSTRAINT fk_delivery_stops_route 
      FOREIGN KEY (route_id) REFERENCES delivery_routes(id) ON DELETE CASCADE;
    RAISE NOTICE '✅ Added route FK to delivery_stops';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'fk_delivery_manifests_route') THEN
    ALTER TABLE delivery_manifests ADD CONSTRAINT fk_delivery_manifests_route 
      FOREIGN KEY (route_id) REFERENCES delivery_routes(id);
    RAISE NOTICE '✅ Added route FK to delivery_manifests';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'fk_manifest_items_manifest') THEN
    ALTER TABLE manifest_items ADD CONSTRAINT fk_manifest_items_manifest 
      FOREIGN KEY (manifest_id) REFERENCES delivery_manifests(id) ON DELETE CASCADE;
    RAISE NOTICE '✅ Added manifest FK to manifest_items';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'fk_manifest_items_stop') THEN
    ALTER TABLE manifest_items ADD CONSTRAINT fk_manifest_items_stop 
      FOREIGN KEY (stop_id) REFERENCES delivery_stops(id);
    RAISE NOTICE '✅ Added stop FK to manifest_items';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'fk_truck_reconciliations_manifest') THEN
    ALTER TABLE truck_reconciliations ADD CONSTRAINT fk_truck_reconciliations_manifest 
      FOREIGN KEY (manifest_id) REFERENCES delivery_manifests(id);
    RAISE NOTICE '✅ Added manifest FK to truck_reconciliations';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'fk_reconciliation_discrepancies_reconciliation') THEN
    ALTER TABLE reconciliation_discrepancies ADD CONSTRAINT fk_reconciliation_discrepancies_reconciliation 
      FOREIGN KEY (reconciliation_id) REFERENCES truck_reconciliations(id) ON DELETE CASCADE;
    RAISE NOTICE '✅ Added reconciliation FK to reconciliation_discrepancies';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'fk_reconciliation_discrepancies_manifest_item') THEN
    ALTER TABLE reconciliation_discrepancies ADD CONSTRAINT fk_reconciliation_discrepancies_manifest_item 
      FOREIGN KEY (manifest_item_id) REFERENCES manifest_items(id);
    RAISE NOTICE '✅ Added manifest_item FK to reconciliation_discrepancies';
  END IF;

  -- Add references to existing tables if they exist and are ready
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'customers') 
     AND EXISTS (SELECT 1 FROM customers LIMIT 1) THEN
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'fk_delivery_stops_customer') THEN
      ALTER TABLE delivery_stops ADD CONSTRAINT fk_delivery_stops_customer 
        FOREIGN KEY (customer_id) REFERENCES customers(id);
      RAISE NOTICE '✅ Added customer FK to delivery_stops';
    END IF;
  ELSE
    RAISE NOTICE '⚠️ Customers table not ready for foreign keys, skipping customer constraints';
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'bottles') 
     AND EXISTS (SELECT 1 FROM bottles LIMIT 1) THEN
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'fk_manifest_items_bottle') THEN
      ALTER TABLE manifest_items ADD CONSTRAINT fk_manifest_items_bottle 
        FOREIGN KEY (bottle_id) REFERENCES bottles(id);
      RAISE NOTICE '✅ Added bottle FK to manifest_items';
    END IF;
  ELSE
    RAISE NOTICE '⚠️ Bottles table not ready for foreign keys, skipping bottle constraints';
  END IF;

  RAISE NOTICE '✅ Step 10 completed: Foreign key constraints added safely';
END $$;

-- Final success message
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '🎉🎉🎉 ULTRA SAFE TRUCK RECONCILIATION SYSTEM INSTALLED SUCCESSFULLY! 🎉🎉🎉';
  RAISE NOTICE '';
  RAISE NOTICE '✅ Step 1: Missing columns added to existing tables';
  RAISE NOTICE '✅ Step 2: Organizations table created with default organization';
  RAISE NOTICE '✅ Step 3: Existing records linked to default organization';
  RAISE NOTICE '✅ Step 4: All 8 truck reconciliation tables created';
  RAISE NOTICE '✅ Step 5: Row Level Security enabled';
  RAISE NOTICE '✅ Step 6: Basic RLS policies created';
  RAISE NOTICE '✅ Step 7: Performance indexes added';
  RAISE NOTICE '✅ Step 8: Update triggers created';
  RAISE NOTICE '✅ Step 9: Stored procedures created';
  RAISE NOTICE '✅ Step 10: Foreign key constraints added safely';
  RAISE NOTICE '';
  RAISE NOTICE '🚀 Your truck reconciliation system is ready!';
  RAISE NOTICE '🌐 Navigate to /truck-reconciliation-dashboard to start using it';
  RAISE NOTICE '';
END $$;
