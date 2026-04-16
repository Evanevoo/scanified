const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Initialize Supabase client with service role key for admin operations
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// All critical tables to backup
const CRITICAL_TABLES = [
  'organizations',
  'profiles',
  'customers',
  'bottles',
  'rentals',
  'invoices',
  'invoice_line_items',
  'deliveries',
  'notifications',
  'audit_logs',
  'support_tickets',
  'support_ticket_messages',
  'locations',
  'gas_types',
  'owners',
  'subscription_plans',
  'cylinder_fills',
  'bottle_scans',
  'user_invites',
  'ownership_values',
  'roles',
  'permissions',
  'organization_join_codes',
  'customer_support',
  'verification_requests',
  'verified_orders'
];

exports.handler = async (event, _context) => {
  console.log('🔄 Daily backup function triggered at:', new Date().toISOString());
  
  // Verify this is being called by a scheduled function or authorized source
  const authHeader = event.headers.authorization;
  const expectedToken = process.env.CRON_SECRET;
  
  // Allow GET requests for testing (without auth), but require auth for POST/scheduled calls
  if (event.httpMethod === 'POST' && expectedToken && (!authHeader || authHeader !== `Bearer ${expectedToken}`)) {
    console.log('⚠️ Unauthorized request to daily backup');
    return {
      statusCode: 401,
      body: JSON.stringify({ error: 'Unauthorized. Please provide valid CRON_SECRET in Authorization header.' })
    };
  }
  
  // For GET requests, just return status (don't run backup)
  if (event.httpMethod === 'GET') {
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        message: 'Daily backup function is available. Use POST with Authorization header to trigger backup.',
        endpoint: '/.netlify/functions/daily-backup',
        method: 'POST',
        note: 'This function runs automatically via scheduled function at 2 AM UTC daily.'
      })
    };
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupDate = new Date().toISOString().split('T')[0];
  const backupResults = {
    timestamp: new Date().toISOString(),
    backupDate,
    tables: {},
    totalRecords: 0,
    totalSize: 0,
    errors: [],
    success: false
  };

  let backupLogId = null;
  try {
    console.log('📦 Starting comprehensive daily backup...');
    
    // Create backup record in database (if table exists)
    try {
      const { data: backupRecord, error: backupRecordError } = await supabase
        .from('backup_logs')
        .insert({
          backup_type: 'daily',
          started_at: new Date().toISOString(),
          status: 'in_progress',
          tables_count: CRITICAL_TABLES.length
        })
        .select()
        .single();

      if (!backupRecordError && backupRecord) {
        backupLogId = backupRecord.id;
      } else if (backupRecordError && backupRecordError.code === 'PGRST116') {
        console.log('⚠️ backup_logs table does not exist. Run the migration to enable backup logging.');
      }
    } catch (logError) {
      console.log('⚠️ Could not create backup log entry:', logError.message);
      // Continue with backup even if logging fails
    }

    // Backup each table
    for (const tableName of CRITICAL_TABLES) {
      try {
        console.log(`  📋 Backing up table: ${tableName}...`);
        
        // Get all data from table
        const { data, error, count } = await supabase
          .from(tableName)
          .select('*', { count: 'exact' });

        if (error) {
          console.error(`  ❌ Error backing up ${tableName}:`, error);
          backupResults.errors.push({
            table: tableName,
            error: error.message
          });
          backupResults.tables[tableName] = {
            success: false,
            error: error.message,
            recordCount: 0
          };
          continue;
        }

        const recordCount = data?.length || count || 0;
        const dataSize = JSON.stringify(data || []).length;

        // Store backup in Supabase Storage
        const backupFileName = `backups/${backupDate}/${tableName}-${timestamp}.json`;
        const { error: storageError } = await supabase.storage
          .from('backups')
          .upload(backupFileName, JSON.stringify({
            table: tableName,
            timestamp: new Date().toISOString(),
            recordCount,
            data: data || []
          }), {
            contentType: 'application/json',
            upsert: false
          });

        if (storageError) {
          console.error(`  ❌ Error storing backup for ${tableName}:`, storageError);
          backupResults.errors.push({
            table: tableName,
            error: `Storage error: ${storageError.message}`
          });
          backupResults.tables[tableName] = {
            success: false,
            error: storageError.message,
            recordCount
          };
        } else {
          console.log(`  ✅ Backed up ${tableName}: ${recordCount} records (${(dataSize / 1024).toFixed(2)} KB)`);
          backupResults.tables[tableName] = {
            success: true,
            recordCount,
            size: dataSize,
            storagePath: backupFileName
          };
          backupResults.totalRecords += recordCount;
          backupResults.totalSize += dataSize;
        }

      } catch (tableError) {
        console.error(`  ❌ Unexpected error backing up ${tableName}:`, tableError);
        backupResults.errors.push({
          table: tableName,
          error: tableError.message
        });
        backupResults.tables[tableName] = {
          success: false,
          error: tableError.message,
          recordCount: 0
        };
      }
    }

    // Clean up old backups (keep last 30 days)
    try {
      console.log('🧹 Cleaning up old backups...');
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      // List all backup folders
      const { data: folders, error: listError } = await supabase.storage
        .from('backups')
        .list('backups', {
          limit: 1000,
          sortBy: { column: 'created_at', order: 'asc' }
        });

      if (!listError && folders) {
        for (const folder of folders) {
          if (folder.name && folder.name.match(/^\d{4}-\d{2}-\d{2}$/)) {
            const folderDate = new Date(folder.name);
            if (folderDate < thirtyDaysAgo) {
              console.log(`  🗑️ Deleting old backup folder: ${folder.name}`);
              // Note: Supabase Storage doesn't have a direct delete folder API
              // You may need to list and delete files individually
              // This is a placeholder for the cleanup logic
            }
          }
        }
      }
    } catch (cleanupError) {
      console.error('⚠️ Error during cleanup:', cleanupError);
      // Don't fail the backup if cleanup fails
    }

    // Update backup record
    backupResults.success = backupResults.errors.length === 0;
    
    if (backupLogId) {
      try {
        await supabase
          .from('backup_logs')
          .update({
            completed_at: new Date().toISOString(),
            status: backupResults.success ? 'completed' : 'completed_with_errors',
            records_backed_up: backupResults.totalRecords,
            backup_size: backupResults.totalSize,
            errors: backupResults.errors.length > 0 ? backupResults.errors : null,
            metadata: backupResults.tables
          })
          .eq('id', backupLogId);
      } catch (updateError) {
        console.error('⚠️ Could not update backup log:', updateError.message);
        // Don't fail the backup if logging update fails
      }
    }

    // Send notification if there were errors
    if (backupResults.errors.length > 0) {
      console.error(`⚠️ Backup completed with ${backupResults.errors.length} errors`);
      // You could send an email/notification here
    } else {
      console.log('✅ Daily backup completed successfully!');
      console.log(`   📊 Total records: ${backupResults.totalRecords}`);
      console.log(`   💾 Total size: ${(backupResults.totalSize / 1024 / 1024).toFixed(2)} MB`);
    }

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: backupResults.success,
        message: backupResults.success 
          ? 'Daily backup completed successfully' 
          : `Backup completed with ${backupResults.errors.length} errors`,
        timestamp: backupResults.timestamp,
        summary: {
          totalTables: CRITICAL_TABLES.length,
          successfulTables: Object.values(backupResults.tables).filter(t => t.success).length,
          failedTables: backupResults.errors.length,
          totalRecords: backupResults.totalRecords,
          totalSize: `${(backupResults.totalSize / 1024 / 1024).toFixed(2)} MB`
        },
        errors: backupResults.errors.length > 0 ? backupResults.errors : undefined
      })
    };

  } catch (error) {
    console.error('❌ Unexpected error in daily backup:', error);
    
    // Update backup record if it exists
    if (backupLogId) {
      try {
        await supabase
          .from('backup_logs')
          .update({
            completed_at: new Date().toISOString(),
            status: 'failed',
            errors: [{ error: error.message }]
          })
          .eq('id', backupLogId);
      } catch (updateError) {
        console.error('⚠️ Could not update backup log with failure:', updateError.message);
      }
    }

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

