-- BACKUP WELDCOR SUPPLIES SK DATA BEFORE CLEANUP
-- Organization ID: f98daa10-2884-49b9-a6a6-9725e27e7696
-- Run this BEFORE cleanup to save your test data

-- 1. Export all customers for backup
SELECT 
  'BACKUP_CUSTOMERS' as backup_type,
  c.id,
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
  o.name as organization_name
FROM customers c
JOIN organizations o ON c.organization_id = o.id
WHERE c.organization_id = 'f98daa10-2884-49b9-a6a6-9725e27e7696'
ORDER BY c.created_at DESC;

-- 2. Create backup summary
SELECT 
  'BACKUP_SUMMARY' as info,
  COUNT(*) as total_customers,
  COUNT(CASE WHEN "CustomerListID" IS NOT NULL THEN 1 END) as customers_with_id,
  COUNT(CASE WHEN name IS NOT NULL THEN 1 END) as customers_with_name,
  COUNT(CASE WHEN phone IS NOT NULL THEN 1 END) as customers_with_phone,
  COUNT(CASE WHEN contact_details IS NOT NULL THEN 1 END) as customers_with_contact,
  MIN(created_at) as oldest_customer,
  MAX(created_at) as newest_customer
FROM customers 
WHERE organization_id = 'f98daa10-2884-49b9-a6a6-9725e27e7696';

-- 3. Check for duplicate patterns in your test data
SELECT 
  'DUPLICATE_ANALYSIS' as info,
  name,
  COUNT(*) as duplicate_count,
  STRING_AGG("CustomerListID", ', ') as customer_ids
FROM customers 
WHERE organization_id = 'f98daa10-2884-49b9-a6a6-9725e27e7696'
GROUP BY name
HAVING COUNT(*) > 1
ORDER BY duplicate_count DESC
LIMIT 20;

-- 4. Export in CSV-ready format (copy results to Excel/CSV)
SELECT 
  "CustomerListID" as "Customer ID",
  name as "Customer Name",
  contact_details as "Contact Details",
  phone as "Phone",
  city as "City",
  postal_code as "Postal Code",
  barcode as "Barcode",
  created_at as "Created Date"
FROM customers 
WHERE organization_id = 'f98daa10-2884-49b9-a6a6-9725e27e7696'
ORDER BY name;

-- 5. Organization info for restore
SELECT 
  'ORGANIZATION_INFO' as info,
  id as organization_id,
  name as organization_name,
  created_at as org_created_at
FROM organizations 
WHERE id = 'f98daa10-2884-49b9-a6a6-9725e27e7696';
