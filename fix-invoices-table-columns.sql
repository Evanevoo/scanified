-- Fix missing columns in invoices table
-- This script adds only the essential columns needed for the automated billing system

-- Add missing columns to invoices table
DO $$
BEGIN
  -- Check if invoices table exists first
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'invoices') THEN
    RAISE NOTICE 'Invoices table exists, adding missing columns...';
    
    -- Add due_date column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='invoices' AND column_name='due_date') THEN
      ALTER TABLE invoices ADD COLUMN due_date DATE;
      RAISE NOTICE 'Added due_date column';
    ELSE
      RAISE NOTICE 'due_date column already exists';
    END IF;
    
    -- Add issue_date column  
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='invoices' AND column_name='issue_date') THEN
      ALTER TABLE invoices ADD COLUMN issue_date DATE;
      RAISE NOTICE 'Added issue_date column';
    ELSE
      RAISE NOTICE 'issue_date column already exists';
    END IF;
    
    -- Add total_amount column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='invoices' AND column_name='total_amount') THEN
      ALTER TABLE invoices ADD COLUMN total_amount DECIMAL(10,2) DEFAULT 0.00;
      RAISE NOTICE 'Added total_amount column';
    ELSE
      RAISE NOTICE 'total_amount column already exists';
    END IF;
    
    -- Add invoice_number column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='invoices' AND column_name='invoice_number') THEN
      ALTER TABLE invoices ADD COLUMN invoice_number TEXT;
      RAISE NOTICE 'Added invoice_number column';
    ELSE
      RAISE NOTICE 'invoice_number column already exists';
    END IF;
    
    -- Add payment_status column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='invoices' AND column_name='payment_status') THEN
      ALTER TABLE invoices ADD COLUMN payment_status TEXT DEFAULT 'unpaid';
      RAISE NOTICE 'Added payment_status column';
    ELSE
      RAISE NOTICE 'payment_status column already exists';
    END IF;
    
    -- Add billing_period_start column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='invoices' AND column_name='billing_period_start') THEN
      ALTER TABLE invoices ADD COLUMN billing_period_start DATE;
      RAISE NOTICE 'Added billing_period_start column';
    ELSE
      RAISE NOTICE 'billing_period_start column already exists';
    END IF;
    
    -- Add billing_period_end column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='invoices' AND column_name='billing_period_end') THEN
      ALTER TABLE invoices ADD COLUMN billing_period_end DATE;
      RAISE NOTICE 'Added billing_period_end column';
    ELSE
      RAISE NOTICE 'billing_period_end column already exists';
    END IF;
    
    -- Add subtotal column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='invoices' AND column_name='subtotal') THEN
      ALTER TABLE invoices ADD COLUMN subtotal DECIMAL(10,2) DEFAULT 0.00;
      RAISE NOTICE 'Added subtotal column';
    ELSE
      RAISE NOTICE 'subtotal column already exists';
    END IF;
    
    -- Add tax_amount column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='invoices' AND column_name='tax_amount') THEN
      ALTER TABLE invoices ADD COLUMN tax_amount DECIMAL(10,2) DEFAULT 0.00;
      RAISE NOTICE 'Added tax_amount column';
    ELSE
      RAISE NOTICE 'tax_amount column already exists';
    END IF;
    
    RAISE NOTICE 'Invoice table column updates completed!';
    
  ELSE
    RAISE NOTICE 'Invoices table does not exist - please create it first';
  END IF;
END $$;

-- Create indexes for better performance (only if columns exist)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='invoices' AND column_name='due_date') THEN
    CREATE INDEX IF NOT EXISTS idx_invoices_due_date ON invoices(due_date);
    RAISE NOTICE 'Created index on due_date';
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='invoices' AND column_name='payment_status') THEN
    CREATE INDEX IF NOT EXISTS idx_invoices_payment_status ON invoices(payment_status);
    RAISE NOTICE 'Created index on payment_status';
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='invoices' AND column_name='invoice_number') THEN
    CREATE INDEX IF NOT EXISTS idx_invoices_invoice_number ON invoices(invoice_number);
    RAISE NOTICE 'Created index on invoice_number';
  END IF;
END $$;
