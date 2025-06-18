-- Create cylinder_scans table for mobile app scanning functionality
-- This table stores scan records from the mobile app

CREATE TABLE IF NOT EXISTS cylinder_scans (
    id SERIAL PRIMARY KEY,
    order_number TEXT,
    cylinder_barcode TEXT NOT NULL,
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
CREATE INDEX IF NOT EXISTS idx_cylinder_scans_cylinder_barcode ON cylinder_scans(cylinder_barcode);
CREATE INDEX IF NOT EXISTS idx_cylinder_scans_order_number ON cylinder_scans(order_number);
CREATE INDEX IF NOT EXISTS idx_cylinder_scans_created_at ON cylinder_scans(created_at);
CREATE INDEX IF NOT EXISTS idx_cylinder_scans_mode ON cylinder_scans(mode);
CREATE INDEX IF NOT EXISTS idx_cylinder_scans_read ON cylinder_scans(read);

-- Add comments for documentation
COMMENT ON TABLE cylinder_scans IS 'Stores cylinder scan records from mobile app';
COMMENT ON COLUMN cylinder_scans.order_number IS 'Sales order or invoice number';
COMMENT ON COLUMN cylinder_scans.cylinder_barcode IS 'Barcode of the scanned cylinder';
COMMENT ON COLUMN cylinder_scans.mode IS 'SHIP for outgoing cylinders, RETURN for incoming cylinders';
COMMENT ON COLUMN cylinder_scans.customer_id IS 'Reference to customers table';
COMMENT ON COLUMN cylinder_scans.customer_name IS 'Customer name for quick reference';
COMMENT ON COLUMN cylinder_scans.location IS 'Location where scan occurred';
COMMENT ON COLUMN cylinder_scans.user_id IS 'User who performed the scan';
COMMENT ON COLUMN cylinder_scans.read IS 'Whether the scan has been viewed in Recent Scans';
COMMENT ON COLUMN cylinder_scans.verified IS 'Whether the scan has been verified/approved'; 