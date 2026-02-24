-- RPC to move scans (and bottle_scans) for one order to a new order number, filtered by customer.
-- Use when only one customer's scans were under the wrong order (e.g. S47658 -> 71671A for Industrial Machine only).
-- p_customer_pattern: optional; if provided, only rows where customer_name ILIKE p_customer_pattern
--   or customer_id ILIKE p_customer_pattern are updated (e.g. '%industrial machine%' or '%800005BE%').
-- If p_customer_pattern is null or '', all rows for the order are updated (same as update_scans_order_number).
CREATE OR REPLACE FUNCTION public.update_scans_order_number_for_customer(
  p_old_order text,
  p_new_order text,
  p_org_id uuid,
  p_customer_pattern text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_scans_updated int;
  v_bottle_scans_updated int;
  v_pattern text;
BEGIN
  IF NULLIF(TRIM(p_old_order), '') IS NULL OR NULLIF(TRIM(p_new_order), '') IS NULL OR p_org_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'missing params');
  END IF;

  v_pattern := NULLIF(TRIM(p_customer_pattern), '');

  IF v_pattern IS NULL THEN
    UPDATE public.scans
    SET order_number = TRIM(p_new_order)
    WHERE organization_id = p_org_id
      AND TRIM(COALESCE(order_number::text, '')) = TRIM(p_old_order);
  ELSE
    UPDATE public.scans
    SET order_number = TRIM(p_new_order)
    WHERE organization_id = p_org_id
      AND TRIM(COALESCE(order_number::text, '')) = TRIM(p_old_order)
      AND (customer_name ILIKE v_pattern OR customer_id ILIKE v_pattern);
  END IF;
  GET DIAGNOSTICS v_scans_updated = ROW_COUNT;

  IF v_pattern IS NULL THEN
    UPDATE public.bottle_scans
    SET order_number = TRIM(p_new_order)
    WHERE organization_id = p_org_id
      AND TRIM(COALESCE(order_number::text, '')) = TRIM(p_old_order);
  ELSE
    UPDATE public.bottle_scans
    SET order_number = TRIM(p_new_order)
    WHERE organization_id = p_org_id
      AND TRIM(COALESCE(order_number::text, '')) = TRIM(p_old_order)
      AND (customer_name ILIKE v_pattern OR customer_id ILIKE v_pattern);
  END IF;
  GET DIAGNOSTICS v_bottle_scans_updated = ROW_COUNT;

  RETURN jsonb_build_object(
    'ok', true,
    'scans_updated', v_scans_updated,
    'bottle_scans_updated', v_bottle_scans_updated
  );
END;
$$;

COMMENT ON FUNCTION public.update_scans_order_number_for_customer(text, text, uuid, text) IS
  'Moves scans and bottle_scans from old_order to new_order for the given org, optionally only for rows matching customer_name/customer_id pattern.';

GRANT EXECUTE ON FUNCTION public.update_scans_order_number_for_customer(text, text, uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_scans_order_number_for_customer(text, text, uuid, text) TO anon;
