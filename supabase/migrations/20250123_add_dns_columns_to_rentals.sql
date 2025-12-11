-- Add DNS+ (Delivered Not Scanned) columns to rentals table
-- These columns allow tracking of bottles that were delivered according to invoices
-- but were not scanned during delivery

ALTER TABLE rentals 
ADD COLUMN IF NOT EXISTS is_dns BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS dns_product_code TEXT,
ADD COLUMN IF NOT EXISTS dns_description TEXT,
ADD COLUMN IF NOT EXISTS dns_order_number TEXT;

-- Add comment to explain DNS+ functionality
COMMENT ON COLUMN rentals.is_dns IS 'Flag indicating this is a DNS+ (Delivered Not Scanned) record - bottle was delivered per invoice but not scanned';
COMMENT ON COLUMN rentals.dns_product_code IS 'Product code from the invoice for DNS+ records';
COMMENT ON COLUMN rentals.dns_description IS 'Description from the invoice for DNS+ records';
COMMENT ON COLUMN rentals.dns_order_number IS 'Order number from the invoice for DNS+ records';

-- Create index for faster DNS+ queries
CREATE INDEX IF NOT EXISTS idx_rentals_is_dns ON rentals(is_dns) WHERE is_dns = true;
CREATE INDEX IF NOT EXISTS idx_rentals_dns_customer ON rentals(customer_id, is_dns) WHERE is_dns = true;
