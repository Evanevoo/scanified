-- Persist rental invoice email template per organization (shared by all users; survives logout).
-- Run in Supabase SQL Editor if this column is missing.

ALTER TABLE public.organizations
ADD COLUMN IF NOT EXISTS rental_invoice_email_template jsonb;

COMMENT ON COLUMN public.organizations.rental_invoice_email_template IS
  'JSON: subject, body, signature, e_transfer_email, payment_methods for Settings → Email Message Template.';
