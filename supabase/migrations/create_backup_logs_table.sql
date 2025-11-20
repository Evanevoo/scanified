-- Create backup_logs table to track backup operations
CREATE TABLE IF NOT EXISTS backup_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  backup_type TEXT NOT NULL DEFAULT 'daily',
  started_at TIMESTAMPTZ NOT NULL,
  completed_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'in_progress',
  -- Status values: 'in_progress', 'completed', 'completed_with_errors', 'failed'
  tables_count INTEGER,
  records_backed_up INTEGER,
  backup_size BIGINT, -- Size in bytes
  errors JSONB, -- Array of error objects
  metadata JSONB, -- Detailed backup metadata per table
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for querying recent backups
CREATE INDEX IF NOT EXISTS idx_backup_logs_created_at ON backup_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_backup_logs_status ON backup_logs(status);
CREATE INDEX IF NOT EXISTS idx_backup_logs_type ON backup_logs(backup_type);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_backup_logs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-update updated_at
DROP TRIGGER IF EXISTS trigger_update_backup_logs_updated_at ON backup_logs;
CREATE TRIGGER trigger_update_backup_logs_updated_at
  BEFORE UPDATE ON backup_logs
  FOR EACH ROW
  EXECUTE FUNCTION update_backup_logs_updated_at();

-- Create storage bucket for backups if it doesn't exist
-- Note: This needs to be run manually in Supabase Dashboard > Storage
-- Or via Supabase CLI: supabase storage create backups --public false

-- Grant necessary permissions (adjust based on your RLS policies)
ALTER TABLE backup_logs ENABLE ROW LEVEL SECURITY;

-- Policy: Only service role can insert/update backup logs
CREATE POLICY "Service role can manage backup logs"
  ON backup_logs
  FOR ALL
  USING (auth.role() = 'service_role');

-- Policy: Authenticated users can read backup logs (for admin dashboard)
CREATE POLICY "Authenticated users can read backup logs"
  ON backup_logs
  FOR SELECT
  USING (auth.role() = 'authenticated');

COMMENT ON TABLE backup_logs IS 'Tracks all backup operations including daily automated backups';
COMMENT ON COLUMN backup_logs.backup_type IS 'Type of backup: daily, weekly, manual, etc.';
COMMENT ON COLUMN backup_logs.status IS 'Current status of the backup operation';
COMMENT ON COLUMN backup_logs.errors IS 'JSON array of errors encountered during backup';
COMMENT ON COLUMN backup_logs.metadata IS 'Detailed metadata about each table backup';

