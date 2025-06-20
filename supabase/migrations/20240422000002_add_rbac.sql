-- Create Roles Table
CREATE TABLE roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    permissions JSONB NOT NULL DEFAULT '[]', -- e.g., ["read:customers", "write:invoices"]
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add a column to profiles to link to a role
ALTER TABLE profiles
ADD COLUMN role_id UUID REFERENCES roles(id) ON DELETE SET NULL;

-- RLS Policies for roles table
ALTER TABLE roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow owner to manage roles"
ON roles
FOR ALL
USING ((SELECT role FROM profiles WHERE id = auth.uid()) = 'owner');

CREATE POLICY "Allow organization members to read roles"
ON roles
FOR SELECT
USING (auth.role() = 'authenticated');


-- Seed some initial roles
INSERT INTO roles (name, description, permissions)
VALUES
('Admin', 'Has full access to manage the organization''s data and users.', '["manage:users", "manage:billing", "read:customers", "write:customers", "read:cylinders", "write:cylinders", "read:invoices", "write:invoices"]'),
('Manager', 'Can manage most aspects of the business but not users or billing.', '["read:customers", "write:customers", "read:cylinders", "write:cylinders", "read:invoices", "write:invoices"]'),
('Driver', 'Limited access, primarily for managing deliveries and scanning cylinders.', '["read:customers", "read:cylinders", "update:cylinder_location"]'),
('Read-Only', 'Can view data but cannot make any changes.', '["read:customers", "read:cylinders", "read:invoices"]');

-- Function to check user permissions
CREATE OR REPLACE FUNCTION has_permission(permission_to_check TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    user_role_id UUID;
    user_permissions JSONB;
BEGIN
    -- Get the role_id for the currently authenticated user
    SELECT role_id INTO user_role_id FROM public.profiles WHERE id = auth.uid();

    IF user_role_id IS NULL THEN
        RETURN FALSE; -- No role assigned
    END IF;

    -- Get the permissions for that role
    SELECT permissions INTO user_permissions FROM public.roles WHERE id = user_role_id;
    
    IF user_permissions IS NULL THEN
        RETURN FALSE; -- Role has no permissions array
    END IF;

    -- Check if the permission_to_check exists in the user's permissions
    RETURN (SELECT EXISTS (SELECT 1 FROM jsonb_array_elements_text(user_permissions) WHERE value = permission_to_check));
END;
$$; 