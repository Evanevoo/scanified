-- Add email column to customers table if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_schema = 'public' 
                 AND table_name = 'customers' 
                 AND column_name = 'email') THEN
    ALTER TABLE customers ADD COLUMN email TEXT;
    RAISE NOTICE 'Added email column to customers table';
  ELSE
    RAISE NOTICE 'Email column already exists in customers table';
  END IF;
END $$;

-- Create index on email for faster lookups (optional but recommended)
CREATE INDEX IF NOT EXISTS idx_customers_email ON customers(email) WHERE email IS NOT NULL;

