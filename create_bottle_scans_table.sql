-- Create bottle_scans table for mobile app scanning functionality
-- This table stores scan records from the mobile app for bottles

CREATE TABLE IF NOT EXISTS bottle_scans (
    id SERIAL PRIMARY KEY,
    order_number TEXT,
    bottle_barcode TEXT NOT NULL,
    mode TEXT CHECK (mode IN ('SHIP', 'RETURN')),
    customer_id TEXT REFERENCES customers("CustomerListID"),
    customer_name TEXT,
    location TEXT,
    user_id TEXT,
    timestamp TIMESTAMP DEFAULT NOW(),
    created_at TIMESTAMP DEFAULT NOW(),
    read BOOLEAN DEFAULT FALSE,
    verified BOOLEAN DEFAULT FALSE
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_bottle_scans_bottle_barcode ON bottle_scans(bottle_barcode);
CREATE INDEX IF NOT EXISTS idx_bottle_scans_order_number ON bottle_scans(order_number);
CREATE INDEX IF NOT EXISTS idx_bottle_scans_created_at ON bottle_scans(created_at);
CREATE INDEX IF NOT EXISTS idx_bottle_scans_mode ON bottle_scans(mode);
CREATE INDEX IF NOT EXISTS idx_bottle_scans_read ON bottle_scans(read);

-- Add comments for documentation
COMMENT ON TABLE bottle_scans IS 'Stores bottle scan records from mobile app';
COMMENT ON COLUMN bottle_scans.order_number IS 'Sales order or invoice number';
COMMENT ON COLUMN bottle_scans.bottle_barcode IS 'Barcode of the scanned bottle';
COMMENT ON COLUMN bottle_scans.mode IS 'SHIP for outgoing bottles, RETURN for incoming bottles';
COMMENT ON COLUMN bottle_scans.customer_id IS 'Reference to customers table';
COMMENT ON COLUMN bottle_scans.customer_name IS 'Customer name for quick reference';
COMMENT ON COLUMN bottle_scans.location IS 'Location where scan occurred';
COMMENT ON COLUMN bottle_scans.user_id IS 'User who performed the scan';
COMMENT ON COLUMN bottle_scans.read IS 'Whether the scan has been viewed in Recent Scans';
COMMENT ON COLUMN bottle_scans.verified IS 'Whether the scan has been verified/approved'; 