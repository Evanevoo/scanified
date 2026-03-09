-- Prevent RETURN scans from being stored with the bottle's rental order number when the
-- user actually scanned under a different session order (e.g. 72359). Some clients send
-- the bottle's rental_order_number for RETURN scans; this trigger clears it so the
-- wrong order (e.g. S47820) is not persisted. User can then set the correct order in UI.
CREATE OR REPLACE FUNCTION public.bottle_scans_return_order_safeguard()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_rental_order text;
BEGIN
  IF NEW.mode IS NULL OR UPPER(TRIM(NEW.mode)) <> 'RETURN' THEN
    RETURN NEW;
  END IF;
  IF NULLIF(TRIM(NEW.order_number), '') IS NULL THEN
    RETURN NEW;
  END IF;

  -- If this RETURN scan's order_number matches the bottle's open rental's rental_order_number,
  -- clear it so we don't persist the "wrong" order (session order should be used by the client).
  SELECT r.rental_order_number INTO v_rental_order
  FROM rentals r
  WHERE r.bottle_barcode = NEW.bottle_barcode
    AND r.organization_id = NEW.organization_id
    AND r.rental_end_date IS NULL
    AND NULLIF(TRIM(r.rental_order_number), '') IS NOT NULL
  ORDER BY r.rental_start_date DESC NULLS LAST
  LIMIT 1;

  IF v_rental_order IS NOT NULL AND TRIM(NEW.order_number) = TRIM(v_rental_order) THEN
    NEW.order_number := NULL;
  END IF;

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.bottle_scans_return_order_safeguard() IS
  'Trigger: on INSERT to bottle_scans, for RETURN mode, if order_number equals the bottle''s open rental_order_number, clear it so the wrong order is not persisted (client should send session order).';

DROP TRIGGER IF EXISTS bottle_scans_return_order_safeguard_trigger ON public.bottle_scans;
CREATE TRIGGER bottle_scans_return_order_safeguard_trigger
  BEFORE INSERT ON public.bottle_scans
  FOR EACH ROW
  EXECUTE FUNCTION public.bottle_scans_return_order_safeguard();
