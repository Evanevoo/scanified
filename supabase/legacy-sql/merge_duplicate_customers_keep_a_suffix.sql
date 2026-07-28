-- Merge duplicate customers: keep CustomerListID ending in "A", merge fields, repoint FKs, delete dup.
--
-- STEP 1 (optional): Run the PREVIEW query below alone to see dup → keeper pairs.
-- STEP 2: Run only the DO $merge$ block below. Set merge_apply := true when ready to apply.
--
-- >>> Edit org id in BOTH places below:
-- e215231c-326f-4382-93ce-95406ca2e54d

-- =============================================================================
-- PREVIEW (safe to run alone — read-only)
-- =============================================================================
WITH params AS (
  SELECT 'e215231c-326f-4382-93ce-95406ca2e54d'::uuid AS org_id
),
scoped AS (
  SELECT c.*
  FROM public.customers c
  CROSS JOIN params p
  WHERE c.organization_id = p.org_id
),
with_keys AS (
  SELECT
    s.*,
    lower(btrim(s.name)) AS name_key,
    CASE
      WHEN s."CustomerListID" ~* 'A$' THEN
        lower(regexp_replace(left(btrim(s."CustomerListID"), length(btrim(s."CustomerListID")) - 1), '\s', '', 'g'))
      ELSE
        lower(regexp_replace(btrim(s."CustomerListID"), '\s', '', 'g'))
    END AS qb_base_key,
    (s."CustomerListID" ~* 'A$') AS ends_with_a
  FROM scoped s
  WHERE s.name IS NOT NULL AND btrim(s.name) <> ''
    AND s."CustomerListID" IS NOT NULL AND btrim(s."CustomerListID") <> ''
),
name_groups AS (
  SELECT name_key
  FROM with_keys
  GROUP BY name_key
  HAVING count(*) > 1
    AND count(*) FILTER (WHERE ends_with_a) = 1
),
qb_groups AS (
  SELECT qb_base_key
  FROM with_keys
  WHERE qb_base_key <> ''
  GROUP BY qb_base_key
  HAVING count(*) > 1
    AND count(*) FILTER (WHERE ends_with_a) = 1
),
keepers AS (
  SELECT DISTINCT ON (g.group_key, g.group_type)
    g.group_type,
    g.group_key,
    w.id AS keeper_id,
    w."CustomerListID" AS keeper_list_id
  FROM (
    SELECT 'name'::text AS group_type, nk.name_key AS group_key, nk.name_key AS join_key
    FROM name_groups nk
    UNION ALL
    SELECT 'qb_base', qk.qb_base_key, qk.qb_base_key
    FROM qb_groups qk
  ) g
  JOIN with_keys w ON (
    (g.group_type = 'name' AND w.name_key = g.join_key)
    OR (g.group_type = 'qb_base' AND w.qb_base_key = g.join_key)
  )
  WHERE w.ends_with_a
  ORDER BY g.group_type, g.group_key, w.created_at NULLS LAST, w.id
),
dup_candidates AS (
  SELECT
    k.keeper_id,
    k.keeper_list_id,
    w.id AS dup_id,
    w."CustomerListID" AS dup_list_id,
    w.name AS dup_name,
    k.group_type
  FROM keepers k
  JOIN with_keys w ON (
    (k.group_type = 'name' AND w.name_key = k.group_key)
    OR (k.group_type = 'qb_base' AND w.qb_base_key = k.group_key)
  )
  WHERE w.id <> k.keeper_id
),
deduped AS (
  SELECT DISTINCT ON (dup_id)
    dup_id,
    keeper_id,
    keeper_list_id,
    dup_list_id,
    dup_name,
    string_agg(DISTINCT group_type, ', ' ORDER BY group_type) AS matched_by
  FROM dup_candidates
  GROUP BY dup_id, keeper_id, keeper_list_id, dup_list_id, dup_name
)
SELECT
  d.dup_id,
  d.keeper_id,
  d.keeper_list_id,
  d.dup_list_id,
  d.dup_name,
  k.name AS keeper_name,
  d.matched_by
FROM deduped d
JOIN public.customers k ON k.id = d.keeper_id
WHERE d.dup_list_id IS DISTINCT FROM d.keeper_list_id
ORDER BY keeper_name, dup_list_id;

-- =============================================================================
-- APPLY (one statement — works in Supabase SQL Editor)
-- Set merge_apply := true when ready to apply.
-- =============================================================================
DO $merge$
DECLARE
  -- Names prefixed with merge_ avoid PL/pgSQL mistaking them for SQL table/column refs.
  merge_org_id uuid := 'e215231c-326f-4382-93ce-95406ca2e54d';
  merge_apply boolean := TRUE;  -- false = plan only (NOTICE); true = merge + delete duplicates
  merge_rec RECORD;
  merge_plan_count integer;
  merge_done_count integer := 0;
BEGIN
  DROP TABLE IF EXISTS customer_merge_preview;

  CREATE TEMP TABLE customer_merge_preview AS
  WITH scoped AS (
    SELECT c.*
    FROM public.customers c
    WHERE c.organization_id = merge_org_id
  ),
  with_keys AS (
    SELECT
      s.*,
      lower(btrim(s.name)) AS name_key,
      CASE
        WHEN s."CustomerListID" ~* 'A$' THEN
          lower(regexp_replace(left(btrim(s."CustomerListID"), length(btrim(s."CustomerListID")) - 1), '\s', '', 'g'))
        ELSE
          lower(regexp_replace(btrim(s."CustomerListID"), '\s', '', 'g'))
      END AS qb_base_key,
      (s."CustomerListID" ~* 'A$') AS ends_with_a
    FROM scoped s
    WHERE s.name IS NOT NULL AND btrim(s.name) <> ''
      AND s."CustomerListID" IS NOT NULL AND btrim(s."CustomerListID") <> ''
  ),
  name_groups AS (
    SELECT name_key
    FROM with_keys
    GROUP BY name_key
    HAVING count(*) > 1
      AND count(*) FILTER (WHERE ends_with_a) = 1
  ),
  qb_groups AS (
    SELECT qb_base_key
    FROM with_keys
    WHERE qb_base_key <> ''
    GROUP BY qb_base_key
    HAVING count(*) > 1
      AND count(*) FILTER (WHERE ends_with_a) = 1
  ),
  keepers AS (
    SELECT DISTINCT ON (g.group_key, g.group_type)
      g.group_type,
      g.group_key,
      w.id AS keeper_id,
      w."CustomerListID" AS keeper_list_id
    FROM (
      SELECT 'name'::text AS group_type, nk.name_key AS group_key, nk.name_key AS join_key
      FROM name_groups nk
      UNION ALL
      SELECT 'qb_base', qk.qb_base_key, qk.qb_base_key
      FROM qb_groups qk
    ) g
    JOIN with_keys w ON (
      (g.group_type = 'name' AND w.name_key = g.join_key)
      OR (g.group_type = 'qb_base' AND w.qb_base_key = g.join_key)
    )
    WHERE w.ends_with_a
    ORDER BY g.group_type, g.group_key, w.created_at NULLS LAST, w.id
  ),
  dup_candidates AS (
    SELECT
      kr.keeper_id,
      kr.keeper_list_id,
      w.id AS dup_id,
      w."CustomerListID" AS dup_list_id,
      w.name AS dup_name,
      kr.group_type
    FROM keepers kr
    JOIN with_keys w ON (
      (kr.group_type = 'name' AND w.name_key = kr.group_key)
      OR (kr.group_type = 'qb_base' AND w.qb_base_key = kr.group_key)
    )
    WHERE w.id <> kr.keeper_id
  ),
  deduped AS (
    SELECT
      dup_id,
      keeper_id,
      keeper_list_id,
      dup_list_id,
      dup_name,
      string_agg(DISTINCT group_type, ', ' ORDER BY group_type) AS matched_by
    FROM dup_candidates
    GROUP BY dup_id, keeper_id, keeper_list_id, dup_list_id, dup_name
  )
  SELECT
    ded.dup_id,
    ded.keeper_id,
    ded.keeper_list_id,
    ded.dup_list_id,
    ded.dup_name,
    keeper_cust.name AS keeper_name,
    ded.matched_by
  FROM deduped ded
  JOIN public.customers keeper_cust ON keeper_cust.id = ded.keeper_id
  WHERE ded.dup_list_id IS DISTINCT FROM ded.keeper_list_id;

  merge_plan_count := (SELECT count(*)::integer FROM customer_merge_preview);
  RAISE NOTICE 'Merge plan: % duplicate row(s) → keep A-suffix CustomerListID', merge_plan_count;

  IF NOT merge_apply THEN
    RAISE NOTICE 'Dry run only (merge_apply = false). Set merge_apply := true to apply.';
    RETURN;
  END IF;

  FOR merge_rec IN
    SELECT dup_id, keeper_id, keeper_list_id, dup_list_id
    FROM customer_merge_preview
    ORDER BY keeper_name, dup_list_id
  LOOP
    IF NOT EXISTS (
      SELECT 1
      FROM public.customers c_keeper
      JOIN public.customers c_dup ON c_dup.id = merge_rec.dup_id
      WHERE c_keeper.id = merge_rec.keeper_id
    ) THEN
      RAISE NOTICE 'Skip missing row dup=% keeper=%', merge_rec.dup_id, merge_rec.keeper_id;
      CONTINUE;
    END IF;

    -- Use table aliases in SQL only (never PL/pgSQL row variables inside SQL statements).
    UPDATE public.customers c_keeper
    SET
      customer_number = COALESCE(NULLIF(btrim(c_keeper.customer_number), ''), NULLIF(btrim(c_dup.customer_number), '')),
      contact_details = COALESCE(NULLIF(btrim(c_keeper.contact_details), ''), NULLIF(btrim(c_dup.contact_details), '')),
      phone = COALESCE(NULLIF(btrim(c_keeper.phone), ''), NULLIF(btrim(c_dup.phone), '')),
      email = COALESCE(NULLIF(btrim(c_keeper.email), ''), NULLIF(btrim(c_dup.email), '')),
      billing_email = COALESCE(NULLIF(btrim(c_keeper.billing_email), ''), NULLIF(btrim(c_dup.billing_email), '')),
      address2 = COALESCE(NULLIF(btrim(c_keeper.address2), ''), NULLIF(btrim(c_dup.address2), '')),
      address3 = COALESCE(NULLIF(btrim(c_keeper.address3), ''), NULLIF(btrim(c_dup.address3), '')),
      address4 = COALESCE(NULLIF(btrim(c_keeper.address4), ''), NULLIF(btrim(c_dup.address4), '')),
      address5 = COALESCE(NULLIF(btrim(c_keeper.address5), ''), NULLIF(btrim(c_dup.address5), '')),
      city = COALESCE(NULLIF(btrim(c_keeper.city), ''), NULLIF(btrim(c_dup.city), '')),
      postal_code = COALESCE(NULLIF(btrim(c_keeper.postal_code), ''), NULLIF(btrim(c_dup.postal_code), '')),
      location = COALESCE(NULLIF(btrim(c_keeper.location), ''), NULLIF(btrim(c_dup.location), '')),
      payment_terms = COALESCE(NULLIF(btrim(c_keeper.payment_terms), ''), NULLIF(btrim(c_dup.payment_terms), '')),
      barcode = COALESCE(NULLIF(btrim(c_keeper.barcode), ''), NULLIF(btrim(c_dup.barcode), '')),
      customer_barcode = COALESCE(NULLIF(btrim(c_keeper.customer_barcode), ''), NULLIF(btrim(c_dup.customer_barcode), '')),
      barcode_number = COALESCE(NULLIF(btrim(c_keeper.barcode_number), ''), NULLIF(btrim(c_dup.barcode_number), '')),
      rental_bill_email_to = COALESCE(NULLIF(btrim(c_keeper.rental_bill_email_to), ''), NULLIF(btrim(c_dup.rental_bill_email_to), '')),
      purchase_order = COALESCE(NULLIF(btrim(c_keeper.purchase_order), ''), NULLIF(btrim(c_dup.purchase_order), '')),
      display_name = COALESCE(NULLIF(btrim(c_keeper.display_name), ''), NULLIF(btrim(c_dup.display_name), '')),
      department = COALESCE(NULLIF(btrim(c_keeper.department), ''), NULLIF(btrim(c_dup.department), '')),
      fax = COALESCE(NULLIF(btrim(c_keeper.fax), ''), NULLIF(btrim(c_dup.fax), '')),
      salesman = COALESCE(NULLIF(btrim(c_keeper.salesman), ''), NULLIF(btrim(c_dup.salesman), '')),
      tax_region = COALESCE(NULLIF(btrim(c_keeper.tax_region), ''), NULLIF(btrim(c_dup.tax_region), '')),
      billing_name = COALESCE(NULLIF(btrim(c_keeper.billing_name), ''), NULLIF(btrim(c_dup.billing_name), '')),
      servicing_location = COALESCE(NULLIF(btrim(c_keeper.servicing_location), ''), NULLIF(btrim(c_dup.servicing_location), '')),
      branch_location = COALESCE(NULLIF(btrim(c_keeper.branch_location), ''), NULLIF(btrim(c_dup.branch_location), ''))
    FROM public.customers c_dup
    WHERE c_keeper.id = merge_rec.keeper_id
      AND c_dup.id = merge_rec.dup_id;

    UPDATE public.customers
    SET parent_customer_id = merge_rec.keeper_id::text
    WHERE organization_id = merge_org_id
      AND (
        parent_customer_id = merge_rec.dup_id::text
        OR parent_customer_id = merge_rec.dup_list_id
      );

    UPDATE public.bottles
    SET assigned_customer = merge_rec.keeper_list_id
    WHERE organization_id = merge_org_id
      AND assigned_customer IS NOT NULL
      AND (
        assigned_customer = merge_rec.dup_list_id
        OR lower(assigned_customer) = lower(merge_rec.dup_list_id)
        OR assigned_customer = merge_rec.dup_id::text
      );

    UPDATE public.bottles b
    SET customer_name = c_keeper.name
    FROM public.customers c_keeper, public.customers c_dup
    WHERE b.organization_id = merge_org_id
      AND c_keeper.id = merge_rec.keeper_id
      AND c_dup.id = merge_rec.dup_id
      AND b.assigned_customer = merge_rec.keeper_list_id
      AND (b.customer_name IS NULL OR btrim(b.customer_name) = '' OR b.customer_name = c_dup.name);

    IF to_regclass('public.subscriptions') IS NOT NULL THEN
      UPDATE public.subscriptions
      SET customer_id = merge_rec.keeper_list_id
      WHERE organization_id = merge_org_id
        AND (
          customer_id = merge_rec.dup_list_id
          OR customer_id = merge_rec.dup_id::text
          OR lower(customer_id) = lower(merge_rec.dup_list_id)
        );
    END IF;

    IF to_regclass('public.subscription_invoices') IS NOT NULL THEN
      UPDATE public.subscription_invoices
      SET customer_id = merge_rec.keeper_list_id
      WHERE organization_id = merge_org_id
        AND (
          customer_id = merge_rec.dup_list_id
          OR customer_id = merge_rec.dup_id::text
          OR lower(customer_id) = lower(merge_rec.dup_list_id)
        );
    END IF;

    IF to_regclass('public.customer_pricing_overrides') IS NOT NULL THEN
      UPDATE public.customer_pricing_overrides
      SET customer_id = merge_rec.keeper_list_id
      WHERE organization_id = merge_org_id
        AND (
          customer_id = merge_rec.dup_list_id
          OR customer_id = merge_rec.dup_id::text
          OR lower(customer_id) = lower(merge_rec.dup_list_id)
        );
    END IF;

    IF to_regclass('public.lease_contracts') IS NOT NULL THEN
      UPDATE public.lease_contracts
      SET customer_id = merge_rec.keeper_list_id
      WHERE organization_id = merge_org_id
        AND (
          customer_id = merge_rec.dup_list_id
          OR customer_id = merge_rec.dup_id::text
          OR lower(customer_id) = lower(merge_rec.dup_list_id)
        );
    END IF;

    IF to_regclass('public.invoice_email_sends') IS NOT NULL THEN
      UPDATE public.invoice_email_sends
      SET customer_id = merge_rec.keeper_list_id
      WHERE organization_id = merge_org_id
        AND (
          customer_id = merge_rec.dup_list_id
          OR customer_id = merge_rec.dup_id::text
          OR lower(customer_id) = lower(merge_rec.dup_list_id)
        );
    END IF;

    DELETE FROM public.customers WHERE id = merge_rec.dup_id;
    merge_done_count := merge_done_count + 1;
  END LOOP;

  RAISE NOTICE 'Done. Merged and deleted % duplicate customer row(s).', merge_done_count;
END $merge$;
