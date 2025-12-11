-- Create invoices table for tracking generated invoices
CREATE TABLE IF NOT EXISTS invoices (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  customer_id TEXT NOT NULL,
  customer_name TEXT NOT NULL,
  invoice_number TEXT NOT NULL,
  invoice_date DATE NOT NULL,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  subtotal DECIMAL(10, 2) NOT NULL,
  tax_amount DECIMAL(10, 2) NOT NULL,
  total_amount DECIMAL(10, 2) NOT NULL,
  rental_days INTEGER NOT NULL,
  cylinders_count INTEGER NOT NULL,
  pdf_url TEXT,
  email_sent BOOLEAN DEFAULT FALSE,
  email_sent_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add customer_email column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_schema = 'public' 
                 AND table_name = 'invoices' 
                 AND column_name = 'customer_email') THEN
    ALTER TABLE invoices ADD COLUMN customer_email TEXT;
  END IF;
END $$;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_invoices_organization_id ON invoices(organization_id);
CREATE INDEX IF NOT EXISTS idx_invoices_customer_id ON invoices(customer_id);
CREATE INDEX IF NOT EXISTS idx_invoices_invoice_date ON invoices(invoice_date);
CREATE INDEX IF NOT EXISTS idx_invoices_invoice_number ON invoices(invoice_number);

-- Enable RLS
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;

-- Create RLS policies - users can only view/manage invoices for their organization
DROP POLICY IF EXISTS "Users can view invoices for their organization" ON invoices;
CREATE POLICY "Users can view invoices for their organization"
  ON invoices FOR SELECT
  TO authenticated
  USING (
    organization_id = (
      SELECT organization_id
      FROM profiles
      WHERE id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can insert invoices for their organization" ON invoices;
CREATE POLICY "Users can insert invoices for their organization"
  ON invoices FOR INSERT
  TO authenticated
  WITH CHECK (
    organization_id = (
      SELECT organization_id
      FROM profiles
      WHERE id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can update invoices for their organization" ON invoices;
CREATE POLICY "Users can update invoices for their organization"
  ON invoices FOR UPDATE
  TO authenticated
  USING (
    organization_id = (
      SELECT organization_id
      FROM profiles
      WHERE id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can delete invoices for their organization" ON invoices;
CREATE POLICY "Users can delete invoices for their organization"
  ON invoices FOR DELETE
  TO authenticated
  USING (
    organization_id = (
      SELECT organization_id
      FROM profiles
      WHERE id = auth.uid()
    )
  );

-- Create invoice_line_items table for detailed line items
CREATE TABLE IF NOT EXISTS invoice_line_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  item_description TEXT NOT NULL,
  barcode TEXT,
  serial_number TEXT,
  quantity INTEGER DEFAULT 1,
  rental_days INTEGER NOT NULL,
  daily_rate DECIMAL(10, 3) NOT NULL,
  line_total DECIMAL(10, 2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_invoice_line_items_invoice_id ON invoice_line_items(invoice_id);

-- Enable RLS
ALTER TABLE invoice_line_items ENABLE ROW LEVEL SECURITY;

-- Create RLS policies - users can only view/manage line items for their organization's invoices
DROP POLICY IF EXISTS "Users can view line items for their organization" ON invoice_line_items;
CREATE POLICY "Users can view line items for their organization"
  ON invoice_line_items FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM invoices
      WHERE invoices.id = invoice_line_items.invoice_id
        AND invoices.organization_id = (
          SELECT organization_id
          FROM profiles
          WHERE id = auth.uid()
        )
    )
  );

DROP POLICY IF EXISTS "Users can insert line items for their organization" ON invoice_line_items;
CREATE POLICY "Users can insert line items for their organization"
  ON invoice_line_items FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM invoices
      WHERE invoices.id = invoice_line_items.invoice_id
        AND invoices.organization_id = (
          SELECT organization_id
          FROM profiles
          WHERE id = auth.uid()
        )
    )
  );

DROP POLICY IF EXISTS "Users can update line items for their organization" ON invoice_line_items;
CREATE POLICY "Users can update line items for their organization"
  ON invoice_line_items FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM invoices
      WHERE invoices.id = invoice_line_items.invoice_id
        AND invoices.organization_id = (
          SELECT organization_id
          FROM profiles
          WHERE id = auth.uid()
        )
    )
  );

DROP POLICY IF EXISTS "Users can delete line items for their organization" ON invoice_line_items;
CREATE POLICY "Users can delete line items for their organization"
  ON invoice_line_items FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM invoices
      WHERE invoices.id = invoice_line_items.invoice_id
        AND invoices.organization_id = (
          SELECT organization_id
          FROM profiles
          WHERE id = auth.uid()
        )
    )
  );

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_invoices_updated_at ON invoices;
CREATE TRIGGER update_invoices_updated_at
  BEFORE UPDATE ON invoices
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

