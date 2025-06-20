-- Create Custom Pages Table
CREATE TABLE custom_pages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug TEXT NOT NULL UNIQUE,
    title TEXT NOT NULL,
    content TEXT, -- Markdown content
    is_published BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    author_id UUID REFERENCES auth.users(id)
);

-- RLS Policies for custom_pages
ALTER TABLE custom_pages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access for published pages"
ON custom_pages
FOR SELECT
USING (is_published = TRUE);

CREATE POLICY "Allow admin full access"
ON custom_pages
FOR ALL
USING (auth.role() = 'service_role' OR (SELECT role FROM profiles WHERE id = auth.uid()) = 'owner');

-- Seed an example page
INSERT INTO custom_pages (slug, title, content, is_published, author_id)
VALUES 
('about-us', 'About Us', '# Welcome to LessAnnoyingScan\n\nWe are dedicated to providing the best gas cylinder management solutions. Our platform is built with modern businesses in mind, focusing on ease of use, powerful features, and excellent support.', TRUE, (SELECT id FROM auth.users WHERE email = 'admin@yourcompany.com' LIMIT 1)); 