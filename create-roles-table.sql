-- Create roles table for custom role management
CREATE TABLE IF NOT EXISTS roles (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    permissions TEXT[] DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_roles_name ON roles(name);
CREATE INDEX IF NOT EXISTS idx_roles_created_at ON roles(created_at);

-- Enable Row Level Security
ALTER TABLE roles ENABLE ROW LEVEL SECURITY;

-- RLS Policies for roles
-- Users can view roles (for role selection)
DROP POLICY IF EXISTS "Users can view roles" ON roles;
CREATE POLICY "Users can view roles" ON roles
    FOR SELECT USING (true);

-- Only admins and owners can create roles
DROP POLICY IF EXISTS "Admins can create roles" ON roles;
CREATE POLICY "Admins can create roles" ON roles
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() 
            AND (role = 'admin' OR role = 'owner')
        )
    );

-- Only admins and owners can update roles
DROP POLICY IF EXISTS "Admins can update roles" ON roles;
CREATE POLICY "Admins can update roles" ON roles
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() 
            AND (role = 'admin' OR role = 'owner')
        )
    );

-- Only admins and owners can delete roles
DROP POLICY IF EXISTS "Admins can delete roles" ON roles;
CREATE POLICY "Admins can delete roles" ON roles
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() 
            AND (role = 'admin' OR role = 'owner')
        )
    );

-- Insert some default roles
INSERT INTO roles (name, description, permissions) VALUES
    ('Admin', 'Full administrative access to all features', ARRAY['manage:users', 'manage:billing', 'manage:roles', 'read:customers', 'write:customers', 'delete:customers', 'read:cylinders', 'write:cylinders', 'delete:cylinders', 'read:invoices', 'write:invoices', 'delete:invoices', 'read:rentals', 'write:rentals', 'update:cylinder_location']),
    ('Manager', 'Can manage customers, cylinders, and invoices', ARRAY['read:customers', 'write:customers', 'read:cylinders', 'write:cylinders', 'read:invoices', 'write:invoices', 'read:rentals', 'write:rentals']),
    ('User', 'Basic access to view data', ARRAY['read:customers', 'read:cylinders', 'read:invoices', 'read:rentals'])
ON CONFLICT (name) DO NOTHING;

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_roles_updated_at 
    BEFORE UPDATE ON roles 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column(); 