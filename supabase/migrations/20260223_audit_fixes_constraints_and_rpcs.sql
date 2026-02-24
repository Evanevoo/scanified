-- =============================================================================
-- AUDIT FIX MIGRATION: Constraints, Enums, RPCs, and Integrity Improvements
-- Date: 2026-02-23
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. Standardize bottle status values (RENTED -> rented, etc.)
-- ---------------------------------------------------------------------------
UPDATE bottles SET status = LOWER(status) WHERE status IS DISTINCT FROM LOWER(status);

-- ---------------------------------------------------------------------------
-- 2. Add CHECK constraint on bottles.status
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'bottles_status_check'
  ) THEN
    ALTER TABLE bottles ADD CONSTRAINT bottles_status_check
      CHECK (status IN ('available', 'rented', 'empty', 'full', 'filled', 'maintenance', 'retired', 'lost'));
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 2b. Ensure bottles.updated_at exists (RPCs and triggers may reference it)
-- ---------------------------------------------------------------------------
ALTER TABLE bottles ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
-- Ensure rentals.updated_at and rentals.bottle_barcode exist (return_bottles_to_warehouse, assign_bottles_to_customer)
ALTER TABLE rentals ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE rentals ADD COLUMN IF NOT EXISTS bottle_barcode TEXT;
-- Ensure scans has columns used by RPC audit trail inserts
ALTER TABLE scans ADD COLUMN IF NOT EXISTS scanned_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE scans ADD COLUMN IF NOT EXISTS scanned_by UUID;
ALTER TABLE scans ADD COLUMN IF NOT EXISTS mode TEXT;
ALTER TABLE scans ADD COLUMN IF NOT EXISTS order_number TEXT;

-- ---------------------------------------------------------------------------
-- 3. Add CHECK constraint on rental_invoices.status
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'rental_invoices_status_check'
  ) THEN
    ALTER TABLE rental_invoices ADD CONSTRAINT rental_invoices_status_check
      CHECK (status IN ('draft', 'sent', 'paid', 'cancelled', 'overdue', 'partial'));
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 4. Add status + amount_paid columns to invoices table if missing
-- ---------------------------------------------------------------------------
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'draft';
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS amount_paid DECIMAL(10,2) DEFAULT 0;

-- ---------------------------------------------------------------------------
-- 5. Add unique constraint on invoices (organization_id, invoice_number)
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'invoices_org_invoice_number_unique'
  ) THEN
    ALTER TABLE invoices ADD CONSTRAINT invoices_org_invoice_number_unique
      UNIQUE (organization_id, invoice_number);
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 6. Add unique constraint on bottle_scans for deduplication
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes WHERE indexname = 'bottle_scans_dedup_idx'
  ) THEN
    CREATE UNIQUE INDEX bottle_scans_dedup_idx
      ON bottle_scans (organization_id, bottle_barcode, order_number, mode, timestamp)
      WHERE bottle_barcode IS NOT NULL AND order_number IS NOT NULL;
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 7. Add FK on rentals.bottle_id -> bottles(id) if missing
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'rentals_bottle_id_fkey'
  ) THEN
    ALTER TABLE rentals ADD CONSTRAINT rentals_bottle_id_fkey
      FOREIGN KEY (bottle_id) REFERENCES bottles(id) ON DELETE SET NULL;
  END IF;
EXCEPTION WHEN others THEN
  RAISE NOTICE 'Could not add rentals_bottle_id_fkey: %', SQLERRM;
END $$;

-- ---------------------------------------------------------------------------
-- 8. Add indexes for performance on commonly queried columns
-- ---------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_rentals_bottle_id ON rentals(bottle_id);
CREATE INDEX IF NOT EXISTS idx_rentals_customer_id ON rentals(customer_id);
CREATE INDEX IF NOT EXISTS idx_rentals_org_end_date ON rentals(organization_id, rental_end_date);
CREATE INDEX IF NOT EXISTS idx_bottle_scans_barcode ON bottle_scans(bottle_barcode);
CREATE INDEX IF NOT EXISTS idx_bottle_scans_order ON bottle_scans(order_number);
CREATE INDEX IF NOT EXISTS idx_bottles_assigned ON bottles(assigned_customer) WHERE assigned_customer IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_bottles_org_status ON bottles(organization_id, status);

-- ---------------------------------------------------------------------------
-- 9. Add previous_assigned_customer and previous_status to bottles
--    (for reversible operations)
-- ---------------------------------------------------------------------------
ALTER TABLE bottles ADD COLUMN IF NOT EXISTS previous_assigned_customer TEXT;
ALTER TABLE bottles ADD COLUMN IF NOT EXISTS previous_status TEXT;

-- ---------------------------------------------------------------------------
-- 10. Add locked_by / locked_at to imported_invoices for concurrent verification prevention
-- ---------------------------------------------------------------------------
ALTER TABLE imported_invoices ADD COLUMN IF NOT EXISTS locked_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE imported_invoices ADD COLUMN IF NOT EXISTS locked_at TIMESTAMPTZ;

-- ---------------------------------------------------------------------------
-- 11. Add locked_by / locked_at to imported_sales_receipts
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  ALTER TABLE imported_sales_receipts ADD COLUMN IF NOT EXISTS locked_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;
  ALTER TABLE imported_sales_receipts ADD COLUMN IF NOT EXISTS locked_at TIMESTAMPTZ;
EXCEPTION WHEN undefined_table THEN
  RAISE NOTICE 'imported_sales_receipts table does not exist';
END $$;

-- =============================================================================
-- 12. ATOMIC INVOICE NUMBER GENERATION (fixes INV-1 race condition)
-- =============================================================================
CREATE OR REPLACE FUNCTION reserve_invoice_numbers(
  p_organization_id UUID,
  p_count INTEGER DEFAULT 1
)
RETURNS TEXT[]
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_prefix TEXT;
  v_next_number INTEGER;
  v_numbers TEXT[] := '{}';
  v_i INTEGER;
BEGIN
  -- Atomic read + increment with row lock
  UPDATE invoice_settings
  SET next_invoice_number = next_invoice_number + p_count,
      updated_at = NOW()
  WHERE organization_id = p_organization_id
  RETURNING invoice_prefix, next_invoice_number - p_count
  INTO v_prefix, v_next_number;

  -- If no settings row exists, create one
  IF NOT FOUND THEN
    INSERT INTO invoice_settings (organization_id, invoice_prefix, next_invoice_number)
    VALUES (p_organization_id, 'W', p_count + 1)
    ON CONFLICT (organization_id) DO UPDATE
      SET next_invoice_number = invoice_settings.next_invoice_number + p_count,
          updated_at = NOW()
    RETURNING invoice_prefix, next_invoice_number - p_count
    INTO v_prefix, v_next_number;
  END IF;

  v_prefix := COALESCE(v_prefix, 'W');
  v_next_number := COALESCE(v_next_number, 1);

  FOR v_i IN 0..(p_count - 1) LOOP
    v_numbers := array_append(v_numbers, v_prefix || LPAD((v_next_number + v_i)::TEXT, 5, '0'));
  END LOOP;

  RETURN v_numbers;
END;
$$;

GRANT EXECUTE ON FUNCTION reserve_invoice_numbers(UUID, INTEGER) TO authenticated;

-- =============================================================================
-- 13. TRANSACTIONAL WAREHOUSE RETURN (fixes RNT-1: closes rentals)
-- =============================================================================
CREATE OR REPLACE FUNCTION return_bottles_to_warehouse(
  p_bottle_ids UUID[],
  p_organization_id UUID,
  p_user_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_bottle RECORD;
  v_updated_count INTEGER := 0;
  v_rentals_closed INTEGER := 0;
BEGIN
  FOR v_bottle IN
    SELECT id, barcode_number, assigned_customer, status
    FROM bottles
    WHERE id = ANY(p_bottle_ids)
      AND organization_id = p_organization_id
    FOR UPDATE
  LOOP
    -- Save previous state for reversibility
    UPDATE bottles SET
      previous_assigned_customer = assigned_customer,
      previous_status = status,
      assigned_customer = NULL,
      customer_name = NULL,
      location = NULL,
      status = 'available',
      updated_at = NOW()
    WHERE id = v_bottle.id;

    v_updated_count := v_updated_count + 1;

    -- Close any active rentals for this bottle
    UPDATE rentals SET
      rental_end_date = CURRENT_DATE,
      updated_at = NOW()
    WHERE bottle_id = v_bottle.id
      AND organization_id = p_organization_id
      AND rental_end_date IS NULL;

    IF FOUND THEN
      v_rentals_closed := v_rentals_closed + 1;
    END IF;

    -- Also close rentals matched by barcode (for DNS or older records)
    UPDATE rentals SET
      rental_end_date = CURRENT_DATE,
      updated_at = NOW()
    WHERE bottle_barcode = v_bottle.barcode_number
      AND organization_id = p_organization_id
      AND rental_end_date IS NULL
      AND bottle_id IS DISTINCT FROM v_bottle.id;

    INSERT INTO scans (
      organization_id, barcode_number, location, scanned_by, scanned_at, created_at, mode, action
    ) VALUES (
      p_organization_id, v_bottle.barcode_number, 'Warehouse', p_user_id, NOW(), NOW(), 'RETURN', 'in'
    );
  END LOOP;

  RETURN jsonb_build_object(
    'success', true,
    'bottles_updated', v_updated_count,
    'rentals_closed', v_rentals_closed
  );
END;
$$;

GRANT EXECUTE ON FUNCTION return_bottles_to_warehouse(UUID[], UUID, UUID) TO authenticated;

-- =============================================================================
-- 14. TRANSACTIONAL BOTTLE ASSIGNMENT (fixes BTL-1, BTL-2, VER-1, VER-2)
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
  p_default_rental_amount DECIMAL DEFAULT 10.00,
  p_default_tax_rate DECIMAL DEFAULT 0.11
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_barcode TEXT;
  v_bottle RECORD;
  v_shipped INTEGER := 0;
  v_returned INTEGER := 0;
  v_skipped INTEGER := 0;
  v_created INTEGER := 0;
  v_errors TEXT[] := '{}';
BEGIN
  -- Lock the import record to prevent concurrent verification
  IF p_import_record_id IS NOT NULL THEN
    IF p_import_table = 'imported_invoices' THEN
      UPDATE imported_invoices
      SET locked_by = p_user_id, locked_at = NOW()
      WHERE id = p_import_record_id
        AND organization_id = p_organization_id
        AND (locked_by IS NULL OR locked_by = p_user_id
             OR locked_at < NOW() - INTERVAL '5 minutes');

      IF NOT FOUND THEN
        RETURN jsonb_build_object(
          'success', false,
          'error', 'Record is locked by another user. Please try again in a few minutes.'
        );
      END IF;
    ELSIF p_import_table = 'imported_sales_receipts' THEN
      UPDATE imported_sales_receipts
      SET locked_by = p_user_id, locked_at = NOW()
      WHERE id = p_import_record_id
        AND organization_id = p_organization_id
        AND (locked_by IS NULL OR locked_by = p_user_id
             OR locked_at < NOW() - INTERVAL '5 minutes');

      IF NOT FOUND THEN
        RETURN jsonb_build_object(
          'success', false,
          'error', 'Record is locked by another user. Please try again in a few minutes.'
        );
      END IF;
    END IF;
  END IF;

  -- STEP 1: Process RETURN barcodes first
  FOREACH v_barcode IN ARRAY COALESCE(p_return_barcodes, '{}')
  LOOP
    SELECT id, barcode_number, assigned_customer, status
    INTO v_bottle
    FROM bottles
    WHERE barcode_number = v_barcode
      AND organization_id = p_organization_id
    FOR UPDATE;

    IF FOUND THEN
      -- Save previous state and unassign
      UPDATE bottles SET
        previous_assigned_customer = assigned_customer,
        previous_status = status,
        assigned_customer = NULL,
        customer_name = NULL,
        status = 'empty',
        updated_at = NOW()
      WHERE id = v_bottle.id;

      -- Close active rentals
      UPDATE rentals SET
        rental_end_date = CURRENT_DATE,
        updated_at = NOW()
      WHERE organization_id = p_organization_id
        AND rental_end_date IS NULL
        AND (bottle_id = v_bottle.id OR bottle_barcode = v_barcode);

      INSERT INTO scans (
        organization_id, barcode_number, location, scanned_by, scanned_at, created_at, mode, action
      ) VALUES (
        p_organization_id, v_barcode, 'Warehouse', p_user_id, NOW(), NOW(), 'RETURN', 'in'
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
    WHERE barcode_number = v_barcode
      AND organization_id = p_organization_id
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
            updated_at = NOW()
          WHERE id = v_bottle.id;

          INSERT INTO rentals (
            organization_id, customer_id, bottle_id, bottle_barcode,
            rental_start_date, rental_amount, tax_rate, rental_type,
            created_at, updated_at
          ) VALUES (
            p_organization_id, p_customer_id, v_bottle.id, v_barcode,
            CURRENT_DATE, p_default_rental_amount, p_default_tax_rate, 'monthly',
            NOW(), NOW()
          );

          INSERT INTO scans (
            organization_id, barcode_number, location, scanned_by, scanned_at, created_at, mode, action, order_number
          ) VALUES (
            p_organization_id, v_barcode, p_customer_name, p_user_id, NOW(), NOW(), 'SHIP', 'out', NULL
          );

          v_shipped := v_shipped + 1;
        ELSE
          v_skipped := v_skipped + 1;
          v_errors := array_append(v_errors,
            'Bottle ' || v_barcode || ' has status "' || v_bottle.status || '" and cannot be assigned');
        END IF;

      ELSIF v_bottle.assigned_customer = p_customer_id THEN
        -- Already assigned to the SAME customer; ensure status is 'rented'
        IF v_bottle.status <> 'rented' THEN
          UPDATE bottles SET
            status = 'rented',
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
      -- Do not auto-create bottles; barcode must exist to prevent phantom/duplicate assignments
      v_errors := array_append(v_errors, 'Bottle not found (add in Bottle Management first): ' || v_barcode);
    END IF;
  END LOOP;

  -- STEP 3: Mark import record as approved (AFTER all assignments succeed)
  IF p_import_record_id IS NOT NULL THEN
    IF p_import_table = 'imported_invoices' THEN
      UPDATE imported_invoices SET
        status = 'approved',
        approved_at = NOW(),
        locked_by = NULL,
        locked_at = NULL,
        updated_at = NOW()
      WHERE id = p_import_record_id
        AND organization_id = p_organization_id;
    ELSIF p_import_table = 'imported_sales_receipts' THEN
      UPDATE imported_sales_receipts SET
        status = 'approved',
        approved_at = NOW(),
        locked_by = NULL,
        locked_at = NULL,
        updated_at = NOW()
      WHERE id = p_import_record_id
        AND organization_id = p_organization_id;
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

GRANT EXECUTE ON FUNCTION assign_bottles_to_customer(UUID, TEXT, TEXT, TEXT[], TEXT[], UUID, TEXT, UUID, DECIMAL, DECIMAL) TO authenticated;

-- =============================================================================
-- 15. TRANSACTIONAL UNVERIFY ORDER (fixes BTL-6, BTL-7)
-- =============================================================================
CREATE OR REPLACE FUNCTION unverify_order(
  p_import_record_id UUID,
  p_organization_id UUID,
  p_import_table TEXT DEFAULT 'imported_invoices',
  p_user_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_bottle RECORD;
  v_restored INTEGER := 0;
  v_dns_deleted INTEGER := 0;
BEGIN
  -- Restore bottles that were assigned during this verification
  -- Uses previous_assigned_customer saved during assignment
  FOR v_bottle IN
    SELECT b.id, b.barcode_number, b.previous_assigned_customer, b.previous_status,
           b.assigned_customer, b.status
    FROM bottles b
    INNER JOIN scans s ON s.barcode_number = b.barcode_number
    WHERE b.organization_id = p_organization_id
      AND b.previous_status IS NOT NULL
    FOR UPDATE OF b
  LOOP
    UPDATE bottles SET
      assigned_customer = previous_assigned_customer,
      status = COALESCE(previous_status, 'available'),
      previous_assigned_customer = NULL,
      previous_status = NULL,
      updated_at = NOW()
    WHERE id = v_bottle.id;

    v_restored := v_restored + 1;
  END LOOP;

  -- Delete DNS rental records created during this verification
  DELETE FROM rentals
  WHERE organization_id = p_organization_id
    AND is_dns = true
    AND bottle_id IS NULL;

  GET DIAGNOSTICS v_dns_deleted = ROW_COUNT;

  -- Reset import record status
  IF p_import_table = 'imported_invoices' THEN
    UPDATE imported_invoices SET
      status = 'pending',
      approved_at = NULL,
      locked_by = NULL,
      locked_at = NULL,
      updated_at = NOW()
    WHERE id = p_import_record_id
      AND organization_id = p_organization_id;
  ELSIF p_import_table = 'imported_sales_receipts' THEN
    UPDATE imported_sales_receipts SET
      status = 'pending',
      approved_at = NULL,
      locked_by = NULL,
      locked_at = NULL,
      updated_at = NOW()
    WHERE id = p_import_record_id
      AND organization_id = p_organization_id;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'bottles_restored', v_restored,
    'dns_records_deleted', v_dns_deleted
  );
END;
$$;

GRANT EXECUTE ON FUNCTION unverify_order(UUID, UUID, TEXT, UUID) TO authenticated;

-- =============================================================================
-- 16. Add RLS policies for tables missing them
-- =============================================================================

-- customer_departments
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'customer_departments' AND policyname = 'customer_departments_org_isolation'
  ) THEN
    CREATE POLICY customer_departments_org_isolation ON customer_departments
      FOR ALL USING (
        organization_id IN (
          SELECT organization_id FROM profiles WHERE id = auth.uid()
        )
      );
  END IF;
EXCEPTION WHEN undefined_table THEN
  RAISE NOTICE 'customer_departments does not exist';
END $$;

-- lease_agreements
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'lease_agreements' AND policyname = 'lease_agreements_org_isolation'
  ) THEN
    CREATE POLICY lease_agreements_org_isolation ON lease_agreements
      FOR ALL USING (
        organization_id IN (
          SELECT organization_id FROM profiles WHERE id = auth.uid()
        )
      );
  END IF;
EXCEPTION WHEN undefined_table THEN
  RAISE NOTICE 'lease_agreements does not exist';
END $$;

-- cylinder_fills
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'cylinder_fills' AND policyname = 'cylinder_fills_org_isolation'
  ) THEN
    CREATE POLICY cylinder_fills_org_isolation ON cylinder_fills
      FOR ALL USING (
        organization_id IN (
          SELECT organization_id FROM profiles WHERE id = auth.uid()
        )
      );
  END IF;
EXCEPTION WHEN undefined_table THEN
  RAISE NOTICE 'cylinder_fills does not exist';
END $$;

-- scans
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'scans' AND policyname = 'scans_org_isolation'
  ) THEN
    CREATE POLICY scans_org_isolation ON scans
      FOR ALL USING (
        organization_id IN (
          SELECT organization_id FROM profiles WHERE id = auth.uid()
        )
      );
  END IF;
EXCEPTION WHEN undefined_table THEN
  RAISE NOTICE 'scans does not exist';
END $$;
