-- Add integration_settings column to organizations table
ALTER TABLE organizations 
ADD COLUMN integration_settings JSONB DEFAULT '{}';

-- Add comment to document the column
COMMENT ON COLUMN organizations.integration_settings IS 'JSON configuration for accounting software integrations including primary software, integration method, export formats, and automation settings';

-- Create index for better performance on integration_settings queries
CREATE INDEX idx_organizations_integration_settings 
ON organizations USING GIN (integration_settings);

-- Add some sample integration settings for existing organizations (optional)
UPDATE organizations 
SET integration_settings = '{
  "primary_accounting_software": "quickbooks_desktop",
  "integration_method": "file_export",
  "export_formats": {
    "csv": true,
    "excel": true,
    "iif": true,
    "json": false,
    "xml": false
  },
  "automation_settings": {
    "auto_export": false,
    "export_frequency": "manual",
    "email_notifications": true,
    "backup_exports": true
  },
  "custom_mappings": {},
  "third_party_tools": []
}'
WHERE integration_settings IS NULL OR integration_settings = '{}';