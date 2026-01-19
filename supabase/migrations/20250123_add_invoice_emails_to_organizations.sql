-- Add invoice email management fields to organizations table
-- This allows organizations to configure multiple email addresses for sending invoices
-- and select which one to use when sending invoices

-- Add invoice_emails field (JSON array of email addresses)
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_schema = 'public' 
                 AND table_name = 'organizations' 
                 AND column_name = 'invoice_emails') THEN
    ALTER TABLE organizations ADD COLUMN invoice_emails JSONB DEFAULT '[]'::jsonb;
    RAISE NOTICE 'Added invoice_emails column to organizations table';
  END IF;
EXCEPTION
  WHEN undefined_table THEN
    RAISE NOTICE 'organizations table does not exist. Please create it first.';
  WHEN OTHERS THEN
    RAISE NOTICE 'Error adding invoice_emails column: %', SQLERRM;
END $$;

-- Add default_invoice_email field (the email address to use by default)
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_schema = 'public' 
                 AND table_name = 'organizations' 
                 AND column_name = 'default_invoice_email') THEN
    ALTER TABLE organizations ADD COLUMN default_invoice_email TEXT;
    RAISE NOTICE 'Added default_invoice_email column to organizations table';
  END IF;
EXCEPTION
  WHEN undefined_table THEN
    RAISE NOTICE 'organizations table does not exist. Please create it first.';
  WHEN OTHERS THEN
    RAISE NOTICE 'Error adding default_invoice_email column: %', SQLERRM;
END $$;

-- Migrate existing organization.email to invoice_emails if invoice_emails is empty
DO $$ 
BEGIN
  UPDATE organizations 
  SET invoice_emails = jsonb_build_array(email)
  WHERE email IS NOT NULL 
    AND email != ''
    AND (invoice_emails IS NULL OR invoice_emails = '[]'::jsonb);
  
  RAISE NOTICE 'Migrated existing emails to invoice_emails';
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Error migrating emails: %', SQLERRM;
END $$;

-- Set default_invoice_email to organization.email if not set
DO $$ 
BEGIN
  UPDATE organizations 
  SET default_invoice_email = email
  WHERE email IS NOT NULL 
    AND email != ''
    AND default_invoice_email IS NULL;
  
  RAISE NOTICE 'Set default_invoice_email from organization.email';
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Error setting default_invoice_email: %', SQLERRM;
END $$;
