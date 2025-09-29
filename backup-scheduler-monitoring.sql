-- BACKUP SCHEDULER AND MONITORING
-- This creates the scheduling system and monitoring dashboard

-- 1. Create backup schedule table
CREATE TABLE IF NOT EXISTS backup_schedules (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  schedule_type TEXT NOT NULL DEFAULT 'daily', -- daily, weekly, monthly
  schedule_time TIME DEFAULT '02:00:00', -- 2 AM UTC
  is_active BOOLEAN DEFAULT true,
  last_run_at TIMESTAMP WITH TIME ZONE,
  next_run_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(organization_id, schedule_type)
);

-- 2. Function to create backup schedules for new organizations
CREATE OR REPLACE FUNCTION create_default_backup_schedule(org_id UUID)
RETURNS VOID AS $$
BEGIN
  INSERT INTO backup_schedules (organization_id, schedule_type, schedule_time, next_run_at)
  VALUES (
    org_id, 
    'daily', 
    '02:00:00', 
    (CURRENT_DATE + INTERVAL '1 day' + TIME '02:00:00')::timestamp with time zone
  )
  ON CONFLICT (organization_id, schedule_type) DO NOTHING;
END;
$$ LANGUAGE plpgsql;

-- 3. Trigger to automatically create backup schedule for new organizations
CREATE OR REPLACE FUNCTION trigger_create_backup_schedule()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM create_default_backup_schedule(NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS auto_create_backup_schedule ON organizations;
CREATE TRIGGER auto_create_backup_schedule
  AFTER INSERT ON organizations
  FOR EACH ROW
  EXECUTE FUNCTION trigger_create_backup_schedule();

-- 4. Function to run scheduled backups (call this from cron job)
CREATE OR REPLACE FUNCTION run_scheduled_backups()
RETURNS JSON AS $$
DECLARE
  schedule_record RECORD;
  backup_result JSON;
  results JSON[] := '{}';
  total_scheduled INTEGER := 0;
  successful_runs INTEGER := 0;
  failed_runs INTEGER := 0;
BEGIN
  -- Find all schedules that need to run
  FOR schedule_record IN 
    SELECT bs.*, o.name as org_name
    FROM backup_schedules bs
    JOIN organizations o ON bs.organization_id = o.id
    WHERE bs.is_active = true
      AND bs.next_run_at <= NOW()
  LOOP
    total_scheduled := total_scheduled + 1;
    
    -- Run the backup
    SELECT create_organization_backup(
      schedule_record.organization_id, 
      schedule_record.schedule_type
    ) INTO backup_result;
    
    -- Update schedule record
    UPDATE backup_schedules SET
      last_run_at = NOW(),
      next_run_at = CASE 
        WHEN schedule_type = 'daily' THEN 
          (CURRENT_DATE + INTERVAL '1 day' + schedule_time)::timestamp with time zone
        WHEN schedule_type = 'weekly' THEN 
          (CURRENT_DATE + INTERVAL '7 days' + schedule_time)::timestamp with time zone
        WHEN schedule_type = 'monthly' THEN 
          (CURRENT_DATE + INTERVAL '1 month' + schedule_time)::timestamp with time zone
        ELSE next_run_at + INTERVAL '1 day'
      END
    WHERE id = schedule_record.id;
    
    -- Track results
    IF (backup_result->>'success')::boolean THEN
      successful_runs := successful_runs + 1;
    ELSE
      failed_runs := failed_runs + 1;
    END IF;
    
    -- Add organization name to result
    backup_result := backup_result || json_build_object('organization_name', schedule_record.org_name);
    results := array_append(results, backup_result);
  END LOOP;
  
  RETURN json_build_object(
    'summary', json_build_object(
      'total_scheduled', total_scheduled,
      'successful_runs', successful_runs,
      'failed_runs', failed_runs,
      'run_timestamp', NOW()
    ),
    'results', array_to_json(results)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Backup monitoring and status functions
CREATE OR REPLACE FUNCTION get_backup_status()
RETURNS TABLE(
  organization_name TEXT,
  organization_id UUID,
  last_backup_date DATE,
  last_backup_status TEXT,
  customers_count INTEGER,
  bottles_count INTEGER,
  backup_size_mb DECIMAL(10,2),
  days_since_backup INTEGER,
  schedule_active BOOLEAN,
  next_backup TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    o.name,
    o.id,
    ob.backup_date,
    ob.backup_status,
    ob.customers_count,
    ob.bottles_count,
    ob.backup_size_mb,
    (CURRENT_DATE - ob.backup_date)::INTEGER as days_since,
    COALESCE(bs.is_active, false),
    bs.next_run_at
  FROM organizations o
  LEFT JOIN LATERAL (
    SELECT 
      backup_date,
      backup_status,
      customers_count,
      bottles_count,
      backup_size_mb
    FROM organization_backups 
    WHERE organization_backups.organization_id = o.id 
    ORDER BY backup_date DESC 
    LIMIT 1
  ) ob ON true
  LEFT JOIN backup_schedules bs ON o.id = bs.organization_id AND bs.schedule_type = 'daily'
  ORDER BY o.name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Function to get backup history for an organization
CREATE OR REPLACE FUNCTION get_organization_backup_history(org_id UUID, days_back INTEGER DEFAULT 30)
RETURNS TABLE(
  backup_date DATE,
  backup_type TEXT,
  backup_status TEXT,
  customers_count INTEGER,
  bottles_count INTEGER,
  backup_size_mb DECIMAL(10,2),
  created_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  error_message TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ob.backup_date,
    ob.backup_type,
    ob.backup_status,
    ob.customers_count,
    ob.bottles_count,
    ob.backup_size_mb,
    ob.created_at,
    ob.completed_at,
    ob.error_message
  FROM organization_backups ob
  WHERE ob.organization_id = get_organization_backup_history.org_id
    AND ob.backup_date >= CURRENT_DATE - INTERVAL '1 day' * get_organization_backup_history.days_back
  ORDER BY ob.backup_date DESC, ob.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
