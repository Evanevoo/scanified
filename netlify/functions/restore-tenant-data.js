const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Initialize Supabase client with service role key for admin operations
const supabase = createClient(supabaseUrl, supabaseServiceKey);

/**
 * Restore tenant data from a backup
 */
exports.handler = async (event, context) => {
  console.log('🔄 Tenant restore function triggered at:', new Date().toISOString());
  
  // Verify authorization
  const authHeader = event.headers.authorization;
  const expectedToken = process.env.CRON_SECRET;
  
  if (event.httpMethod === 'POST' && expectedToken && (!authHeader || authHeader !== `Bearer ${expectedToken}`)) {
    return {
      statusCode: 401,
      body: JSON.stringify({ error: 'Unauthorized' })
    };
  }

  if (event.httpMethod === 'GET') {
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: 'Tenant restore function is available. Use POST with organization_id and backup_date.',
        endpoint: '/.netlify/functions/restore-tenant-data',
        method: 'POST',
        required_params: {
          organization_id: 'UUID of organization to restore',
          backup_date: 'YYYY-MM-DD format (e.g., 2025-01-15)',
          dry_run: 'boolean (optional) - if true, only validates without restoring'
        }
      })
    };
  }

  try {
    const body = JSON.parse(event.body || '{}');
    const { organization_id, backup_date, dry_run = false } = body;

    if (!organization_id || !backup_date) {
      return {
        statusCode: 400,
        body: JSON.stringify({ 
          error: 'Missing required parameters: organization_id and backup_date' 
        })
      };
    }

    // Validate date format
    if (!/^\d{4}-\d{2}-\d{2}$/.test(backup_date)) {
      return {
        statusCode: 400,
        body: JSON.stringify({ 
          error: 'Invalid backup_date format. Use YYYY-MM-DD (e.g., 2025-01-15)' 
        })
      };
    }

    console.log(`📥 Starting restore for organization ${organization_id} from ${backup_date} (dry_run: ${dry_run})`);

    // Get organization info
    const { data: org, error: orgError } = await supabase
      .from('organizations')
      .select('id, name')
      .eq('id', organization_id)
      .single();

    if (orgError || !org) {
      return {
        statusCode: 404,
        body: JSON.stringify({ 
          error: `Organization ${organization_id} not found` 
        })
      };
    }

    // List backup files for this tenant and date
    const backupPath = `tenant-backups/${organization_id}/${backup_date}`;
    const { data: backupFiles, error: listError } = await supabase.storage
      .from('backups')
      .list(backupPath);

    if (listError || !backupFiles || backupFiles.length === 0) {
      return {
        statusCode: 404,
        body: JSON.stringify({ 
          error: `No backup found for organization ${organization_id} on ${backup_date}` 
        })
      };
    }

    // Filter out summary files and get table backups
    const tableBackups = backupFiles.filter(file => 
      !file.name.startsWith('summary-') && file.name.endsWith('.json')
    );

    if (tableBackups.length === 0) {
      return {
        statusCode: 404,
        body: JSON.stringify({ 
          error: `No table backups found for organization ${organization_id} on ${backup_date}` 
        })
      };
    }

    const restoreResults = {
      organization_id,
      organization_name: org.name,
      backup_date,
      dry_run,
      timestamp: new Date().toISOString(),
      tables: {},
      total_records_restored: 0,
      errors: [],
      success: false
    };

    console.log(`📋 Found ${tableBackups.length} table backups to restore`);

    // Restore each table
    for (const backupFile of tableBackups) {
      const tableName = backupFile.name.split('-')[0];
      const filePath = `${backupPath}/${backupFile.name}`;

      try {
        // Download backup file
        const { data: fileData, error: downloadError } = await supabase.storage
          .from('backups')
          .download(filePath);

        if (downloadError) {
          throw new Error(`Failed to download backup: ${downloadError.message}`);
        }

        // Parse backup data
        const text = await fileData.text();
        const backupData = JSON.parse(text);

        if (!backupData.data || !Array.isArray(backupData.data)) {
          throw new Error('Invalid backup data format');
        }

        const records = backupData.data;
        const recordCount = records.length;

        console.log(`  📥 Restoring ${tableName}: ${recordCount} records`);

        if (dry_run) {
          // Dry run: just validate
          restoreResults.tables[tableName] = {
            success: true,
            record_count: recordCount,
            restored: 0,
            dry_run: true,
            message: `Would restore ${recordCount} records`
          };
          restoreResults.total_records_restored += recordCount;
        } else {
          // Actual restore: delete existing data and insert backup data
          
          // For organizations table, update instead of delete/insert
          if (tableName === 'organizations') {
            const orgData = records[0]; // Should only be one org
            const { error: updateError } = await supabase
              .from('organizations')
              .update(orgData)
              .eq('id', organization_id);

            if (updateError) {
              throw updateError;
            }

            restoreResults.tables[tableName] = {
              success: true,
              record_count: 1,
              restored: 1
            };
            restoreResults.total_records_restored += 1;
          } else {
            // For other tables, delete existing and insert backup
            // First, delete existing data for this organization
            const { error: deleteError } = await supabase
              .from(tableName)
              .delete()
              .eq('organization_id', organization_id);

            if (deleteError) {
              throw new Error(`Failed to delete existing data: ${deleteError.message}`);
            }

            // Insert backup data in batches (Supabase has limits)
            const batchSize = 1000;
            let restored = 0;

            for (let i = 0; i < records.length; i += batchSize) {
              const batch = records.slice(i, i + batchSize);
              const { error: insertError } = await supabase
                .from(tableName)
                .insert(batch);

              if (insertError) {
                throw new Error(`Failed to insert batch: ${insertError.message}`);
              }

              restored += batch.length;
            }

            restoreResults.tables[tableName] = {
              success: true,
              record_count: recordCount,
              restored
            };
            restoreResults.total_records_restored += restored;
          }

          console.log(`  ✅ Restored ${tableName}: ${restoreResults.tables[tableName].restored} records`);
        }

      } catch (tableError) {
        console.error(`  ❌ Error restoring ${tableName}:`, tableError);
        restoreResults.errors.push({
          table: tableName,
          error: tableError.message
        });
        restoreResults.tables[tableName] = {
          success: false,
          error: tableError.message,
          record_count: 0,
          restored: 0
        };
      }
    }

    restoreResults.success = restoreResults.errors.length === 0;

    // Create restore log
    try {
      await supabase
        .from('backup_logs')
        .insert({
          backup_type: 'restore',
          started_at: new Date().toISOString(),
          completed_at: new Date().toISOString(),
          status: restoreResults.success ? 'completed' : 'completed_with_errors',
          records_backed_up: restoreResults.total_records_restored,
          metadata: {
            organization_id,
            organization_name: org.name,
            backup_date,
            dry_run,
            tables: restoreResults.tables
          },
          errors: restoreResults.errors.length > 0 ? restoreResults.errors : null
        });
    } catch (logError) {
      console.error('⚠️ Could not create restore log:', logError.message);
    }

    const message = dry_run 
      ? `Dry run completed. Would restore ${restoreResults.total_records_restored} records.`
      : restoreResults.success
        ? `Successfully restored ${restoreResults.total_records_restored} records.`
        : `Restore completed with ${restoreResults.errors.length} errors.`;

    console.log(`✅ Restore ${dry_run ? 'validation' : 'operation'} completed: ${message}`);

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: restoreResults.success,
        message,
        timestamp: restoreResults.timestamp,
        summary: {
          organization_id,
          organization_name: org.name,
          backup_date,
          total_tables: Object.keys(restoreResults.tables).length,
          total_records_restored: restoreResults.total_records_restored,
          errors: restoreResults.errors.length
        },
        tables: restoreResults.tables,
        errors: restoreResults.errors.length > 0 ? restoreResults.errors : undefined
      })
    };

  } catch (error) {
    console.error('❌ Unexpected error in tenant restore:', error);
    
    return {
      statusCode: 500,
      body: JSON.stringify({
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      })
    };
  }
};

