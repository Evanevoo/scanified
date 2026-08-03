-- Fix two real bugs found by reviewing the live source of
-- public.assign_bottles_to_customer() (pulled via pg_get_functiondef and reviewed
-- for the first time -- it was not previously checked into the repo).
--
-- This is the primary transactional path for bottle assignment, called from
-- src/services/bottleAssignmentService.js on every Import Approvals verify/approve.
-- NOT applied automatically -- review, then run in the Supabase SQL editor.
--
-- Bug A (serious): the RETURN branch unassigned a bottle from whoever it was
-- currently assigned to with NO check that it actually belonged to the customer
-- being processed. A mismatched/wrong-order return scan could silently steal a
-- bottle away from a different customer with no error, no skip, no trace. The
-- SHIP branch right below it already does this check correctly (NULL vs
-- same-customer vs different-customer) -- RETURN is now symmetric with it: if the
-- bottle is assigned to someone else, it's skipped with an error instead of
-- silently reassigned.
--
-- Bug B: scan events were written to `scans`, a separate legacy table --
-- confirmed via src/utils/fetchBottleScansByBarcodes.js, which explicitly treats
-- `scans` as "legacyScans" and merges it back into `bottle_scans` results. Every
-- other read path in the app (auto-approve quantity matching, Import Approvals,
-- Scanned Orders, both mobile apps) queries `bottle_scans` directly, not `scans`.
-- Bottles assigned through this function were therefore invisible to auto-approve
-- matching unless something explicitly merged the two tables. Now inserts into
-- `bottle_scans` (column names adjusted: `bottle_barcode` not `barcode_number`,
-- `timestamp` not `scanned_at`, no `action` column -- `mode` already conveys
-- SHIP/RETURN direction, matching how every other scan-writer in this app uses it).
--
-- NOT changed here (separate, lower-severity finding, needs more thought): the
-- barcode-matching query (`ORDER BY LENGTH(barcode_number) DESC LIMIT 1`) has no
-- duplicate-match detection, mirroring the client-side ambiguous-match risk fixed
-- earlier in src/utils/findBottleByScanIdentifier.js -- but that client-side fix
-- doesn't reach into this function's own independent lookup. Left as a known gap.

CREATE OR REPLACE FUNCTION public.assign_bottles_to_customer(
  p_organization_id uuid,
  p_customer_id text,
  p_customer_name text,
  p_ship_barcodes text[],
  p_return_barcodes text[],
  p_import_record_id uuid DEFAULT NULL::uuid,
  p_import_table text DEFAULT 'imported_invoices'::text,
  p_user_id uuid DEFAULT NULL::uuid,
  p_default_rental_amount numeric DEFAULT 10,
  p_default_tax_rate numeric DEFAULT 0.11,
  p_order_number text DEFAULT NULL::text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  v_bottle RECORD;
  v_barcode TEXT;
  v_shipped INTEGER := 0;
  v_returned INTEGER := 0;
  v_skipped INTEGER := 0;
  v_created INTEGER := 0;
  v_errors TEXT[] := '{}';
BEGIN
  -- STEP 1: Process RETURN barcodes
  FOREACH v_barcode IN ARRAY COALESCE(p_return_barcodes, '{}')
  LOOP
    SELECT id, barcode_number, assigned_customer, customer_name, status
    INTO v_bottle
    FROM bottles
    WHERE organization_id = p_organization_id
      AND (barcode_number = v_barcode OR barcode_number = TRIM(LEADING '0' FROM v_barcode) OR TRIM(LEADING '0' FROM barcode_number) = TRIM(LEADING '0' FROM v_barcode))
    ORDER BY LENGTH(barcode_number) DESC
    LIMIT 1
    FOR UPDATE;

    IF FOUND THEN
      -- Bug A fix: only unassign if this bottle actually belongs to the customer
      -- whose order we're processing (or is already unassigned -- idempotent
      -- no-op). Previously unassigned unconditionally regardless of who it
      -- actually belonged to.
      IF v_bottle.assigned_customer IS NULL OR v_bottle.assigned_customer = '' OR v_bottle.assigned_customer = p_customer_id THEN
        UPDATE bottles SET
          previous_assigned_customer = assigned_customer,
          previous_status = status,
          assigned_customer = NULL,
          customer_name = NULL,
          status = 'empty',
          last_verified_order = p_order_number,
          updated_at = NOW()
        WHERE id = v_bottle.id;

        UPDATE rentals SET
          rental_end_date = CURRENT_DATE,
          closed_by_order = p_order_number,
          updated_at = NOW()
        WHERE organization_id = p_organization_id
          AND rental_end_date IS NULL
          AND (bottle_id = v_bottle.id OR bottle_barcode = v_bottle.barcode_number);

        INSERT INTO bottle_scans (
          organization_id, bottle_barcode, location, user_id, timestamp, created_at, mode, order_number,
          customer_id, customer_name
        ) VALUES (
          p_organization_id, v_barcode, 'Warehouse', p_user_id, NOW(), NOW(), 'RETURN', p_order_number,
          v_bottle.assigned_customer, v_bottle.customer_name
        );

        v_returned := v_returned + 1;
      ELSE
        v_skipped := v_skipped + 1;
        v_errors := array_append(v_errors,
          'RETURN barcode ' || v_barcode || ' is assigned to ' || COALESCE(v_bottle.customer_name, v_bottle.assigned_customer) || ', not ' || COALESCE(p_customer_name, p_customer_id) || ' -- not returned');
      END IF;
    ELSE
      v_errors := array_append(v_errors, 'RETURN barcode not found: ' || v_barcode);
    END IF;
  END LOOP;

  -- STEP 2: Process SHIP barcodes
  FOREACH v_barcode IN ARRAY COALESCE(p_ship_barcodes, '{}')
  LOOP
    SELECT id, barcode_number, assigned_customer, customer_name, status
    INTO v_bottle
    FROM bottles
    WHERE organization_id = p_organization_id
      AND (barcode_number = v_barcode OR barcode_number = TRIM(LEADING '0' FROM v_barcode) OR TRIM(LEADING '0' FROM barcode_number) = TRIM(LEADING '0' FROM v_barcode))
    ORDER BY LENGTH(barcode_number) DESC
    LIMIT 1
    FOR UPDATE;

    IF FOUND THEN
      IF v_bottle.assigned_customer IS NULL OR v_bottle.assigned_customer = '' THEN
        IF v_bottle.status IN ('available', 'empty', 'full', 'filled') THEN
          UPDATE bottles SET
            previous_assigned_customer = assigned_customer,
            previous_status = status,
            assigned_customer = p_customer_id,
            customer_name = p_customer_name,
            status = 'rented',
            last_verified_order = p_order_number,
            updated_at = NOW()
          WHERE id = v_bottle.id;

          INSERT INTO rentals (
            organization_id, customer_id, bottle_id, bottle_barcode,
            rental_start_date, rental_amount, tax_rate, rental_type,
            rental_order_number, customer_name,
            created_at, updated_at
          ) VALUES (
            p_organization_id, p_customer_id, v_bottle.id, v_bottle.barcode_number,
            CURRENT_DATE, p_default_rental_amount, p_default_tax_rate, 'monthly',
            p_order_number, p_customer_name,
            NOW(), NOW()
          );

          INSERT INTO bottle_scans (
            organization_id, bottle_barcode, location, user_id, timestamp, created_at, mode, order_number,
            customer_id, customer_name
          ) VALUES (
            p_organization_id, v_bottle.barcode_number, 'Warehouse', p_user_id, NOW(), NOW(), 'SHIP', p_order_number,
            p_customer_id, p_customer_name
          );

          v_shipped := v_shipped + 1;
        ELSE
          v_skipped := v_skipped + 1;
          v_errors := array_append(v_errors,
            'Bottle ' || v_barcode || ' has status "' || v_bottle.status || '" and cannot be assigned');
        END IF;

      ELSIF v_bottle.assigned_customer = p_customer_id THEN
        IF v_bottle.status <> 'rented' THEN
          UPDATE bottles SET
            status = 'rented',
            last_verified_order = p_order_number,
            updated_at = NOW()
          WHERE id = v_bottle.id;
        END IF;
        v_shipped := v_shipped + 1;

      ELSE
        v_skipped := v_skipped + 1;
        v_errors := array_append(v_errors,
          'Bottle ' || v_barcode || ' already assigned to ' || COALESCE(v_bottle.customer_name, v_bottle.assigned_customer));
      END IF;
    ELSE
      v_errors := array_append(v_errors, 'Bottle not found (add in Bottle Management first): ' || v_barcode);
    END IF;
  END LOOP;

  -- STEP 3: Mark import record as approved
  IF p_import_record_id IS NOT NULL THEN
    IF p_import_table = 'imported_invoices' THEN
      UPDATE imported_invoices SET
        status = 'approved', approved_at = NOW(),
        locked_by = NULL, locked_at = NULL, updated_at = NOW()
      WHERE id = p_import_record_id AND organization_id = p_organization_id;
    ELSIF p_import_table = 'imported_sales_receipts' THEN
      UPDATE imported_sales_receipts SET
        status = 'approved', approved_at = NOW(),
        locked_by = NULL, locked_at = NULL, updated_at = NOW()
      WHERE id = p_import_record_id AND organization_id = p_organization_id;
    END IF;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'shipped', v_shipped,
    'returned', v_returned,
    'skipped', v_skipped,
    'created', v_created,
    'errors', to_jsonb(v_errors)
  );
END;
$function$
