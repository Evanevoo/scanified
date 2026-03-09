-- When a bottle is scanned as full (cylinder_fills insert with fill_type = 'full'),
-- close any RNB (Return not on balance) rentals for that barcode so they no longer show on customer lists.

CREATE OR REPLACE FUNCTION public.close_rnb_on_cylinder_fill()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.barcode_number IS NOT NULL
     AND NEW.organization_id IS NOT NULL
     AND LOWER(COALESCE(NEW.fill_type, '')) IN ('full', 'filled') THEN
    UPDATE public.rentals
    SET
      rental_end_date = CURRENT_DATE,
      updated_at = NOW()
    WHERE organization_id = NEW.organization_id
      AND is_dns = true
      AND (dns_description ILIKE '%Return not on balance%')
      AND bottle_barcode = NEW.barcode_number
      AND rental_end_date IS NULL;
  END IF;
  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.close_rnb_on_cylinder_fill() IS
  'Trigger function: on cylinder_fills insert (full/filled), close RNB rentals for that barcode so they stop showing on customer lists.';

DROP TRIGGER IF EXISTS close_rnb_on_cylinder_fill_trigger ON public.cylinder_fills;
CREATE TRIGGER close_rnb_on_cylinder_fill_trigger
  AFTER INSERT ON public.cylinder_fills
  FOR EACH ROW
  EXECUTE FUNCTION public.close_rnb_on_cylinder_fill();
