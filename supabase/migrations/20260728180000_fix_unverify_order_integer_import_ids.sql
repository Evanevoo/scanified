-- Fix unverify_order: imported_invoices / imported_sales_receipts use integer PKs.
-- Previous RPC only accepted UUIDs, so import rows never reopened and verified_order_numbers stayed.
-- Also strip the order from verified_order_numbers and clear verified_* / auto_approved.

-- Applied remotely as migration fix_unverify_order_integer_import_ids (2026-07-28).
-- Source of truth is the live function; this file documents the change for the repo.
SELECT 1;
