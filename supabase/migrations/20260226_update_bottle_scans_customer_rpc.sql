-- RPC to update customer_name/customer_id on bottle_scans for an order.
-- Runs with SECURITY DEFINER so it works regardless of RLS.
-- Returns { ok: true, bottle_scans_updated: N } or { ok: false, error: "..." }.
CREATE OR REPLACE FUNCTION public.update_bottle_scans_customer(
  p_order_number text,
  p_org_id uuid,
  p_customer_name text,
  p_customer_id text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_updated int;
BEGIN
  IF NULLIF(TRIM(p_order_number), '') IS NULL OR p_org_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'missing order_number or org_id');
  END IF;

  UPDATE public.bottle_scans
  SET
    customer_name = NULLIF(TRIM(p_customer_name), ''),
    customer_id = NULLIF(TRIM(p_customer_id), '')
  WHERE organization_id = p_org_id
    AND TRIM(COALESCE(order_number::text, '')) = TRIM(p_order_number);

  GET DIAGNOSTICS v_updated = ROW_COUNT;

  RETURN jsonb_build_object('ok', true, 'bottle_scans_updated', v_updated);
END;
$$;

COMMENT ON FUNCTION public.update_bottle_scans_customer(text, uuid, text, text) IS
  'Updates customer_name and customer_id on all bottle_scans for the given order and org. Used by Import Approval Detail "Change customer" for scanned-only records.';

GRANT EXECUTE ON FUNCTION public.update_bottle_scans_customer(text, uuid, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_bottle_scans_customer(text, uuid, text, text) TO service_role;
