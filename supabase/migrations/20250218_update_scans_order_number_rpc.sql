-- RPC to move scans and bottle_scans from one order number to another (e.g. after sales order change).
-- Runs with definer rights so RLS does not block the update.
CREATE OR REPLACE FUNCTION public.update_scans_order_number(
  p_old_order text,
  p_new_order text,
  p_org_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_scans_updated int;
  v_bottle_scans_updated int;
BEGIN
  IF NULLIF(TRIM(p_old_order), '') IS NULL OR NULLIF(TRIM(p_new_order), '') IS NULL OR p_org_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'missing params');
  END IF;

  UPDATE public.scans
  SET order_number = TRIM(p_new_order)
  WHERE organization_id = p_org_id
    AND TRIM(COALESCE(order_number::text, '')) = TRIM(p_old_order);
  GET DIAGNOSTICS v_scans_updated = ROW_COUNT;

  UPDATE public.bottle_scans
  SET order_number = TRIM(p_new_order)
  WHERE organization_id = p_org_id
    AND TRIM(COALESCE(order_number::text, '')) = TRIM(p_old_order);
  GET DIAGNOSTICS v_bottle_scans_updated = ROW_COUNT;

  RETURN jsonb_build_object(
    'ok', true,
    'scans_updated', v_scans_updated,
    'bottle_scans_updated', v_bottle_scans_updated
  );
END;
$$;

COMMENT ON FUNCTION public.update_scans_order_number(text, text, uuid) IS
  'Moves scans and bottle_scans from old_order to new_order for the given org (e.g. after changing sales order number on import).';

-- Allow API (anon/authenticated) to call the function
GRANT EXECUTE ON FUNCTION public.update_scans_order_number(text, text, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_scans_order_number(text, text, uuid) TO anon;
