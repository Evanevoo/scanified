-- Create the role_permissions table for the unified role management system
-- This table stores permission configurations for each role

CREATE TABLE IF NOT EXISTS role_permissions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  role_name TEXT NOT NULL,
  display_name TEXT,
  description TEXT,
  permissions TEXT[] DEFAULT '{}',
  organization_id TEXT DEFAULT 'global',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(role_name, organization_id)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_role_permissions_role_name ON role_permissions(role_name);
CREATE INDEX IF NOT EXISTS idx_role_permissions_org_id ON role_permissions(organization_id);

-- Enable RLS
ALTER TABLE role_permissions ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view role permissions for their organization" 
ON role_permissions 
FOR SELECT 
USING (
  auth.role() = 'authenticated' AND (
    organization_id = 'global' OR
    organization_id IN (
      SELECT organization_id::text FROM profiles WHERE id = auth.uid()
    )
  )
);

CREATE POLICY "Admins can manage role permissions" 
ON role_permissions 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role IN ('admin', 'owner')
    AND (
      role_permissions.organization_id = 'global' OR
      role_permissions.organization_id = profiles.organization_id::text
    )
  )
);

-- Insert default role permissions to match existing roles
INSERT INTO role_permissions (role_name, display_name, description, permissions, organization_id) VALUES
  ('admin', 'Administrator', 'Full access to all features', ARRAY[
    'import_data', 'import_customers', 'file_format_manager', 'import_asset_balance',
    'organization_tools', 'user_management', 'join_codes', 'role_management',
    'billing', 'settings', 'dashboard', 'customers', 'temp_customers', 'locations',
    'assets', 'inventory', 'rentals', 'orders', 'deliveries', 'analytics', 'reports',
    'organization_analytics'
  ], 'global'),
  ('manager', 'Manager', 'Access to operations and reporting', ARRAY[
    'dashboard', 'customers', 'temp_customers', 'locations', 'assets', 'inventory',
    'rentals', 'orders', 'deliveries', 'analytics', 'reports', 'organization_analytics'
  ], 'global'),
  ('user', 'User', 'Basic access to core features', ARRAY[
    'dashboard', 'customers', 'assets', 'inventory', 'orders'
  ], 'global'),
  ('owner', 'Owner', 'Organization owner with full control', ARRAY[
    'import_data', 'import_customers', 'file_format_manager', 'import_asset_balance',
    'organization_tools', 'user_management', 'join_codes', 'role_management',
    'billing', 'settings', 'dashboard', 'customers', 'temp_customers', 'locations',
    'assets', 'inventory', 'rentals', 'orders', 'deliveries', 'analytics', 'reports',
    'organization_analytics'
  ], 'global')
ON CONFLICT (role_name, organization_id) DO NOTHING;

-- Create a trigger to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_role_permissions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER role_permissions_updated_at
  BEFORE UPDATE ON role_permissions
  FOR EACH ROW
  EXECUTE FUNCTION update_role_permissions_updated_at();
