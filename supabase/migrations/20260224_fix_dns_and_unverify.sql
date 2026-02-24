-- =============================================================================
-- Fix DNS + Unverify: proper order-scoped verification/rollback
-- =============================================================================

-- 1. Tracking columns
ALTER TABLE bottles ADD COLUMN IF NOT EXISTS last_verified_order TEXT;
ALTER TABLE rentals ADD COLUMN IF NOT EXISTS closed_by_order TEXT;
ALTER TABLE rentals ADD COLUMN IF NOT EXISTS rental_order_number TEXT;
ALTER TABLE rentals ADD COLUMN IF NOT EXISTS import_record_id UUID;
ALTER TABLE rentals ADD COLUMN IF NOT EXISTS customer_name TEXT;
-- Ensure scans has customer columns for return history (bottle detail "Return from X")
ALTER TABLE scans ADD COLUMN IF NOT EXISTS customer_id TEXT;
ALTER TABLE scans ADD COLUMN IF NOT EXISTS customer_name TEXT;

-- 2. Drop old function signatures so we can recreate with new params
DROP FUNCTION IF EXISTS assign_bottles_to_customer(UUID, TEXT, TEXT, TEXT[], TEXT[], UUID, TEXT, UUID, DECIMAL, DECIMAL);
DROP FUNCTION IF EXISTS unverify_order(UUID, UUID, TEXT, UUID);
DROP FUNCTION IF EXISTS unverify_order(UUID, UUID, TEXT, UUID, TEXT);

-- =============================================================================
-- 3. ASSIGN BOTTLES TO CUSTOMER (order-scoped)
-- =============================================================================
CREATE OR REPLACE FUNCTION assign_bottles_to_customer(
  p_organization_id UUID,
  p_customer_id TEXT,
  p_customer_name TEXT,
  p_ship_barcodes TEXT[],
  p_return_barcodes TEXT[],
  p_import_record_id UUID DEFAULT NULL,
  p_import_table TEXT DEFAULT 'imported_invoices',
  p_user_id UUID DEFAULT NULL,
  p_default_rental_amount DECIMAL DEFAULT 10,
  p_default_tax_rate DECIMAL DEFAULT 0.11,
  p_order_number TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
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

      INSERT INTO scans (
        organization_id, barcode_number, location, scanned_by, scanned_at, created_at, mode, action, order_number,
        customer_id, customer_name
      ) VALUES (
        p_organization_id, v_barcode, 'Warehouse', p_user_id, NOW(), NOW(), 'RETURN', 'in', p_order_number,
        v_bottle.assigned_customer, v_bottle.customer_name
      );

      v_returned := v_returned + 1;
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

          INSERT INTO scans (
            organization_id, barcode_number, location, scanned_by, scanned_at, created_at, mode, action, order_number,
            customer_id, customer_name
          ) VALUES (
            p_organization_id, v_bottle.barcode_number, 'Warehouse', p_user_id, NOW(), NOW(), 'SHIP', 'out', p_order_number,
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
$$;

GRANT EXECUTE ON FUNCTION assign_bottles_to_customer(UUID, TEXT, TEXT, TEXT[], TEXT[], UUID, TEXT, UUID, DECIMAL, DECIMAL, TEXT) TO authenticated;

-- =============================================================================
-- 4. UNVERIFY ORDER (order-scoped rollback)
-- =============================================================================
-- p_import_record_id: TEXT so client can pass UUID or numeric id (only UUID triggers import record reset)
CREATE OR REPLACE FUNCTION unverify_order(
  p_import_record_id TEXT,
  p_organization_id UUID,
  p_import_table TEXT DEFAULT 'imported_invoices',
  p_user_id UUID DEFAULT NULL,
  p_order_number TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_bottle RECORD;
  v_restored INTEGER := 0;
  v_dns_deleted INTEGER := 0;
  v_rentals_opened_deleted INTEGER := 0;
  v_rentals_reopened INTEGER := 0;
  v_fallback_unassigned INTEGER := 0;
  v_barcode TEXT;
  v_order_norm TEXT;
  v_row_count INTEGER;
  v_import_id_uuid UUID;
BEGIN
  v_import_id_uuid := NULL;
  IF p_import_record_id IS NOT NULL AND p_import_record_id <> '' AND p_import_record_id ~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$' THEN
    v_import_id_uuid := p_import_record_id::UUID;
  END IF;
  v_order_norm := CASE WHEN p_order_number IS NOT NULL THEN TRIM(LEADING '0' FROM p_order_number) ELSE NULL END;
  IF p_order_number IS NOT NULL AND p_order_number <> '' THEN
    -- === ORDER-SCOPED ROLLBACK (preferred) ===

    -- 1. Restore bottles modified during this verification
    --    SHIP bottles: were assigned → restore to previous (unassigned/warehouse)
    --    RETURN bottles: were unassigned → restore to previous (assigned to customer)
    FOR v_bottle IN
      SELECT b.id, b.previous_assigned_customer, b.previous_status
      FROM bottles b
      WHERE b.organization_id = p_organization_id
        AND b.last_verified_order = p_order_number
        AND b.previous_status IS NOT NULL
      FOR UPDATE
    LOOP
      UPDATE bottles SET
        assigned_customer = previous_assigned_customer,
        customer_name = CASE WHEN previous_assigned_customer IS NOT NULL
          THEN customer_name ELSE NULL END,
        status = COALESCE(previous_status, 'available'),
        previous_assigned_customer = NULL,
        previous_status = NULL,
        last_verified_order = NULL,
        updated_at = NOW()
      WHERE id = v_bottle.id;

      v_restored := v_restored + 1;
    END LOOP;

    -- 2. Delete rentals OPENED during this order (for shipped bottles)
    DELETE FROM rentals
    WHERE organization_id = p_organization_id
      AND rental_order_number = p_order_number
      AND rental_end_date IS NULL
      AND is_dns IS NOT TRUE;

    GET DIAGNOSTICS v_rentals_opened_deleted = ROW_COUNT;

    -- 3. Reopen rentals CLOSED during this order (for returned bottles)
    UPDATE rentals SET
      rental_end_date = NULL,
      closed_by_order = NULL,
      updated_at = NOW()
    WHERE organization_id = p_organization_id
      AND closed_by_order = p_order_number;

    GET DIAGNOSTICS v_rentals_reopened = ROW_COUNT;

    -- 4. Delete DNS rentals for this order
    DELETE FROM rentals
    WHERE organization_id = p_organization_id
      AND is_dns = true
      AND dns_order_number = p_order_number;

    GET DIAGNOSTICS v_dns_deleted = ROW_COUNT;

    -- 5. FALLBACK: If no bottles had last_verified_order (e.g. verify ran before migration or assign failed),
    --    unassign bottles that were RETURNed on this order (from scans + bottle_scans) so unverify still fixes state.
    IF v_restored = 0 AND v_rentals_reopened = 0 THEN
      FOR v_barcode IN
        SELECT DISTINCT s.barcode_number
        FROM scans s
        WHERE s.organization_id = p_organization_id
          AND (s.order_number = p_order_number OR s.order_number = v_order_norm OR TRIM(LEADING '0' FROM s.order_number) = v_order_norm)
          AND UPPER(COALESCE(s.mode, '')) IN ('RETURN', 'PICKUP')
          AND s.barcode_number IS NOT NULL
        UNION
        SELECT DISTINCT bs.bottle_barcode
        FROM bottle_scans bs
        WHERE bs.organization_id = p_organization_id
          AND (bs.order_number = p_order_number OR bs.order_number = v_order_norm OR TRIM(LEADING '0' FROM bs.order_number) = v_order_norm)
          AND UPPER(COALESCE(bs.mode, '')) IN ('RETURN', 'PICKUP')
          AND bs.bottle_barcode IS NOT NULL
      LOOP
        UPDATE bottles SET
          assigned_customer = NULL,
          customer_name = NULL,
          status = 'empty',
          previous_assigned_customer = NULL,
          previous_status = NULL,
          last_verified_order = NULL,
          updated_at = NOW()
        WHERE organization_id = p_organization_id
          AND (barcode_number = v_barcode OR barcode_number = TRIM(LEADING '0' FROM v_barcode) OR TRIM(LEADING '0' FROM barcode_number) = TRIM(LEADING '0' FROM v_barcode));

        GET DIAGNOSTICS v_row_count = ROW_COUNT;
        IF v_row_count > 0 THEN
          UPDATE rentals SET
            rental_end_date = CURRENT_DATE,
            closed_by_order = NULL,
            updated_at = NOW()
          WHERE organization_id = p_organization_id
            AND rental_end_date IS NULL
            AND (bottle_barcode = v_barcode OR bottle_barcode = TRIM(LEADING '0' FROM v_barcode));
          v_fallback_unassigned := v_fallback_unassigned + 1;
        END IF;
      END LOOP;
    END IF;

  ELSE
    -- === FALLBACK: unscoped (backward compat for old records without order tracking) ===
    FOR v_bottle IN
      SELECT b.id, b.previous_assigned_customer, b.previous_status
      FROM bottles b
      WHERE b.organization_id = p_organization_id
        AND b.previous_status IS NOT NULL
      FOR UPDATE
    LOOP
      UPDATE bottles SET
        assigned_customer = previous_assigned_customer,
        customer_name = CASE WHEN previous_assigned_customer IS NOT NULL
          THEN customer_name ELSE NULL END,
        status = COALESCE(previous_status, 'available'),
        previous_assigned_customer = NULL,
        previous_status = NULL,
        last_verified_order = NULL,
        updated_at = NOW()
      WHERE id = v_bottle.id;

      v_restored := v_restored + 1;
    END LOOP;

    DELETE FROM rentals
    WHERE organization_id = p_organization_id
      AND is_dns = true
      AND bottle_id IS NULL;

    GET DIAGNOSTICS v_dns_deleted = ROW_COUNT;
  END IF;

  -- Reset import record status (only when p_import_record_id is a valid UUID)
  IF v_import_id_uuid IS NOT NULL THEN
    IF p_import_table = 'imported_invoices' THEN
      UPDATE imported_invoices SET
        status = 'pending', approved_at = NULL,
        locked_by = NULL, locked_at = NULL, updated_at = NOW()
      WHERE id = v_import_id_uuid AND organization_id = p_organization_id;
    ELSIF p_import_table = 'imported_sales_receipts' THEN
      UPDATE imported_sales_receipts SET
        status = 'pending', approved_at = NULL,
        locked_by = NULL, locked_at = NULL, updated_at = NOW()
      WHERE id = v_import_id_uuid AND organization_id = p_organization_id;
    END IF;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'bottles_restored', v_restored,
    'dns_records_deleted', v_dns_deleted,
    'rentals_opened_deleted', v_rentals_opened_deleted,
    'rentals_reopened', v_rentals_reopened,
    'fallback_unassigned', v_fallback_unassigned
  );
END;
$$;

GRANT EXECUTE ON FUNCTION unverify_order(TEXT, UUID, TEXT, UUID, TEXT) TO authenticated;
