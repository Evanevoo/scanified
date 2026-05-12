-- =============================================================================
-- Stuck import / Order Verification — discovery + optional reopen (Scanified)
-- Run in Supabase SQL Editor. Read each section; do not run UPDATEs blindly.
-- =============================================================================
-- Your schema uses uploaded_at on imported_invoices (not updated_at).
-- organization_id is type uuid — never use placeholder text inside quotes.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- SECTION A — Find organization UUIDs (no parameters; safe to run)
-- -----------------------------------------------------------------------------

-- Orgs that have invoice imports (most useful)
SELECT
  organization_id,
  COUNT(*) AS invoice_import_rows
FROM imported_invoices
GROUP BY organization_id
ORDER BY invoice_import_rows DESC;

-- Orgs that have sales receipt imports
SELECT
  organization_id,
  COUNT(*) AS receipt_import_rows
FROM imported_sales_receipts
GROUP BY organization_id
ORDER BY receipt_import_rows DESC;

-- Optional: org names (if you use public.organizations)
SELECT id, name, deleted_at
FROM organizations
WHERE deleted_at IS NULL
ORDER BY name;

-- Optional: map your login email → organization_id (edit email only)
SELECT
  p.id AS profile_id,
  p.email,
  p.organization_id,
  o.name AS organization_name
FROM profiles p
LEFT JOIN organizations o ON o.id = p.organization_id
WHERE lower(p.email) = lower('you@yourcompany.com');  -- <<< EDIT THIS EMAIL


-- -----------------------------------------------------------------------------
-- SECTION B — "Stuck" imports: still looks verified/approved (all orgs, capped)
-- Adjust filters if your status values differ.
-- -----------------------------------------------------------------------------

SELECT
  'invoice' AS source,
  organization_id,
  id,
  status,
  approved_at,
  verified_at,
  verified_by,
  auto_approved,
  uploaded_at
FROM imported_invoices
WHERE status IN ('approved', 'verified')
   OR approved_at IS NOT NULL
   OR verified_at IS NOT NULL
ORDER BY uploaded_at DESC NULLS LAST
LIMIT 100;

SELECT
  'receipt' AS source,
  organization_id,
  id,
  status,
  approved_at,
  verified_at,
  verified_by,
  uploaded_at
FROM imported_sales_receipts
WHERE status IN ('approved', 'verified')
   OR approved_at IS NOT NULL
   OR verified_at IS NOT NULL
ORDER BY uploaded_at DESC NULLS LAST
LIMIT 100;


-- -----------------------------------------------------------------------------
-- SECTION C — Same as B but scoped to ONE org (pick ONE pattern only)
-- -----------------------------------------------------------------------------

-- Pattern C1: paste a real uuid from Section A (valid example shape only — replace entirely)
/*
SELECT
  'invoice' AS source,
  id,
  status,
  approved_at,
  verified_at,
  auto_approved,
  uploaded_at
FROM imported_invoices
WHERE organization_id = '00000000-0000-0000-0000-000000000000'::uuid  -- REPLACE whole uuid
  AND (
    status IN ('approved', 'verified')
    OR approved_at IS NOT NULL
    OR verified_at IS NOT NULL
  )
ORDER BY uploaded_at DESC NULLS LAST;
*/

-- Pattern C2: scope by your profile email (edit email; no uuid typing)
WITH target AS (
  SELECT organization_id
  FROM profiles
  WHERE lower(email) = lower('you@yourcompany.com')  -- <<< EDIT
  LIMIT 1
)
SELECT
  'invoice' AS source,
  i.id,
  i.status,
  i.approved_at,
  i.verified_at,
  i.auto_approved,
  i.uploaded_at,
  left(i.data::text, 200) AS data_preview
FROM imported_invoices i
JOIN target t ON t.organization_id = i.organization_id
WHERE i.status IN ('approved', 'verified')
   OR i.approved_at IS NOT NULL
   OR i.verified_at IS NOT NULL
ORDER BY i.uploaded_at DESC NULLS LAST;


-- -----------------------------------------------------------------------------
-- SECTION D — OPTIONAL FIX: reopen imports so they show in Order Verification
-- Only for rows you have reviewed in Section B/C. Uncomment ONE block and run.
-- This does NOT re-assign bottles; it only fixes the import row flags + JSON key.
-- -----------------------------------------------------------------------------

-- D1 — Reopen one row by primary key (replace UUID; use invoice or receipt block only).
-- Invoices: includes auto_approved. Receipts: omit auto_approved if that column does not exist.

/*
UPDATE imported_invoices
SET
  status = 'pending',
  approved_at = NULL,
  verified_at = NULL,
  verified_by = NULL,
  auto_approved = false,
  data = jsonb_set(coalesce(data, '{}'::jsonb), '{verified_order_numbers}', '[]'::jsonb, true)
WHERE id = 'REPLACE-WITH-INVOICE-ROW-UUID'::uuid;
*/

/*
UPDATE imported_sales_receipts
SET
  status = 'pending',
  approved_at = NULL,
  verified_at = NULL,
  verified_by = NULL,
  data = jsonb_set(coalesce(data, '{}'::jsonb), '{verified_order_numbers}', '[]'::jsonb, true)
WHERE id = 'REPLACE-WITH-RECEIPT-ROW-UUID'::uuid;
*/
