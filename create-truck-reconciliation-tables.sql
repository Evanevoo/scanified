-- =============================================
-- Truck Reconciliation & Manifest System
-- Advanced delivery and logistics management
-- =============================================

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
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(organization_id, route_code)
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
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(organization_id, manifest_number)
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
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(organization_id, driver_id, performance_date)
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

-- Enable Row Level Security
ALTER TABLE delivery_routes ENABLE ROW LEVEL SECURITY;
ALTER TABLE delivery_stops ENABLE ROW LEVEL SECURITY;
ALTER TABLE delivery_manifests ENABLE ROW LEVEL SECURITY;
ALTER TABLE manifest_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE truck_reconciliations ENABLE ROW LEVEL SECURITY;
ALTER TABLE reconciliation_discrepancies ENABLE ROW LEVEL SECURITY;
ALTER TABLE driver_performance ENABLE ROW LEVEL SECURITY;
ALTER TABLE truck_maintenance ENABLE ROW LEVEL SECURITY;

-- Create RLS Policies
-- Delivery Routes
DROP POLICY IF EXISTS "Users can view delivery routes" ON delivery_routes;
CREATE POLICY "Users can view delivery routes" ON delivery_routes FOR SELECT TO authenticated USING (
  organization_id IN (
    SELECT organization_id FROM profiles WHERE id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Managers can manage delivery routes" ON delivery_routes;
CREATE POLICY "Managers can manage delivery routes" ON delivery_routes FOR ALL TO authenticated USING (
  organization_id IN (
    SELECT p.organization_id FROM profiles p 
    JOIN roles r ON p.role_id = r.id 
    WHERE p.id = auth.uid() AND r.name IN ('admin', 'manager', 'owner')
  )
);

-- Delivery Stops
DROP POLICY IF EXISTS "Users can view delivery stops" ON delivery_stops;
CREATE POLICY "Users can view delivery stops" ON delivery_stops FOR SELECT TO authenticated USING (
  route_id IN (
    SELECT id FROM delivery_routes WHERE organization_id IN (
      SELECT organization_id FROM profiles WHERE id = auth.uid()
    )
  )
);

DROP POLICY IF EXISTS "Drivers can update delivery stops" ON delivery_stops;
CREATE POLICY "Drivers can update delivery stops" ON delivery_stops FOR UPDATE TO authenticated USING (
  route_id IN (
    SELECT id FROM delivery_routes WHERE driver_id = auth.uid() OR organization_id IN (
      SELECT p.organization_id FROM profiles p 
      JOIN roles r ON p.role_id = r.id 
      WHERE p.id = auth.uid() AND r.name IN ('admin', 'manager', 'owner')
    )
  )
);

-- Delivery Manifests
DROP POLICY IF EXISTS "Users can view delivery manifests" ON delivery_manifests;
CREATE POLICY "Users can view delivery manifests" ON delivery_manifests FOR SELECT TO authenticated USING (
  organization_id IN (
    SELECT organization_id FROM profiles WHERE id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Managers can manage delivery manifests" ON delivery_manifests;
CREATE POLICY "Managers can manage delivery manifests" ON delivery_manifests FOR ALL TO authenticated USING (
  organization_id IN (
    SELECT p.organization_id FROM profiles p 
    JOIN roles r ON p.role_id = r.id 
    WHERE p.id = auth.uid() AND r.name IN ('admin', 'manager', 'owner')
  )
);

-- Manifest Items
DROP POLICY IF EXISTS "Users can view manifest items" ON manifest_items;
CREATE POLICY "Users can view manifest items" ON manifest_items FOR SELECT TO authenticated USING (
  manifest_id IN (
    SELECT id FROM delivery_manifests WHERE organization_id IN (
      SELECT organization_id FROM profiles WHERE id = auth.uid()
    )
  )
);

DROP POLICY IF EXISTS "Drivers can update manifest items" ON manifest_items;
CREATE POLICY "Drivers can update manifest items" ON manifest_items FOR UPDATE TO authenticated USING (
  manifest_id IN (
    SELECT id FROM delivery_manifests WHERE driver_id = auth.uid() OR organization_id IN (
      SELECT p.organization_id FROM profiles p 
      JOIN roles r ON p.role_id = r.id 
      WHERE p.id = auth.uid() AND r.name IN ('admin', 'manager', 'owner')
    )
  )
);

-- Truck Reconciliations
DROP POLICY IF EXISTS "Users can view truck reconciliations" ON truck_reconciliations;
CREATE POLICY "Users can view truck reconciliations" ON truck_reconciliations FOR SELECT TO authenticated USING (
  organization_id IN (
    SELECT organization_id FROM profiles WHERE id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Managers can manage truck reconciliations" ON truck_reconciliations;
CREATE POLICY "Managers can manage truck reconciliations" ON truck_reconciliations FOR ALL TO authenticated USING (
  organization_id IN (
    SELECT p.organization_id FROM profiles p 
    JOIN roles r ON p.role_id = r.id 
    WHERE p.id = auth.uid() AND r.name IN ('admin', 'manager', 'owner')
  )
);

-- Similar policies for other tables...
DROP POLICY IF EXISTS "Users can view reconciliation discrepancies" ON reconciliation_discrepancies;
CREATE POLICY "Users can view reconciliation discrepancies" ON reconciliation_discrepancies FOR SELECT TO authenticated USING (
  reconciliation_id IN (
    SELECT id FROM truck_reconciliations WHERE organization_id IN (
      SELECT organization_id FROM profiles WHERE id = auth.uid()
    )
  )
);

DROP POLICY IF EXISTS "Users can view driver performance" ON driver_performance;
CREATE POLICY "Users can view driver performance" ON driver_performance FOR SELECT TO authenticated USING (
  organization_id IN (
    SELECT organization_id FROM profiles WHERE id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Users can view truck maintenance" ON truck_maintenance;
CREATE POLICY "Users can view truck maintenance" ON truck_maintenance FOR SELECT TO authenticated USING (
  organization_id IN (
    SELECT organization_id FROM profiles WHERE id = auth.uid()
  )
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_delivery_routes_org ON delivery_routes(organization_id);
CREATE INDEX IF NOT EXISTS idx_delivery_routes_driver ON delivery_routes(driver_id);
CREATE INDEX IF NOT EXISTS idx_delivery_stops_route ON delivery_stops(route_id);
CREATE INDEX IF NOT EXISTS idx_delivery_manifests_org ON delivery_manifests(organization_id);
CREATE INDEX IF NOT EXISTS idx_delivery_manifests_date ON delivery_manifests(manifest_date);
CREATE INDEX IF NOT EXISTS idx_manifest_items_manifest ON manifest_items(manifest_id);
CREATE INDEX IF NOT EXISTS idx_truck_reconciliations_org ON truck_reconciliations(organization_id);
CREATE INDEX IF NOT EXISTS idx_truck_reconciliations_date ON truck_reconciliations(reconciliation_date);
CREATE INDEX IF NOT EXISTS idx_driver_performance_driver ON driver_performance(driver_id, performance_date);
CREATE INDEX IF NOT EXISTS idx_truck_maintenance_truck ON truck_maintenance(truck_id, maintenance_date);

-- Create triggers for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Add triggers
CREATE TRIGGER update_delivery_routes_updated_at BEFORE UPDATE ON delivery_routes FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_delivery_stops_updated_at BEFORE UPDATE ON delivery_stops FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_delivery_manifests_updated_at BEFORE UPDATE ON delivery_manifests FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_manifest_items_updated_at BEFORE UPDATE ON manifest_items FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_truck_reconciliations_updated_at BEFORE UPDATE ON truck_reconciliations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_reconciliation_discrepancies_updated_at BEFORE UPDATE ON reconciliation_discrepancies FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_driver_performance_updated_at BEFORE UPDATE ON driver_performance FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_truck_maintenance_updated_at BEFORE UPDATE ON truck_maintenance FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create stored procedures for truck reconciliation
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
BEGIN
  -- Generate manifest number
  new_manifest_number := 'MAN-' || TO_CHAR(p_manifest_date, 'YYYYMMDD') || '-' || 
                        LPAD((SELECT COUNT(*) + 1 FROM delivery_manifests 
                              WHERE organization_id = p_organization_id 
                              AND manifest_date = p_manifest_date)::TEXT, 3, '0');
  
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
  manifest_org_id UUID;
  manifest_truck_id VARCHAR(100);
  manifest_driver_id UUID;
  manifest_date DATE;
BEGIN
  -- Get manifest details
  SELECT organization_id, truck_id, driver_id, manifest_date
  INTO manifest_org_id, manifest_truck_id, manifest_driver_id, manifest_date
  FROM delivery_manifests WHERE id = p_manifest_id;
  
  -- Create reconciliation record
  INSERT INTO truck_reconciliations (
    organization_id, manifest_id, reconciliation_date, reconciled_by,
    truck_id, driver_id, status
  ) VALUES (
    manifest_org_id, p_manifest_id, manifest_date, p_reconciled_by,
    manifest_truck_id, manifest_driver_id, 'in_progress'
  ) RETURNING id INTO reconciliation_id;
  
  -- Calculate expected counts from manifest
  UPDATE truck_reconciliations SET
    expected_out = (SELECT COUNT(*) FROM manifest_items WHERE manifest_id = p_manifest_id AND action IN ('deliver', 'exchange_out')),
    expected_in = (SELECT COUNT(*) FROM manifest_items WHERE manifest_id = p_manifest_id AND action IN ('pickup', 'exchange_in')),
    expected_exchange = (SELECT COUNT(*) FROM manifest_items WHERE manifest_id = p_manifest_id AND action LIKE 'exchange_%')
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
  expected_out INTEGER;
  expected_in INTEGER;
  expected_exchange INTEGER;
  missing_count INTEGER;
  extra_count INTEGER;
BEGIN
  -- Get expected counts
  SELECT truck_reconciliations.expected_out, truck_reconciliations.expected_in, truck_reconciliations.expected_exchange
  INTO expected_out, expected_in, expected_exchange
  FROM truck_reconciliations WHERE id = p_reconciliation_id;
  
  -- Calculate discrepancies
  missing_count := GREATEST(0, expected_out - p_actual_out) + GREATEST(0, expected_in - p_actual_in);
  extra_count := GREATEST(0, p_actual_out - expected_out) + GREATEST(0, p_actual_in - expected_in);
  
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

-- Add foreign key constraints after tables are created
DO $$
BEGIN
  -- Add foreign key constraints if tables exist
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'organizations') THEN
    ALTER TABLE delivery_routes ADD CONSTRAINT fk_delivery_routes_organization 
      FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE;
    ALTER TABLE delivery_manifests ADD CONSTRAINT fk_delivery_manifests_organization 
      FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE;
    ALTER TABLE truck_reconciliations ADD CONSTRAINT fk_truck_reconciliations_organization 
      FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE;
    ALTER TABLE driver_performance ADD CONSTRAINT fk_driver_performance_organization 
      FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE;
    ALTER TABLE truck_maintenance ADD CONSTRAINT fk_truck_maintenance_organization 
      FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE;
  END IF;

  -- Add other foreign key constraints if referenced tables exist
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'profiles') THEN
    ALTER TABLE delivery_routes ADD CONSTRAINT fk_delivery_routes_driver 
      FOREIGN KEY (driver_id) REFERENCES profiles(id);
    ALTER TABLE delivery_manifests ADD CONSTRAINT fk_delivery_manifests_driver 
      FOREIGN KEY (driver_id) REFERENCES profiles(id);
    ALTER TABLE delivery_manifests ADD CONSTRAINT fk_delivery_manifests_created_by 
      FOREIGN KEY (created_by) REFERENCES profiles(id);
    ALTER TABLE truck_reconciliations ADD CONSTRAINT fk_truck_reconciliations_reconciled_by 
      FOREIGN KEY (reconciled_by) REFERENCES profiles(id);
    ALTER TABLE truck_reconciliations ADD CONSTRAINT fk_truck_reconciliations_driver 
      FOREIGN KEY (driver_id) REFERENCES profiles(id);
    ALTER TABLE driver_performance ADD CONSTRAINT fk_driver_performance_driver 
      FOREIGN KEY (driver_id) REFERENCES profiles(id);
    ALTER TABLE truck_maintenance ADD CONSTRAINT fk_truck_maintenance_created_by 
      FOREIGN KEY (created_by) REFERENCES profiles(id);
    ALTER TABLE manifest_items ADD CONSTRAINT fk_manifest_items_scanned_by 
      FOREIGN KEY (scanned_by) REFERENCES profiles(id);
    ALTER TABLE reconciliation_discrepancies ADD CONSTRAINT fk_reconciliation_discrepancies_resolved_by 
      FOREIGN KEY (resolved_by) REFERENCES profiles(id);
  END IF;

  -- Add table-to-table references
  ALTER TABLE delivery_stops ADD CONSTRAINT fk_delivery_stops_route 
    FOREIGN KEY (route_id) REFERENCES delivery_routes(id) ON DELETE CASCADE;
  ALTER TABLE delivery_manifests ADD CONSTRAINT fk_delivery_manifests_route 
    FOREIGN KEY (route_id) REFERENCES delivery_routes(id);
  ALTER TABLE manifest_items ADD CONSTRAINT fk_manifest_items_manifest 
    FOREIGN KEY (manifest_id) REFERENCES delivery_manifests(id) ON DELETE CASCADE;
  ALTER TABLE manifest_items ADD CONSTRAINT fk_manifest_items_stop 
    FOREIGN KEY (stop_id) REFERENCES delivery_stops(id);
  ALTER TABLE truck_reconciliations ADD CONSTRAINT fk_truck_reconciliations_manifest 
    FOREIGN KEY (manifest_id) REFERENCES delivery_manifests(id);
  ALTER TABLE reconciliation_discrepancies ADD CONSTRAINT fk_reconciliation_discrepancies_reconciliation 
    FOREIGN KEY (reconciliation_id) REFERENCES truck_reconciliations(id) ON DELETE CASCADE;
  ALTER TABLE reconciliation_discrepancies ADD CONSTRAINT fk_reconciliation_discrepancies_manifest_item 
    FOREIGN KEY (manifest_item_id) REFERENCES manifest_items(id);

  -- Add references to other tables if they exist
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'customers') THEN
    ALTER TABLE delivery_stops ADD CONSTRAINT fk_delivery_stops_customer 
      FOREIGN KEY (customer_id) REFERENCES customers(id);
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'bottles') THEN
    ALTER TABLE manifest_items ADD CONSTRAINT fk_manifest_items_bottle 
      FOREIGN KEY (bottle_id) REFERENCES bottles(id);
  END IF;

  RAISE NOTICE 'Truck reconciliation tables created successfully with foreign key constraints.';
EXCEPTION 
  WHEN OTHERS THEN
    RAISE NOTICE 'Some foreign key constraints could not be added. Tables created successfully. Error: %', SQLERRM;
END $$;
