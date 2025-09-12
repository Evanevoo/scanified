-- Create sales_orders table for mobile app order submission
-- This table stores sales orders created from mobile scans

-- First, ensure the uuid extension is enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create the sales_orders table
CREATE TABLE IF NOT EXISTS sales_orders (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    organization_id UUID,
    sales_order_number TEXT,
    order_number TEXT, -- Alternative order number field
    customer_name TEXT,
    customer_id TEXT,
    assets TEXT, -- JSON string or text description of assets
    order_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    scanned_at TIMESTAMP WITH TIME ZONE,
    total_amount DECIMAL(10,2) DEFAULT 0.00,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_sales_orders_organization_id ON sales_orders(organization_id);
CREATE INDEX IF NOT EXISTS idx_sales_orders_sales_order_number ON sales_orders(sales_order_number);
CREATE INDEX IF NOT EXISTS idx_sales_orders_order_number ON sales_orders(order_number);
CREATE INDEX IF NOT EXISTS idx_sales_orders_customer_name ON sales_orders(customer_name);
CREATE INDEX IF NOT EXISTS idx_sales_orders_scanned_at ON sales_orders(scanned_at);
CREATE INDEX IF NOT EXISTS idx_sales_orders_created_at ON sales_orders(created_at);

-- Enable Row Level Security
ALTER TABLE sales_orders ENABLE ROW LEVEL SECURITY;

-- Create RLS policies (simplified for now)
CREATE POLICY "Allow all operations for authenticated users" ON sales_orders
    FOR ALL USING (auth.role() = 'authenticated');

-- Add comments for documentation
COMMENT ON TABLE sales_orders IS 'Stores sales orders created from mobile scans';
COMMENT ON COLUMN sales_orders.sales_order_number IS 'Sales order number';
COMMENT ON COLUMN sales_orders.order_number IS 'Alternative order number field';
COMMENT ON COLUMN sales_orders.customer_name IS 'Customer name';
COMMENT ON COLUMN sales_orders.customer_id IS 'Customer ID';
COMMENT ON COLUMN sales_orders.assets IS 'Assets description or JSON';
COMMENT ON COLUMN sales_orders.scanned_at IS 'When the order was scanned';
COMMENT ON COLUMN sales_orders.total_amount IS 'Total order amount';
COMMENT ON COLUMN sales_orders.notes IS 'Order notes';
