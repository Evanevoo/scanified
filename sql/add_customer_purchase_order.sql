-- Rental settings / invoice: store customer P.O. on customers row.
-- Fixes PostgREST PGRST204: Could not find the 'purchase_order' column of 'customers' in the schema cache.

alter table public.customers
  add column if not exists purchase_order text;

comment on column public.customers.purchase_order is
  'Optional customer purchase order reference; shown on rental invoice PDFs and email templates.';
