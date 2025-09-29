-- AUTOMATED DAILY BACKUP SYSTEM FOR ALL ORGANIZATIONS
-- This creates a complete automated backup infrastructure

-- 1. Create backup storage table
CREATE TABLE IF NOT EXISTS organization_backups (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  backup_date DATE NOT NULL DEFAULT CURRENT_DATE,
  backup_type TEXT NOT NULL DEFAULT 'daily',
  backup_status TEXT NOT NULL DEFAULT 'pending', -- pending, completed, failed
  customers_count INTEGER DEFAULT 0,
  bottles_count INTEGER DEFAULT 0,
  backup_size_mb DECIMAL(10,2) DEFAULT 0,
  backup_data JSONB,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,
  UNIQUE(organization_id, backup_date, backup_type)
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_org_backups_org_date ON organization_backups(organization_id, backup_date DESC);
CREATE INDEX IF NOT EXISTS idx_org_backups_status ON organization_backups(backup_status);

-- 2. Create automated backup function for single organization
CREATE OR REPLACE FUNCTION create_organization_backup(org_id UUID, backup_type_param TEXT DEFAULT 'daily')
RETURNS JSON AS $$
DECLARE
  backup_record RECORD;
  customers_data JSONB;
  bottles_data JSONB;
  backup_id UUID;
  customers_count INTEGER := 0;
  bottles_count INTEGER := 0;
  backup_size DECIMAL(10,2) := 0;
  org_name TEXT;
  result JSON;
BEGIN
  -- Get organization name
  SELECT name INTO org_name FROM organizations WHERE id = org_id;
  
  IF org_name IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Organization not found: ' || org_id
    );
  END IF;
  
  -- Check if backup already exists for today
  IF EXISTS (
    SELECT 1 FROM organization_backups 
    WHERE organization_id = org_id 
      AND backup_date = CURRENT_DATE 
      AND backup_type = backup_type_param
  ) THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Backup already exists for today',
      'organization', org_name
    );
  END IF;
  
  -- Create backup record
  INSERT INTO organization_backups (
    organization_id, 
    backup_date, 
    backup_type, 
    backup_status
  ) 
  VALUES (org_id, CURRENT_DATE, backup_type_param, 'pending')
  RETURNING id INTO backup_id;
  
  BEGIN
    -- Export customers data
    SELECT json_agg(
      json_build_object(
        'id', c.id,
        'CustomerListID', c."CustomerListID",
        'name', c.name,
        'contact_details', c.contact_details,
        'phone', c.phone,
        'address2', c.address2,
        'address3', c.address3,
        'address4', c.address4,
        'address5', c.address5,
        'city', c.city,
        'postal_code', c.postal_code,
        'barcode', c.barcode,
        'customer_type', c.customer_type,
        'created_at', c.created_at
      )
    )
    INTO customers_data
    FROM customers c
    WHERE c.organization_id = org_id;
    
    GET DIAGNOSTICS customers_count = ROW_COUNT;
    
    -- Export bottles data
    SELECT json_agg(
      json_build_object(
        'id', b.id,
        'serial_number', b.serial_number,
        'type', b.type,
        'description', b.description,
        'size', b.size,
        'status', b.status,
        'assigned_customer', b.assigned_customer,
        'location', b.location,
        'last_inspection', b.last_inspection,
        'next_inspection', b.next_inspection,
        'created_at', b.created_at
      )
    )
    INTO bottles_data
    FROM bottles b
    WHERE b.organization_id = org_id;
    
    GET DIAGNOSTICS bottles_count = ROW_COUNT;
    
    -- Calculate approximate backup size (in MB)
    backup_size := (
      COALESCE(pg_column_size(customers_data), 0) + 
      COALESCE(pg_column_size(bottles_data), 0)
    ) / (1024.0 * 1024.0);
    
    -- Update backup record with data
    UPDATE organization_backups SET
      backup_data = json_build_object(
        'organization_id', org_id,
        'organization_name', org_name,
        'backup_timestamp', NOW(),
        'customers', COALESCE(customers_data, '[]'::json),
        'bottles', COALESCE(bottles_data, '[]'::json),
        'metadata', json_build_object(
          'customers_count', customers_count,
          'bottles_count', bottles_count,
          'backup_type', backup_type_param,
          'version', '1.0'
        )
      ),
      customers_count = customers_count,
      bottles_count = bottles_count,
      backup_size_mb = backup_size,
      backup_status = 'completed',
      completed_at = NOW()
    WHERE id = backup_id;
    
    result := json_build_object(
      'success', true,
      'backup_id', backup_id,
      'organization', org_name,
      'customers_count', customers_count,
      'bottles_count', bottles_count,
      'backup_size_mb', backup_size,
      'backup_date', CURRENT_DATE
    );
    
  EXCEPTION WHEN OTHERS THEN
    -- Update backup record with error
    UPDATE organization_backups SET
      backup_status = 'failed',
      error_message = SQLERRM,
      completed_at = NOW()
    WHERE id = backup_id;
    
    result := json_build_object(
      'success', false,
      'error', SQLERRM,
      'organization', org_name
    );
  END;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Create function to backup ALL organizations
CREATE OR REPLACE FUNCTION backup_all_organizations()
RETURNS JSON AS $$
DECLARE
  org_record RECORD;
  backup_result JSON;
  results JSON[] := '{}';
  total_orgs INTEGER := 0;
  successful_backups INTEGER := 0;
  failed_backups INTEGER := 0;
BEGIN
  -- Loop through all organizations
  FOR org_record IN 
    SELECT id, name FROM organizations ORDER BY name
  LOOP
    total_orgs := total_orgs + 1;
    
    -- Create backup for this organization
    SELECT create_organization_backup(org_record.id) INTO backup_result;
    
    -- Track results
    IF (backup_result->>'success')::boolean THEN
      successful_backups := successful_backups + 1;
    ELSE
      failed_backups := failed_backups + 1;
    END IF;
    
    -- Add to results array
    results := array_append(results, backup_result);
  END LOOP;
  
  RETURN json_build_object(
    'summary', json_build_object(
      'total_organizations', total_orgs,
      'successful_backups', successful_backups,
      'failed_backups', failed_backups,
      'backup_date', CURRENT_DATE,
      'completed_at', NOW()
    ),
    'results', array_to_json(results)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Create backup cleanup function (keep last 30 days)
CREATE OR REPLACE FUNCTION cleanup_old_backups(days_to_keep INTEGER DEFAULT 30)
RETURNS JSON AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM organization_backups 
  WHERE backup_date < CURRENT_DATE - INTERVAL '1 day' * days_to_keep;
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  
  RETURN json_build_object(
    'success', true,
    'deleted_backups', deleted_count,
    'kept_days', days_to_keep,
    'cleanup_date', NOW()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
