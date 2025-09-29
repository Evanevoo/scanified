-- ORGANIZATION-SPECIFIC BACKUP AND RESTORE SYSTEM
-- This creates a complete backup/restore system for each organization

-- 1. Create organization backup function
CREATE OR REPLACE FUNCTION backup_organization_data(org_id UUID)
RETURNS TABLE(
  backup_type TEXT,
  table_name TEXT,
  record_count BIGINT,
  backup_timestamp TIMESTAMP,
  organization_name TEXT
) AS $$
DECLARE
  org_name TEXT;
BEGIN
  -- Get organization name
  SELECT name INTO org_name FROM organizations WHERE id = org_id;
  
  IF org_name IS NULL THEN
    RAISE EXCEPTION 'Organization not found: %', org_id;
  END IF;
  
  -- Return backup summary
  RETURN QUERY
  SELECT 
    'BACKUP_SUMMARY'::TEXT,
    'customers'::TEXT,
    COUNT(*)::BIGINT,
    CURRENT_TIMESTAMP,
    org_name
  FROM customers WHERE organization_id = org_id
  
  UNION ALL
  
  SELECT 
    'BACKUP_SUMMARY'::TEXT,
    'bottles'::TEXT,
    COUNT(*)::BIGINT,
    CURRENT_TIMESTAMP,
    org_name
  FROM bottles WHERE organization_id = org_id
  
  UNION ALL
  
  SELECT 
    'BACKUP_SUMMARY'::TEXT,
    'profiles'::TEXT,
    COUNT(*)::BIGINT,
    CURRENT_TIMESTAMP,
    org_name
  FROM profiles WHERE organization_id = org_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Create organization data export function (for CSV backup)
CREATE OR REPLACE FUNCTION export_organization_customers(org_id UUID)
RETURNS TABLE(
  customer_id TEXT,
  customer_list_id TEXT,
  name TEXT,
  contact_details TEXT,
  phone TEXT,
  address2 TEXT,
  address3 TEXT,
  address4 TEXT,
  address5 TEXT,
  city TEXT,
  postal_code TEXT,
  barcode TEXT,
  customer_type TEXT,
  created_at TIMESTAMP,
  organization_name TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    c.id::TEXT,
    c."CustomerListID",
    c.name,
    c.contact_details,
    c.phone,
    c.address2,
    c.address3,
    c.address4,
    c.address5,
    c.city,
    c.postal_code,
    c.barcode,
    c.customer_type,
    c.created_at,
    o.name
  FROM customers c
  JOIN organizations o ON c.organization_id = o.id
  WHERE c.organization_id = org_id
  ORDER BY c.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Create organization bottles export function
CREATE OR REPLACE FUNCTION export_organization_bottles(org_id UUID)
RETURNS TABLE(
  bottle_id TEXT,
  serial_number TEXT,
  type TEXT,
  description TEXT,
  size TEXT,
  status TEXT,
  assigned_customer TEXT,
  location TEXT,
  last_inspection DATE,
  next_inspection DATE,
  created_at TIMESTAMP,
  organization_name TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    b.id::TEXT,
    b.serial_number,
    b.type,
    b.description,
    b.size,
    b.status,
    b.assigned_customer,
    b.location,
    b.last_inspection,
    b.next_inspection,
    b.created_at,
    o.name
  FROM bottles b
  JOIN organizations o ON b.organization_id = o.id
  WHERE b.organization_id = org_id
  ORDER BY b.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Create disaster recovery function
CREATE OR REPLACE FUNCTION restore_organization_customers(
  org_id UUID,
  backup_data JSONB
) RETURNS TEXT AS $$
DECLARE
  result_text TEXT;
  record_count INTEGER := 0;
  customer_record RECORD;
BEGIN
  -- Verify organization exists
  IF NOT EXISTS (SELECT 1 FROM organizations WHERE id = org_id) THEN
    RAISE EXCEPTION 'Organization not found: %', org_id;
  END IF;
  
  -- Clear existing customers for this organization
  DELETE FROM customers WHERE organization_id = org_id;
  
  -- Restore customers from backup data
  FOR customer_record IN 
    SELECT * FROM jsonb_to_recordset(backup_data) AS x(
      "CustomerListID" TEXT,
      name TEXT,
      contact_details TEXT,
      phone TEXT,
      address2 TEXT,
      address3 TEXT,
      address4 TEXT,
      address5 TEXT,
      city TEXT,
      postal_code TEXT,
      barcode TEXT,
      customer_type TEXT
    )
  LOOP
    INSERT INTO customers (
      "CustomerListID",
      name,
      contact_details,
      phone,
      address2,
      address3,
      address4,
      address5,
      city,
      postal_code,
      barcode,
      customer_type,
      organization_id
    ) VALUES (
      customer_record."CustomerListID",
      customer_record.name,
      customer_record.contact_details,
      customer_record.phone,
      customer_record.address2,
      customer_record.address3,
      customer_record.address4,
      customer_record.address5,
      customer_record.city,
      customer_record.postal_code,
      customer_record.barcode,
      customer_record.customer_type,
      org_id
    );
    record_count := record_count + 1;
  END LOOP;
  
  result_text := format('Restored %s customers for organization %s', record_count, org_id);
  RETURN result_text;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Example usage (replace with actual organization ID)
-- SELECT * FROM backup_organization_data('YOUR_ORG_ID');
-- SELECT * FROM export_organization_customers('YOUR_ORG_ID');
-- SELECT * FROM export_organization_bottles('YOUR_ORG_ID');
