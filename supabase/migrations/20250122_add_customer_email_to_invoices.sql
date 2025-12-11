-- Add missing columns to invoices table if they don't exist
DO $$ 
BEGIN
  -- Add customer_email
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_schema = 'public' 
                 AND table_name = 'invoices' 
                 AND column_name = 'customer_email') THEN
    ALTER TABLE invoices ADD COLUMN customer_email TEXT;
    RAISE NOTICE 'Added customer_email column to invoices table';
  END IF;

  -- Add customer_name
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_schema = 'public' 
                 AND table_name = 'invoices' 
                 AND column_name = 'customer_name') THEN
    ALTER TABLE invoices ADD COLUMN customer_name TEXT NOT NULL DEFAULT '';
    RAISE NOTICE 'Added customer_name column to invoices table';
  END IF;

  -- Add customer_id
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_schema = 'public' 
                 AND table_name = 'invoices' 
                 AND column_name = 'customer_id') THEN
    ALTER TABLE invoices ADD COLUMN customer_id TEXT NOT NULL DEFAULT '';
    RAISE NOTICE 'Added customer_id column to invoices table';
  END IF;

  -- Add invoice_number
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_schema = 'public' 
                 AND table_name = 'invoices' 
                 AND column_name = 'invoice_number') THEN
    ALTER TABLE invoices ADD COLUMN invoice_number TEXT NOT NULL DEFAULT '';
    RAISE NOTICE 'Added invoice_number column to invoices table';
  END IF;

  -- Add invoice_date
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_schema = 'public' 
                 AND table_name = 'invoices' 
                 AND column_name = 'invoice_date') THEN
    ALTER TABLE invoices ADD COLUMN invoice_date DATE NOT NULL DEFAULT CURRENT_DATE;
    RAISE NOTICE 'Added invoice_date column to invoices table';
  END IF;

  -- Add period_start
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_schema = 'public' 
                 AND table_name = 'invoices' 
                 AND column_name = 'period_start') THEN
    ALTER TABLE invoices ADD COLUMN period_start DATE NOT NULL DEFAULT CURRENT_DATE;
    RAISE NOTICE 'Added period_start column to invoices table';
  END IF;

  -- Add period_end
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_schema = 'public' 
                 AND table_name = 'invoices' 
                 AND column_name = 'period_end') THEN
    ALTER TABLE invoices ADD COLUMN period_end DATE NOT NULL DEFAULT CURRENT_DATE;
    RAISE NOTICE 'Added period_end column to invoices table';
  END IF;

  -- Add subtotal
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_schema = 'public' 
                 AND table_name = 'invoices' 
                 AND column_name = 'subtotal') THEN
    ALTER TABLE invoices ADD COLUMN subtotal DECIMAL(10, 2) NOT NULL DEFAULT 0;
    RAISE NOTICE 'Added subtotal column to invoices table';
  END IF;

  -- Add tax_amount
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_schema = 'public' 
                 AND table_name = 'invoices' 
                 AND column_name = 'tax_amount') THEN
    ALTER TABLE invoices ADD COLUMN tax_amount DECIMAL(10, 2) NOT NULL DEFAULT 0;
    RAISE NOTICE 'Added tax_amount column to invoices table';
  END IF;

  -- Add total_amount
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_schema = 'public' 
                 AND table_name = 'invoices' 
                 AND column_name = 'total_amount') THEN
    ALTER TABLE invoices ADD COLUMN total_amount DECIMAL(10, 2) NOT NULL DEFAULT 0;
    RAISE NOTICE 'Added total_amount column to invoices table';
  END IF;

  -- Add rental_days
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_schema = 'public' 
                 AND table_name = 'invoices' 
                 AND column_name = 'rental_days') THEN
    ALTER TABLE invoices ADD COLUMN rental_days INTEGER NOT NULL DEFAULT 0;
    RAISE NOTICE 'Added rental_days column to invoices table';
  END IF;

  -- Add cylinders_count
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_schema = 'public' 
                 AND table_name = 'invoices' 
                 AND column_name = 'cylinders_count') THEN
    ALTER TABLE invoices ADD COLUMN cylinders_count INTEGER NOT NULL DEFAULT 0;
    RAISE NOTICE 'Added cylinders_count column to invoices table';
  END IF;

  -- Add pdf_url
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_schema = 'public' 
                 AND table_name = 'invoices' 
                 AND column_name = 'pdf_url') THEN
    ALTER TABLE invoices ADD COLUMN pdf_url TEXT;
    RAISE NOTICE 'Added pdf_url column to invoices table';
  END IF;

  -- Add email_sent
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_schema = 'public' 
                 AND table_name = 'invoices' 
                 AND column_name = 'email_sent') THEN
    ALTER TABLE invoices ADD COLUMN email_sent BOOLEAN DEFAULT FALSE;
    RAISE NOTICE 'Added email_sent column to invoices table';
  END IF;

  -- Add email_sent_at
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_schema = 'public' 
                 AND table_name = 'invoices' 
                 AND column_name = 'email_sent_at') THEN
    ALTER TABLE invoices ADD COLUMN email_sent_at TIMESTAMP WITH TIME ZONE;
    RAISE NOTICE 'Added email_sent_at column to invoices table';
  END IF;

  RAISE NOTICE 'All invoice columns verified/added successfully';
END $$;

