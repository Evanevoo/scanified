-- Organizations: app icon and display
ALTER TABLE organizations
  ADD COLUMN IF NOT EXISTS app_icon_url text,
  ADD COLUMN IF NOT EXISTS show_app_icon boolean DEFAULT true;

COMMENT ON COLUMN organizations.app_icon_url IS 'Public URL for organization app icon (mobile/PWA)';
COMMENT ON COLUMN organizations.show_app_icon IS 'Whether to show app icon in header';

-- Profiles: theme mode and preferences for timezone/locale
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS theme_mode text DEFAULT 'light' CHECK (theme_mode IN ('light', 'dark', 'system')),
  ADD COLUMN IF NOT EXISTS preferences jsonb DEFAULT '{}';

COMMENT ON COLUMN profiles.theme_mode IS 'User UI theme: light, dark, or system';
COMMENT ON COLUMN profiles.preferences IS 'User preferences: timezone, locale, etc.';

-- Customer support tickets table (for support ticket history)
CREATE TABLE IF NOT EXISTS customer_support (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id uuid REFERENCES organizations(id) ON DELETE SET NULL,
  email text,
  subject text NOT NULL,
  message text NOT NULL,
  category text DEFAULT 'general',
  status text DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved', 'closed')),
  priority text DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_customer_support_user_id ON customer_support(user_id);
CREATE INDEX IF NOT EXISTS idx_customer_support_organization_id ON customer_support(organization_id);
CREATE INDEX IF NOT EXISTS idx_customer_support_created_at ON customer_support(created_at DESC);

ALTER TABLE customer_support ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own support tickets" ON customer_support;
CREATE POLICY "Users can view own support tickets"
  ON customer_support FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own support tickets" ON customer_support;
CREATE POLICY "Users can insert own support tickets"
  ON customer_support FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins and owners can view org tickets" ON customer_support;
CREATE POLICY "Admins and owners can view org tickets"
  ON customer_support FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'owner')
    )
  );
