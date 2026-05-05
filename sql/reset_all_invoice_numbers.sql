-- =============================================================================
-- RESET ALL INVOICE NUMBERS (destructive)
-- =============================================================================
-- Run in Supabase Dashboard → SQL Editor (service role / postgres).
--
-- Skips any table that does not exist (e.g. no subscription_invoices in older DBs).
--
-- WARNING: Removes invoice rows from the tables that exist. Back up first.
-- =============================================================================

BEGIN;

DO $reset$
BEGIN
  -- Newer schema: subscription_invoices + children
  IF to_regclass('public.subscription_invoices') IS NOT NULL THEN
    IF to_regclass('public.invoice_line_items') IS NOT NULL THEN
      EXECUTE
        'DELETE FROM public.invoice_line_items
         WHERE invoice_id IN (SELECT id FROM public.subscription_invoices)';
    END IF;
    IF to_regclass('public.payments') IS NOT NULL THEN
      EXECUTE
        'DELETE FROM public.payments
         WHERE invoice_id IN (SELECT id FROM public.subscription_invoices)';
    END IF;
    EXECUTE 'DELETE FROM public.subscription_invoices';
  END IF;

  -- Legacy rental invoices (public.invoices)
  IF to_regclass('public.invoices') IS NOT NULL THEN
    IF to_regclass('public.invoice_line_items') IS NOT NULL THEN
      EXECUTE
        'DELETE FROM public.invoice_line_items
         WHERE invoice_id IN (SELECT id FROM public.invoices)';
    END IF;
    IF to_regclass('public.payments') IS NOT NULL THEN
      EXECUTE
        'DELETE FROM public.payments
         WHERE invoice_id IN (SELECT id FROM public.invoices)';
    END IF;
    EXECUTE 'DELETE FROM public.invoices';
  END IF;

  -- Counter for W00000-style reservation (invoiceUtils)
  IF to_regclass('public.invoice_settings') IS NOT NULL THEN
    EXECUTE
      'UPDATE public.invoice_settings
       SET next_invoice_number = 0, updated_at = now()';
  END IF;
END
$reset$;

COMMIT;
