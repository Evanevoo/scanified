-- CRON JOB SETUP FOR DAILY BACKUPS
-- Instructions for setting up automated daily backups

-- 1. PostgreSQL pg_cron extension setup (if available)
-- Run this in your Supabase SQL editor or PostgreSQL instance:

-- Enable pg_cron extension (if available)
-- CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Schedule daily backups at 2 AM UTC
-- SELECT cron.schedule(
--   'daily-org-backups',
--   '0 2 * * *', -- Every day at 2 AM
--   'SELECT run_scheduled_backups();'
-- );

-- Schedule weekly cleanup (keep 30 days)
-- SELECT cron.schedule(
--   'weekly-backup-cleanup',
--   '0 3 * * 0', -- Every Sunday at 3 AM
--   'SELECT cleanup_old_backups(30);'
-- );

-- 2. Alternative: Supabase Edge Function approach
-- Create this as a Supabase Edge Function for serverless execution

-- File: supabase/functions/daily-backup/index.ts
/*
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

serve(async (req) => {
  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Run scheduled backups
    const { data, error } = await supabase.rpc('run_scheduled_backups')
    
    if (error) throw error

    return new Response(
      JSON.stringify({ success: true, data }),
      { headers: { "Content-Type": "application/json" } }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    )
  }
})
*/

-- 3. Manual testing commands
-- Test backup for single organization
-- SELECT create_organization_backup('f98daa10-2884-49b9-a6a6-9725e27e7696');

-- Test backup for all organizations
-- SELECT backup_all_organizations();

-- Run scheduled backups
-- SELECT run_scheduled_backups();

-- Check backup status
-- SELECT * FROM get_backup_status();

-- Clean old backups
-- SELECT cleanup_old_backups(30);

-- 4. Set up backup schedules for existing organizations
INSERT INTO backup_schedules (organization_id, schedule_type, schedule_time, next_run_at)
SELECT 
  id,
  'daily',
  '02:00:00',
  (CURRENT_DATE + INTERVAL '1 day' + TIME '02:00:00')::timestamp with time zone
FROM organizations
ON CONFLICT (organization_id, schedule_type) DO NOTHING;

-- 5. Monitoring queries for admins
-- Check backup health across all organizations
SELECT 
  COUNT(*) as total_orgs,
  COUNT(CASE WHEN days_since_backup <= 1 THEN 1 END) as backed_up_today,
  COUNT(CASE WHEN days_since_backup <= 7 THEN 1 END) as backed_up_this_week,
  COUNT(CASE WHEN days_since_backup > 7 OR days_since_backup IS NULL THEN 1 END) as needs_attention
FROM get_backup_status();

-- Find organizations that need backup attention
SELECT 
  organization_name,
  days_since_backup,
  last_backup_status,
  schedule_active,
  next_backup
FROM get_backup_status()
WHERE days_since_backup > 1 OR days_since_backup IS NULL
ORDER BY days_since_backup DESC NULLS FIRST;
