-- Quick fix: Add missing columns to rental_invoices table if they don't exist
-- Run this if you get "column customer_name does not exist" error

DO $$
BEGIN
  -- Add customer_name if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'rental_invoices' 
    AND column_name = 'customer_name'
  ) THEN
    ALTER TABLE rental_invoices ADD COLUMN customer_name TEXT;
    RAISE NOTICE 'Added customer_name column';
  END IF;
  
  -- Add customer_address if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'rental_invoices' 
    AND column_name = 'customer_address'
  ) THEN
    ALTER TABLE rental_invoices ADD COLUMN customer_address TEXT;
    RAISE NOTICE 'Added customer_address column';
  END IF;
  
  -- Add customer_email if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'rental_invoices' 
    AND column_name = 'customer_email'
  ) THEN
    ALTER TABLE rental_invoices ADD COLUMN customer_email TEXT;
    RAISE NOTICE 'Added customer_email column';
  END IF;
END $$;

