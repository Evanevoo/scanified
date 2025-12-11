-- Create storage bucket for invoice-related files (logos, PDFs)
-- Run this in Supabase SQL Editor if the bucket doesn't exist

-- Create the bucket (if it doesn't exist)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'organization-logos',
  'organization-logos',
  true,
  5242880, -- 5MB limit
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml']
)
ON CONFLICT (id) DO NOTHING;

-- Create policies for organization-logos bucket
CREATE POLICY "Users can view their organization's logos"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'organization-logos' AND
    (storage.foldername(name))[1] = 'invoice-templates' AND
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.organization_id::text = (storage.foldername(name))[2]
    )
  );

CREATE POLICY "Users can upload logos for their organization"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'organization-logos' AND
    (storage.foldername(name))[1] = 'invoice-templates' AND
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.organization_id::text = (storage.foldername(name))[2]
    )
  );

CREATE POLICY "Users can update their organization's logos"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'organization-logos' AND
    (storage.foldername(name))[1] = 'invoice-templates' AND
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.organization_id::text = (storage.foldername(name))[2]
    )
  );

CREATE POLICY "Users can delete their organization's logos"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'organization-logos' AND
    (storage.foldername(name))[1] = 'invoice-templates' AND
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.organization_id::text = (storage.foldername(name))[2]
    )
  );

-- Also create invoices bucket for PDFs (if needed)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'invoices',
  'invoices',
  true,
  10485760, -- 10MB limit for PDFs
  ARRAY['application/pdf']
)
ON CONFLICT (id) DO NOTHING;

-- Policies for invoices bucket
CREATE POLICY "Users can view their organization's invoices"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'invoices' AND
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.organization_id::text = (storage.foldername(name))[1]
    )
  );

CREATE POLICY "Users can upload invoices for their organization"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'invoices' AND
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.organization_id::text = (storage.foldername(name))[1]
    )
  );

