-- Create file_format_templates table for reusable import templates
CREATE TABLE file_format_templates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  category VARCHAR(100),
  file_types JSONB DEFAULT '[]'::jsonb,
  delimiter VARCHAR(10) DEFAULT ',',
  has_header BOOLEAN DEFAULT true,
  encoding VARCHAR(50) DEFAULT 'utf-8',
  column_mappings JSONB DEFAULT '[]'::jsonb,
  validation_rules JSONB DEFAULT '[]'::jsonb,
  transformations JSONB DEFAULT '[]'::jsonb,
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX idx_file_format_templates_org_id ON file_format_templates(organization_id);
CREATE INDEX idx_file_format_templates_category ON file_format_templates(category);
CREATE INDEX idx_file_format_templates_active ON file_format_templates(is_active);

-- Enable RLS
ALTER TABLE file_format_templates ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view file_format_templates for their organization" ON file_format_templates
  FOR SELECT USING (
    organization_id IS NULL OR organization_id IN (
      SELECT organization_id FROM profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can insert file_format_templates for their organization" ON file_format_templates
  FOR INSERT WITH CHECK (
    organization_id IS NULL OR organization_id IN (
      SELECT organization_id FROM profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can update file_format_templates for their organization" ON file_format_templates
  FOR UPDATE USING (
    organization_id IS NULL OR organization_id IN (
      SELECT organization_id FROM profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can delete file_format_templates for their organization" ON file_format_templates
  FOR DELETE USING (
    organization_id IS NULL OR organization_id IN (
      SELECT organization_id FROM profiles WHERE id = auth.uid()
    )
  );

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_file_format_templates_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_file_format_templates_updated_at
  BEFORE UPDATE ON file_format_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_file_format_templates_updated_at();

COMMENT ON TABLE file_format_templates IS 'Reusable import templates for file formats, organization-specific or global.'; 