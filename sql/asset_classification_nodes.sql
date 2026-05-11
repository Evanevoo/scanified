-- Asset classification tree (TrackAbout-style: Industrial → Argon → BAR125, etc.)
-- Run in Supabase SQL Editor against your project database.

-- ---------------------------------------------------------------------------
-- 1) Nodes: self-referential tree per organization
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS asset_classification_nodes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  parent_id uuid REFERENCES asset_classification_nodes (id) ON DELETE CASCADE,
  name text NOT NULL,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT asset_classification_nodes_no_self_parent CHECK (parent_id IS DISTINCT FROM id)
);

CREATE INDEX IF NOT EXISTS idx_asset_classification_nodes_org
  ON asset_classification_nodes (organization_id);

CREATE INDEX IF NOT EXISTS idx_asset_classification_nodes_parent
  ON asset_classification_nodes (organization_id, parent_id);

-- Unique folder / code name among siblings (case-insensitive)
CREATE UNIQUE INDEX IF NOT EXISTS uq_asset_class_root_name
  ON asset_classification_nodes (organization_id, lower(btrim(name)))
  WHERE parent_id IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_asset_class_child_name
  ON asset_classification_nodes (organization_id, parent_id, lower(btrim(name)))
  WHERE parent_id IS NOT NULL;

COMMENT ON TABLE asset_classification_nodes IS
  'Hierarchical product/asset taxonomy per org (e.g. INDUSTRIAL CYLINDERS → ARGON → BAR125). Leaf names often match bottles.product_code.';

-- ---------------------------------------------------------------------------
-- 2) Optional link from bottles to a leaf node (SET NULL if node removed)
-- ---------------------------------------------------------------------------
ALTER TABLE bottles
  ADD COLUMN IF NOT EXISTS classification_node_id uuid;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'bottles_classification_node_id_fkey'
  ) THEN
    ALTER TABLE bottles
      ADD CONSTRAINT bottles_classification_node_id_fkey
      FOREIGN KEY (classification_node_id)
      REFERENCES asset_classification_nodes (id)
      ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_bottles_org_classification
  ON bottles (organization_id, classification_node_id)
  WHERE classification_node_id IS NOT NULL;

-- ---------------------------------------------------------------------------
-- 3) RLS (same org isolation pattern as bottles)
-- ---------------------------------------------------------------------------
ALTER TABLE asset_classification_nodes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage their org asset classification nodes" ON asset_classification_nodes;

CREATE POLICY "Users can manage their org asset classification nodes"
  ON asset_classification_nodes
  FOR ALL
  USING (
    organization_id = (
      SELECT organization_id FROM profiles WHERE id = auth.uid()
    )
  )
  WITH CHECK (
    organization_id = (
      SELECT organization_id FROM profiles WHERE id = auth.uid()
    )
  );
