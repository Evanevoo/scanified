const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Initialize Supabase client with service role key for admin operations
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Tables that contain organization_id (tenant-specific data)
const TENANT_TABLES = [
  'organizations',
  'profiles',
  'customers',
  'bottles',
  'rentals',
  'rental_invoices',
  'invoice_line_items',
  'deliveries',
  'notifications',
  'audit_logs',
  'support_tickets',
  'support_ticket_messages',
  'locations',
  'gas_types',
  'cylinder_fills',
  'bottle_scans',
  'user_invites',
  'ownership_values',
  'organization_join_codes',
  'customer_support',
  'verification_requests',
  'verified_orders',
  'sales_orders',
  'sales_order_items'
];

// Tables that are shared (no organization_id)
const SHARED_TABLES = [
  'subscription_plans',
  'roles',
  'permissions'
];

/**
 * Backup data for a specific organization/tenant
 */
async function backupTenantData(organizationId, organizationName) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupDate = new Date().toISOString().split('T')[0];
  const tenantBackup = {
    organization_id: organizationId,
    organization_name: organizationName,
    backup_date: backupDate,
    backup_timestamp: new Date().toISOString(),
    tables: {},
    total_records: 0,
    total_size: 0,
    errors: []
  };

  console.log(`📦 Backing up tenant: ${organizationName} (${organizationId})`);

  // Backup tenant-specific tables
  for (const tableName of TENANT_TABLES) {
    try {
      let query = supabase.from(tableName).select('*');
      
      // Filter by organization_id for tenant tables
      if (tableName !== 'organizations') {
        query = query.eq('organization_id', organizationId);
      } else {
        // For organizations table, get specific org
        query = query.eq('id', organizationId);
      }

      const { data, error, count } = await query;

      if (error) {
        console.error(`  ❌ Error backing up ${tableName}:`, error);
        tenantBackup.errors.push({
          table: tableName,
          error: error.message
        });
        tenantBackup.tables[tableName] = {
          success: false,
          error: error.message,
          record_count: 0
        };
        continue;
      }

      const recordCount = data?.length || count || 0;
      const tableData = {
        table: tableName,
        timestamp: new Date().toISOString(),
        record_count: recordCount,
        data: data || []
      };
      const dataSize = JSON.stringify(tableData).length;

      // Store backup in Supabase Storage
      const backupFileName = `tenant-backups/${organizationId}/${backupDate}/${tableName}-${timestamp}.json`;
      const { error: storageError } = await supabase.storage
        .from('backups')
        .upload(backupFileName, JSON.stringify(tableData), {
          contentType: 'application/json',
          upsert: false
        });

      if (storageError) {
        console.error(`  ❌ Error storing backup for ${tableName}:`, storageError);
        tenantBackup.errors.push({
          table: tableName,
          error: `Storage error: ${storageError.message}`
        });
        tenantBackup.tables[tableName] = {
          success: false,
          error: storageError.message,
          record_count: recordCount
        };
      } else {
        console.log(`  ✅ Backed up ${tableName}: ${recordCount} records (${(dataSize / 1024).toFixed(2)} KB)`);
        tenantBackup.tables[tableName] = {
          success: true,
          record_count: recordCount,
          size: dataSize,
          storage_path: backupFileName
        };
        tenantBackup.total_records += recordCount;
        tenantBackup.total_size += dataSize;
      }

    } catch (tableError) {
      console.error(`  ❌ Unexpected error backing up ${tableName}:`, tableError);
      tenantBackup.errors.push({
        table: tableName,
        error: tableError.message
      });
      tenantBackup.tables[tableName] = {
        success: false,
        error: tableError.message,
        record_count: 0
      };
    }
  }

  // Create summary backup file for this tenant
  const summaryFileName = `tenant-backups/${organizationId}/${backupDate}/summary-${timestamp}.json`;
  await supabase.storage
    .from('backups')
    .upload(summaryFileName, JSON.stringify(tenantBackup), {
      contentType: 'application/json',
      upsert: false
    });

  return tenantBackup;
}

/**
 * Main handler for daily tenant backup
 * Can be called via HTTP (for external cron services) or manually
 */
exports.handler = async (event, context) => {
  console.log('🔄 Daily tenant backup function triggered at:', new Date().toISOString());
  
  // For free plans: Allow calls without auth OR with simple secret
  // Set CRON_SECRET in Netlify env vars for basic protection
  const authHeader = event.headers.authorization;
  const querySecret = event.queryStringParameters?.secret;
  const expectedToken = process.env.CRON_SECRET;
  
  // Allow access if:
  // 1. No secret is configured (development/testing)
  // 2. Secret matches in Authorization header
  // 3. Secret matches in query parameter (for external cron services)
  if (expectedToken) {
    const providedSecret = authHeader?.replace('Bearer ', '') || querySecret;
    if (providedSecret !== expectedToken) {
      console.log('⚠️ Unauthorized request to daily tenant backup');
      return {
        statusCode: 401,
        body: JSON.stringify({ 
          error: 'Unauthorized. Please provide valid CRON_SECRET.',
          hint: 'Add ?secret=YOUR_SECRET to URL or Authorization: Bearer YOUR_SECRET header'
        })
      };
    }
  }
  
  // For GET requests, just return status
  if (event.httpMethod === 'GET') {
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: 'Daily tenant backup function is available.',
        endpoint: '/.netlify/functions/daily-tenant-backup',
        methods: ['GET', 'POST'],
        note: 'For free plans: Use external cron service to call this endpoint daily.',
        setup: {
          url: `${event.headers.host || 'scanified.netlify.app'}/.netlify/functions/daily-tenant-backup`,
          method: 'POST',
          auth: expectedToken ? 'Add ?secret=YOUR_SECRET or Authorization: Bearer YOUR_SECRET' : 'No auth required'
        }
      })
    };
  }

  const backupResults = {
    timestamp: new Date().toISOString(),
    backup_date: new Date().toISOString().split('T')[0],
    tenants: {},
    total_tenants: 0,
    successful_tenants: 0,
    failed_tenants: 0,
    total_records: 0,
    total_size: 0,
    errors: [],
    success: false
  };

  try {
    console.log('📦 Starting daily tenant backup process...');
    
    // Get all active organizations
    const { data: organizations, error: orgError } = await supabase
      .from('organizations')
      .select('id, name, deleted_at')
      .is('deleted_at', null); // Only active organizations

    if (orgError) {
      throw new Error(`Failed to fetch organizations: ${orgError.message}`);
    }

    if (!organizations || organizations.length === 0) {
      console.log('⚠️ No active organizations found');
      return {
        statusCode: 200,
        body: JSON.stringify({
          success: true,
          message: 'No active organizations to backup',
          tenants_backed_up: 0
        })
      };
    }

    backupResults.total_tenants = organizations.length;
    console.log(`📋 Found ${organizations.length} active organizations to backup`);

    // Backup each tenant
    for (const org of organizations) {
      try {
        const tenantBackup = await backupTenantData(org.id, org.name);
        
        if (tenantBackup.errors.length === 0) {
          backupResults.successful_tenants++;
        } else {
          backupResults.failed_tenants++;
        }

        backupResults.tenants[org.id] = {
          name: org.name,
          success: tenantBackup.errors.length === 0,
          total_records: tenantBackup.total_records,
          total_size: tenantBackup.total_size,
          errors: tenantBackup.errors
        };

        backupResults.total_records += tenantBackup.total_records;
        backupResults.total_size += tenantBackup.total_size;

      } catch (tenantError) {
        console.error(`❌ Error backing up tenant ${org.name}:`, tenantError);
        backupResults.failed_tenants++;
        backupResults.errors.push({
          organization_id: org.id,
          organization_name: org.name,
          error: tenantError.message
        });
        backupResults.tenants[org.id] = {
          name: org.name,
          success: false,
          error: tenantError.message
        };
      }
    }

    // Create backup log entry
    try {
      await supabase
        .from('backup_logs')
        .insert({
          backup_type: 'daily_tenant',
          started_at: new Date().toISOString(),
          completed_at: new Date().toISOString(),
          status: backupResults.failed_tenants === 0 ? 'completed' : 'completed_with_errors',
          records_backed_up: backupResults.total_records,
          backup_size: backupResults.total_size,
          metadata: {
            total_tenants: backupResults.total_tenants,
            successful_tenants: backupResults.successful_tenants,
            failed_tenants: backupResults.failed_tenants,
            tenants: backupResults.tenants
          },
          errors: backupResults.errors.length > 0 ? backupResults.errors : null
        });
    } catch (logError) {
      console.error('⚠️ Could not create backup log:', logError.message);
    }

    backupResults.success = backupResults.failed_tenants === 0;

    console.log('✅ Daily tenant backup completed!');
    console.log(`   📊 Total tenants: ${backupResults.total_tenants}`);
    console.log(`   ✅ Successful: ${backupResults.successful_tenants}`);
    console.log(`   ❌ Failed: ${backupResults.failed_tenants}`);
    console.log(`   📋 Total records: ${backupResults.total_records}`);
    console.log(`   💾 Total size: ${(backupResults.total_size / 1024 / 1024).toFixed(2)} MB`);

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: backupResults.success,
        message: backupResults.success 
          ? 'Daily tenant backup completed successfully' 
          : `Backup completed with ${backupResults.failed_tenants} tenant failures`,
        timestamp: backupResults.timestamp,
        summary: {
          total_tenants: backupResults.total_tenants,
          successful_tenants: backupResults.successful_tenants,
          failed_tenants: backupResults.failed_tenants,
          total_records: backupResults.total_records,
          total_size: `${(backupResults.total_size / 1024 / 1024).toFixed(2)} MB`
        },
        tenants: backupResults.tenants,
        errors: backupResults.errors.length > 0 ? backupResults.errors : undefined
      })
    };

  } catch (error) {
    console.error('❌ Unexpected error in daily tenant backup:', error);
    
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
