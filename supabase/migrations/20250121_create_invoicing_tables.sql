-- ============================================================================
-- INVOICING SYSTEM MIGRATION
-- ============================================================================
-- This migration creates the invoicing system tables and functions.
-- Make sure the following tables exist before running:
--   - organizations
--   - profiles
--   - customers
--   - rentals (with customer_id column)
-- ============================================================================

-- Create invoice_settings table for company/invoice configuration
CREATE TABLE IF NOT EXISTS invoice_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  company_name TEXT,
  company_address TEXT,
  company_phone TEXT,
  company_email TEXT,
  company_logo_url TEXT,
  invoice_prefix TEXT DEFAULT 'INV',
  next_invoice_number INTEGER DEFAULT 1,
  primary_color TEXT DEFAULT '#1976d2',
  secondary_color TEXT DEFAULT '#424242',
  invoice_notes TEXT,
  invoice_footer TEXT,
  tax_rate DECIMAL(5,4) DEFAULT 0.11,
  payment_terms TEXT DEFAULT 'Net 30',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(organization_id)
);

-- Create rental_invoices table
CREATE TABLE IF NOT EXISTS rental_invoices (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  invoice_number TEXT NOT NULL,
  customer_id TEXT NOT NULL,
  customer_name TEXT NOT NULL,
  customer_address TEXT,
  customer_email TEXT,
  invoice_date DATE NOT NULL DEFAULT CURRENT_DATE,
  invoice_period_start DATE NOT NULL,
  invoice_period_end DATE NOT NULL,
  subtotal DECIMAL(10,2) NOT NULL DEFAULT 0,
  tax_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
  total_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'draft', -- draft, sent, paid, cancelled
  notes TEXT,
  pdf_url TEXT,
  sent_at TIMESTAMP WITH TIME ZONE,
  paid_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  UNIQUE(organization_id, invoice_number)
);

-- Ensure all required columns exist (in case table was created without them)
DO $$
BEGIN
  -- Add customer_id if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'rental_invoices' 
    AND column_name = 'customer_id'
  ) THEN
    ALTER TABLE rental_invoices ADD COLUMN customer_id TEXT;
  END IF;
  
  -- Add customer_name if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'rental_invoices' 
    AND column_name = 'customer_name'
  ) THEN
    ALTER TABLE rental_invoices ADD COLUMN customer_name TEXT;
  END IF;
  
  -- Add customer_address if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'rental_invoices' 
    AND column_name = 'customer_address'
  ) THEN
    ALTER TABLE rental_invoices ADD COLUMN customer_address TEXT;
  END IF;
  
  -- Add customer_email if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'rental_invoices' 
    AND column_name = 'customer_email'
  ) THEN
    ALTER TABLE rental_invoices ADD COLUMN customer_email TEXT;
  END IF;
  
  -- Add invoice_period_start if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'rental_invoices' 
    AND column_name = 'invoice_period_start'
  ) THEN
    ALTER TABLE rental_invoices ADD COLUMN invoice_period_start DATE;
  END IF;
  
  -- Add invoice_period_end if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'rental_invoices' 
    AND column_name = 'invoice_period_end'
  ) THEN
    ALTER TABLE rental_invoices ADD COLUMN invoice_period_end DATE;
  END IF;
  
  -- Add template_id if it doesn't exist (for invoice templates)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'rental_invoices' 
    AND column_name = 'template_id'
  ) THEN
    ALTER TABLE rental_invoices ADD COLUMN template_id UUID REFERENCES invoice_templates(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Create invoice_line_items table
CREATE TABLE IF NOT EXISTS invoice_line_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  invoice_id UUID NOT NULL REFERENCES rental_invoices(id) ON DELETE CASCADE,
  line_type TEXT NOT NULL DEFAULT 'rental', -- rental, fee, discount, other
  description TEXT NOT NULL,
  cylinder_id TEXT,
  barcode TEXT,
  rental_start_date DATE,
  rental_end_date DATE,
  rental_days INTEGER,
  quantity DECIMAL(10,2) DEFAULT 1,
  unit_price DECIMAL(10,2) NOT NULL,
  total_price DECIMAL(10,2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better query performance
-- These are created after the tables, so they should exist
CREATE INDEX IF NOT EXISTS idx_rental_invoices_org ON rental_invoices(organization_id);
CREATE INDEX IF NOT EXISTS idx_rental_invoices_customer ON rental_invoices(customer_id);
CREATE INDEX IF NOT EXISTS idx_rental_invoices_status ON rental_invoices(status);
CREATE INDEX IF NOT EXISTS idx_rental_invoices_date ON rental_invoices(invoice_date);
CREATE INDEX IF NOT EXISTS idx_invoice_line_items_invoice ON invoice_line_items(invoice_id);

-- Enable RLS
ALTER TABLE invoice_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE rental_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_line_items ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their organization's invoice settings" ON invoice_settings;
DROP POLICY IF EXISTS "Users can insert their organization's invoice settings" ON invoice_settings;
DROP POLICY IF EXISTS "Users can update their organization's invoice settings" ON invoice_settings;

-- Create RLS policies for invoice_settings
CREATE POLICY "Users can view their organization's invoice settings"
  ON invoice_settings FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.organization_id = invoice_settings.organization_id
    )
  );

CREATE POLICY "Users can insert their organization's invoice settings"
  ON invoice_settings FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.organization_id = invoice_settings.organization_id
    )
  );

CREATE POLICY "Users can update their organization's invoice settings"
  ON invoice_settings FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.organization_id = invoice_settings.organization_id
    )
  );

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their organization's invoices" ON rental_invoices;
DROP POLICY IF EXISTS "Users can insert invoices for their organization" ON rental_invoices;
DROP POLICY IF EXISTS "Users can update their organization's invoices" ON rental_invoices;
DROP POLICY IF EXISTS "Users can delete their organization's invoices" ON rental_invoices;

-- Create RLS policies for rental_invoices
CREATE POLICY "Users can view their organization's invoices"
  ON rental_invoices FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.organization_id = rental_invoices.organization_id
    )
  );

CREATE POLICY "Users can insert invoices for their organization"
  ON rental_invoices FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.organization_id = rental_invoices.organization_id
    )
  );

CREATE POLICY "Users can update their organization's invoices"
  ON rental_invoices FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.organization_id = rental_invoices.organization_id
    )
  );

CREATE POLICY "Users can delete their organization's invoices"
  ON rental_invoices FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.organization_id = rental_invoices.organization_id
    )
  );

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view line items for their organization's invoices" ON invoice_line_items;
DROP POLICY IF EXISTS "Users can insert line items for their organization's invoices" ON invoice_line_items;
DROP POLICY IF EXISTS "Users can update line items for their organization's invoices" ON invoice_line_items;
DROP POLICY IF EXISTS "Users can delete line items for their organization's invoices" ON invoice_line_items;

-- Create RLS policies for invoice_line_items
CREATE POLICY "Users can view line items for their organization's invoices"
  ON invoice_line_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM rental_invoices ri
      INNER JOIN profiles p ON p.organization_id = ri.organization_id
      WHERE ri.id = invoice_line_items.invoice_id
      AND p.id = auth.uid()
    )
  );

CREATE POLICY "Users can insert line items for their organization's invoices"
  ON invoice_line_items FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM rental_invoices ri
      INNER JOIN profiles p ON p.organization_id = ri.organization_id
      WHERE ri.id = invoice_line_items.invoice_id
      AND p.id = auth.uid()
    )
  );

CREATE POLICY "Users can update line items for their organization's invoices"
  ON invoice_line_items FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM rental_invoices ri
      INNER JOIN profiles p ON p.organization_id = ri.organization_id
      WHERE ri.id = invoice_line_items.invoice_id
      AND p.id = auth.uid()
    )
  );

CREATE POLICY "Users can delete line items for their organization's invoices"
  ON invoice_line_items FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM rental_invoices ri
      INNER JOIN profiles p ON p.organization_id = ri.organization_id
      WHERE ri.id = invoice_line_items.invoice_id
      AND p.id = auth.uid()
    )
  );

-- Drop function if it exists (to handle signature changes)
DROP FUNCTION IF EXISTS generate_invoice_number() CASCADE;

-- Function to automatically update invoice_number
CREATE OR REPLACE FUNCTION generate_invoice_number()
RETURNS TRIGGER AS $$
DECLARE
  settings RECORD;
  new_number INTEGER;
  new_invoice_number TEXT;
BEGIN
  -- Get invoice settings for this organization
  SELECT * INTO settings
  FROM invoice_settings
  WHERE organization_id = NEW.organization_id;
  
  -- If no settings exist, create default settings
  IF settings IS NULL THEN
    INSERT INTO invoice_settings (organization_id)
    VALUES (NEW.organization_id)
    RETURNING * INTO settings;
  END IF;
  
  -- Generate invoice number
  new_number := settings.next_invoice_number;
  new_invoice_number := settings.invoice_prefix || LPAD(new_number::TEXT, 6, '0');
  
  -- Update the invoice with the new number
  NEW.invoice_number := new_invoice_number;
  
  -- Increment the next invoice number in settings
  UPDATE invoice_settings
  SET next_invoice_number = next_invoice_number + 1,
      updated_at = NOW()
  WHERE organization_id = NEW.organization_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if it exists
DROP TRIGGER IF EXISTS auto_generate_invoice_number ON rental_invoices;

-- Create trigger for auto-generating invoice numbers
CREATE TRIGGER auto_generate_invoice_number
  BEFORE INSERT ON rental_invoices
  FOR EACH ROW
  WHEN (NEW.invoice_number IS NULL OR NEW.invoice_number = '')
  EXECUTE FUNCTION generate_invoice_number();

-- Drop function if it exists (to handle signature changes)
DROP FUNCTION IF EXISTS update_invoice_totals() CASCADE;

-- Function to update invoice totals when line items change
CREATE OR REPLACE FUNCTION update_invoice_totals()
RETURNS TRIGGER AS $$
DECLARE
  invoice_subtotal DECIMAL(10,2);
  invoice_tax DECIMAL(10,2);
  invoice_total DECIMAL(10,2);
  tax_rate DECIMAL(5,4);
  target_invoice_id UUID;
BEGIN
  -- Get the invoice ID from NEW or OLD
  target_invoice_id := COALESCE(NEW.invoice_id, OLD.invoice_id);
  
  -- If no invoice_id, return early
  IF target_invoice_id IS NULL THEN
    RETURN COALESCE(NEW, OLD);
  END IF;
  
  -- Get the tax rate from invoice settings
  SELECT COALESCE(s.tax_rate, 0.11) INTO tax_rate
  FROM rental_invoices i
  LEFT JOIN invoice_settings s ON s.organization_id = i.organization_id
  WHERE i.id = target_invoice_id;
  
  -- If no tax rate found, use default
  IF tax_rate IS NULL THEN
    tax_rate := 0.11;
  END IF;
  
  -- Calculate subtotal from all line items
  SELECT COALESCE(SUM(total_price), 0) INTO invoice_subtotal
  FROM invoice_line_items
  WHERE invoice_id = target_invoice_id;
  
  -- Calculate tax and total
  invoice_tax := ROUND(invoice_subtotal * tax_rate, 2);
  invoice_total := invoice_subtotal + invoice_tax;
  
  -- Update the invoice
  UPDATE rental_invoices
  SET subtotal = invoice_subtotal,
      tax_amount = invoice_tax,
      total_amount = invoice_total,
      updated_at = NOW()
  WHERE id = target_invoice_id;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Drop triggers if they exist
DROP TRIGGER IF EXISTS update_invoice_totals_on_insert ON invoice_line_items;
DROP TRIGGER IF EXISTS update_invoice_totals_on_update ON invoice_line_items;
DROP TRIGGER IF EXISTS update_invoice_totals_on_delete ON invoice_line_items;

-- Create triggers for updating invoice totals
CREATE TRIGGER update_invoice_totals_on_insert
  AFTER INSERT ON invoice_line_items
  FOR EACH ROW
  EXECUTE FUNCTION update_invoice_totals();

CREATE TRIGGER update_invoice_totals_on_update
  AFTER UPDATE ON invoice_line_items
  FOR EACH ROW
  EXECUTE FUNCTION update_invoice_totals();

CREATE TRIGGER update_invoice_totals_on_delete
  AFTER DELETE ON invoice_line_items
  FOR EACH ROW
  EXECUTE FUNCTION update_invoice_totals();

