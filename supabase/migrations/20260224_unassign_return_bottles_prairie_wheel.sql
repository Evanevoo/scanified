-- One-off: Unassign two bottles that were returned but never unassigned (634456552, 660326533).
-- Run this to fix "Currently Assigned Bottles" count for the customer (e.g. Prairie Wheel).

-- 1. Close open rentals for these barcodes (any org; match with or without leading zeros)
UPDATE rentals
SET rental_end_date = CURRENT_DATE,
    closed_by_order = NULL,
    updated_at = NOW()
WHERE rental_end_date IS NULL
  AND (
    bottle_barcode IN ('634456552', '660326533')
    OR TRIM(LEADING '0' FROM bottle_barcode) IN ('634456552', '660326533')
  );

-- 2. Unassign the bottles (any org)
UPDATE bottles
SET assigned_customer = NULL,
    customer_name = NULL,
    status = 'empty',
    previous_assigned_customer = NULL,
    previous_status = NULL,
    last_verified_order = NULL,
    updated_at = NOW()
WHERE (assigned_customer IS NOT NULL OR customer_name IS NOT NULL)
  AND (
    barcode_number IN ('634456552', '660326533')
    OR TRIM(LEADING '0' FROM barcode_number) IN ('634456552', '660326533')
  );
