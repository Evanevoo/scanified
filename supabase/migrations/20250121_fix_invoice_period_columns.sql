-- Fix missing invoice_period_start and invoice_period_end columns
-- This migration ensures these columns exist in rental_invoices table

DO $$
BEGIN
  -- Add invoice_period_start if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'rental_invoices' 
    AND column_name = 'invoice_period_start'
  ) THEN
    ALTER TABLE rental_invoices ADD COLUMN invoice_period_start DATE;
    RAISE NOTICE 'Added invoice_period_start column';
  END IF;
  
  -- Add invoice_period_end if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'rental_invoices' 
    AND column_name = 'invoice_period_end'
  ) THEN
    ALTER TABLE rental_invoices ADD COLUMN invoice_period_end DATE;
    RAISE NOTICE 'Added invoice_period_end column';
  END IF;
  
  -- Add template_id if it doesn't exist (for invoice templates)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'rental_invoices' 
    AND column_name = 'template_id'
  ) THEN
    -- Check if invoice_templates table exists first
    IF EXISTS (
      SELECT 1 FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = 'invoice_templates'
    ) THEN
      ALTER TABLE rental_invoices ADD COLUMN template_id UUID REFERENCES invoice_templates(id) ON DELETE SET NULL;
      RAISE NOTICE 'Added template_id column';
    ELSE
      ALTER TABLE rental_invoices ADD COLUMN template_id UUID;
      RAISE NOTICE 'Added template_id column (without foreign key - invoice_templates table not found)';
    END IF;
  END IF;
  
  RAISE NOTICE 'Invoice period columns check completed';
END $$;

