-- Audit log for rental invoice emails + optional stored PDF path in Supabase Storage (bucket: invoices).
--
-- Works on older DBs that lack public.subscriptions / public.subscription_invoices
-- (no FK to those tables). IDs are stored as plain UUIDs for app correlation.
--
-- Prerequisite: public.organizations and public.profiles (for RLS).
-- Storage: create bucket + RLS — run sql/create_invoices_storage_bucket.sql

CREATE TABLE IF NOT EXISTS public.invoice_email_sends (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  subscription_id uuid,
  subscription_invoice_id uuid,
  customer_id text,
  invoice_number text NOT NULL,
  period_start date,
  period_end date,
  emailed_to text[] NOT NULL DEFAULT '{}',
  email_from text,
  subject text,
  sent_at timestamptz NOT NULL DEFAULT now(),
  sent_by_user_id uuid,
  message_id text,
  pdf_storage_path text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_invoice_email_sends_org_sent
  ON public.invoice_email_sends (organization_id, sent_at DESC);

CREATE INDEX IF NOT EXISTS idx_invoice_email_sends_invoice_number
  ON public.invoice_email_sends (organization_id, invoice_number);

COMMENT ON TABLE public.invoice_email_sends IS
  'One row per successful rental invoice email; pdf_storage_path points at Supabase Storage bucket invoices.';

COMMENT ON COLUMN public.invoice_email_sends.subscription_id IS
  'Optional rentals row id when public.subscriptions exists in the app; not enforced by FK.';

COMMENT ON COLUMN public.invoice_email_sends.subscription_invoice_id IS
  'Optional subscription_invoices.id when that table exists; not enforced by FK.';

ALTER TABLE public.invoice_email_sends ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS invoice_email_sends_org_select ON public.invoice_email_sends;
CREATE POLICY invoice_email_sends_org_select ON public.invoice_email_sends
  FOR SELECT TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM public.profiles WHERE id = auth.uid()
    )
  );

DROP POLICY IF EXISTS invoice_email_sends_org_insert ON public.invoice_email_sends;
CREATE POLICY invoice_email_sends_org_insert ON public.invoice_email_sends
  FOR INSERT TO authenticated
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM public.profiles WHERE id = auth.uid()
    )
  );

-- Optional: add FKs after you run sql/subscription_system_migration.sql
-- DO $fk$
-- BEGIN
--   IF to_regclass('public.subscriptions') IS NOT NULL THEN
--     ALTER TABLE public.invoice_email_sends
--       DROP CONSTRAINT IF EXISTS invoice_email_sends_subscription_id_fkey;
--     ALTER TABLE public.invoice_email_sends
--       ADD CONSTRAINT invoice_email_sends_subscription_id_fkey
--       FOREIGN KEY (subscription_id) REFERENCES public.subscriptions(id) ON DELETE SET NULL;
--   END IF;
--   IF to_regclass('public.subscription_invoices') IS NOT NULL THEN
--     ALTER TABLE public.invoice_email_sends
--       DROP CONSTRAINT IF EXISTS invoice_email_sends_subscription_invoice_id_fkey;
--     ALTER TABLE public.invoice_email_sends
--       ADD CONSTRAINT invoice_email_sends_subscription_invoice_id_fkey
--       FOREIGN KEY (subscription_invoice_id) REFERENCES public.subscription_invoices(id) ON DELETE SET NULL;
--   END IF;
-- END $fk$;
