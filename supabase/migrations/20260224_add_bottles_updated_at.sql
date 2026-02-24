-- Add bottles.updated_at if missing (required by return_bottles_to_warehouse and assign_bottles_to_customer RPCs)
ALTER TABLE bottles ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
-- Add rentals.updated_at if missing (same RPCs update rentals)
ALTER TABLE rentals ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
-- Add rentals.bottle_barcode if missing (RPCs match rentals by barcode for DNS/legacy records)
ALTER TABLE rentals ADD COLUMN IF NOT EXISTS bottle_barcode TEXT;
-- Add scans columns if missing (RPCs insert audit trail)
ALTER TABLE scans ADD COLUMN IF NOT EXISTS scanned_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE scans ADD COLUMN IF NOT EXISTS scanned_by UUID;
ALTER TABLE scans ADD COLUMN IF NOT EXISTS mode TEXT;
ALTER TABLE scans ADD COLUMN IF NOT EXISTS order_number TEXT;
