-- ============================================================================
-- INVOICE TEMPLATE SYSTEM MIGRATION
-- ============================================================================
-- This migration creates the invoice template system tables.
-- ============================================================================

-- Create invoice_templates table
CREATE TABLE IF NOT EXISTS invoice_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  layout_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_default BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  UNIQUE(organization_id, name)
);

-- Add default_template_id to invoice_settings if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'invoice_settings' 
    AND column_name = 'default_template_id'
  ) THEN
    ALTER TABLE invoice_settings ADD COLUMN default_template_id UUID REFERENCES invoice_templates(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Add template_id to rental_invoices if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'rental_invoices' 
    AND column_name = 'template_id'
  ) THEN
    ALTER TABLE rental_invoices ADD COLUMN template_id UUID REFERENCES invoice_templates(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_invoice_templates_org ON invoice_templates(organization_id);
CREATE INDEX IF NOT EXISTS idx_invoice_templates_default ON invoice_templates(organization_id, is_default) WHERE is_default = TRUE;
CREATE INDEX IF NOT EXISTS idx_rental_invoices_template ON rental_invoices(template_id);

-- Enable RLS
ALTER TABLE invoice_templates ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their organization's invoice templates" ON invoice_templates;
DROP POLICY IF EXISTS "Users can insert invoice templates for their organization" ON invoice_templates;
DROP POLICY IF EXISTS "Users can update their organization's invoice templates" ON invoice_templates;
DROP POLICY IF EXISTS "Users can delete their organization's invoice templates" ON invoice_templates;

-- Create RLS policies for invoice_templates
CREATE POLICY "Users can view their organization's invoice templates"
  ON invoice_templates FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.organization_id = invoice_templates.organization_id
    )
  );

CREATE POLICY "Users can insert invoice templates for their organization"
  ON invoice_templates FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.organization_id = invoice_templates.organization_id
    )
  );

CREATE POLICY "Users can update their organization's invoice templates"
  ON invoice_templates FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.organization_id = invoice_templates.organization_id
    )
  );

CREATE POLICY "Users can delete their organization's invoice templates"
  ON invoice_templates FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.organization_id = invoice_templates.organization_id
    )
  );

-- Function to ensure only one default template per organization
CREATE OR REPLACE FUNCTION ensure_single_default_template()
RETURNS TRIGGER AS $$
BEGIN
  -- If this template is being set as default, unset all other defaults for this organization
  IF NEW.is_default = TRUE THEN
    UPDATE invoice_templates
    SET is_default = FALSE
    WHERE organization_id = NEW.organization_id
      AND id != NEW.id
      AND is_default = TRUE;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if exists
DROP TRIGGER IF EXISTS trigger_ensure_single_default_template ON invoice_templates;

-- Create trigger
CREATE TRIGGER trigger_ensure_single_default_template
  BEFORE INSERT OR UPDATE ON invoice_templates
  FOR EACH ROW
  EXECUTE FUNCTION ensure_single_default_template();

-- Create default template for existing organizations
DO $$
DECLARE
  org_record RECORD;
  new_template_id UUID;
BEGIN
  FOR org_record IN SELECT id FROM organizations LOOP
    -- Check if organization already has a default template
    IF NOT EXISTS (
      SELECT 1 FROM invoice_templates 
      WHERE organization_id = org_record.id AND is_default = TRUE
    ) THEN
      -- Create default template
      INSERT INTO invoice_templates (
        organization_id,
        name,
        description,
        layout_json,
        is_default
      ) VALUES (
        org_record.id,
        'Default Template',
        'Default invoice template',
        jsonb_build_object(
          'logo_url', NULL,
          'colors', jsonb_build_object(
            'primary', '#1976d2',
            'secondary', '#424242'
          ),
          'fonts', jsonb_build_object(
            'heading', 'Helvetica',
            'body', 'Helvetica'
          ),
          'header', jsonb_build_object(
            'text', '',
            'show', true
          ),
          'footer', jsonb_build_object(
            'text', '',
            'show', true
          ),
          'fields', jsonb_build_object(
            'show_quantity', true,
            'show_serial_number', true,
            'show_barcode', true,
            'show_start_date', true,
            'show_rental_days', true,
            'show_rate', true,
            'show_total', true
          ),
          'columns', jsonb_build_array(
            jsonb_build_object('id', 'description', 'label', 'Description', 'visible', true, 'order', 0),
            jsonb_build_object('id', 'quantity', 'label', 'Qty', 'visible', true, 'order', 1),
            jsonb_build_object('id', 'barcode', 'label', 'Barcode', 'visible', true, 'order', 2),
            jsonb_build_object('id', 'start_date', 'label', 'Start Date', 'visible', true, 'order', 3),
            jsonb_build_object('id', 'rental_days', 'label', 'Days', 'visible', true, 'order', 4),
            jsonb_build_object('id', 'unit_price', 'label', 'Rate', 'visible', true, 'order', 5),
            jsonb_build_object('id', 'total_price', 'label', 'Total', 'visible', true, 'order', 6)
          )
        ),
        TRUE
      ) RETURNING id INTO new_template_id;
      
      -- Update invoice_settings to reference this template
      UPDATE invoice_settings
      SET default_template_id = new_template_id
      WHERE organization_id = org_record.id
        AND invoice_settings.default_template_id IS NULL;
    END IF;
  END LOOP;
END $$;

