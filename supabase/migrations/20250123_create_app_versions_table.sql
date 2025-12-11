-- Create app_versions table to track mobile app versions
CREATE TABLE IF NOT EXISTS app_versions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    platform TEXT NOT NULL CHECK (platform IN ('ios', 'android')),
    version TEXT NOT NULL,
    build_number TEXT,
    is_required BOOLEAN DEFAULT false,
    release_notes TEXT,
    app_store_url TEXT,
    play_store_url TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(platform, version)
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_app_versions_platform_active ON app_versions(platform, is_active);

-- Enable RLS
ALTER TABLE app_versions ENABLE ROW LEVEL SECURITY;

-- Allow public read access (anyone can check for updates)
CREATE POLICY "Allow public read access" ON app_versions
    FOR SELECT
    USING (true);

-- Only authenticated users with admin role can insert/update
CREATE POLICY "Allow admin insert/update" ON app_versions
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'owner'
        )
    );

-- Insert initial versions (update these when you publish new versions)
-- Note: App Store shows version 1.2 as current published version
-- Update this when you publish new versions to the App Store
INSERT INTO app_versions (platform, version, build_number, is_required, release_notes, app_store_url, play_store_url)
VALUES 
    ('ios', '1.2', NULL, false, 'New logo, and improved features.', 'https://apps.apple.com/app/scanified/id6749334978', NULL),
    ('android', '1.0.14', '31', false, 'Bug fixes and improvements', NULL, 'https://play.google.com/store/apps/details?id=com.evanevoo.scanifiedandroid')
ON CONFLICT (platform, version) DO NOTHING;

