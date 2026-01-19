/**
 * Check Last Backup from Storage
 * 
 * This script checks Supabase Storage for actual backup files
 * since the backup_logs table may be empty.
 * 
 * Usage: 
 *   node check-storage-backups.js
 * 
 * Requires environment variables:
 *   - VITE_SUPABASE_URL or SUPABASE_URL
 *   - SUPABASE_SERVICE_ROLE_KEY (for admin access)
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials!');
  console.error('Set VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env file');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkBackups() {
  console.log('🔍 Checking for backups in Supabase Storage...\n');

  try {
    // Check if backups bucket exists by trying to list root
    const { data: rootFiles, error: rootError } = await supabase.storage
      .from('backups')
      .list('', {
        limit: 1000,
        sortBy: { column: 'created_at', order: 'desc' }
      });

    if (rootError) {
      if (rootError.message.includes('not found') || rootError.message.includes('does not exist')) {
        console.log('❌ Backups bucket does not exist!');
        console.log('   Create it in Supabase Dashboard > Storage > New Bucket');
        console.log('   Name: backups, Type: Private\n');
        return;
      }
      throw rootError;
    }

    console.log('✅ Backups bucket exists\n');

    // Check for daily backups (backups/YYYY-MM-DD/)
    const { data: dailyFolders, error: dailyError } = await supabase.storage
      .from('backups')
      .list('backups', {
        limit: 100,
        sortBy: { column: 'name', order: 'desc' }
      });

    const dailyBackups = [];
    if (!dailyError && dailyFolders) {
      for (const folder of dailyFolders) {
        if (folder.name && /^\d{4}-\d{2}-\d{2}$/.test(folder.name)) {
          // Get files in this folder to get actual timestamp
          const { data: files } = await supabase.storage
            .from('backups')
            .list(`backups/${folder.name}`, { limit: 1 });
          
          dailyBackups.push({
            date: folder.name,
            path: `backups/${folder.name}`,
            created_at: folder.created_at,
            file_count: files?.length || 0
          });
        }
      }
    }

    // Check for tenant backups (backups/tenant-backups/{org_id}/YYYY-MM-DD/)
    const { data: tenantRoot, error: tenantRootError } = await supabase.storage
      .from('backups')
      .list('tenant-backups', {
        limit: 100
      });

    const tenantBackups = [];
    if (!tenantRootError && tenantRoot) {
      // List organization folders
      for (const orgFolder of tenantRoot) {
        if (orgFolder.name) {
          const { data: dateFolders } = await supabase.storage
            .from('backups')
            .list(`tenant-backups/${orgFolder.name}`, {
              limit: 100,
              sortBy: { column: 'name', order: 'desc' }
            });

          if (dateFolders) {
            for (const dateFolder of dateFolders) {
              if (dateFolder.name && /^\d{4}-\d{2}-\d{2}$/.test(dateFolder.name)) {
                tenantBackups.push({
                  organization_id: orgFolder.name,
                  date: dateFolder.name,
                  path: `tenant-backups/${orgFolder.name}/${dateFolder.name}`,
                  created_at: dateFolder.created_at
                });
              }
            }
          }
        }
      }
    }

    // Display results
    console.log('📊 BACKUP SUMMARY\n');
    console.log('═'.repeat(60));

    if (dailyBackups.length > 0) {
      console.log('\n📦 Daily Backups (Global):');
      console.log('-'.repeat(60));
      dailyBackups.slice(0, 10).forEach(backup => {
        const date = new Date(backup.created_at);
        console.log(`  📅 ${backup.date} - ${date.toLocaleString()}`);
        console.log(`     Files: ${backup.file_count}, Path: ${backup.path}`);
      });
      console.log(`\n  Most recent: ${dailyBackups[0]?.date || 'N/A'}`);
    } else {
      console.log('\n📦 Daily Backups: None found');
    }

    if (tenantBackups.length > 0) {
      console.log('\n🏢 Tenant Backups:');
      console.log('-'.repeat(60));
      
      // Group by date
      const byDate = {};
      tenantBackups.forEach(backup => {
        if (!byDate[backup.date]) {
          byDate[backup.date] = [];
        }
        byDate[backup.date].push(backup);
      });

      const sortedDates = Object.keys(byDate).sort().reverse();
      sortedDates.slice(0, 10).forEach(date => {
        const backups = byDate[date];
        console.log(`  📅 ${date} - ${backups.length} organization(s)`);
        backups.forEach(b => {
          console.log(`     - Org: ${b.organization_id.substring(0, 8)}...`);
        });
      });
      console.log(`\n  Most recent: ${sortedDates[0] || 'N/A'}`);
    } else {
      console.log('\n🏢 Tenant Backups: None found');
    }

    // Overall summary
    console.log('\n' + '═'.repeat(60));
    if (dailyBackups.length === 0 && tenantBackups.length === 0) {
      console.log('\n⚠️  NO BACKUPS FOUND!');
      console.log('\nTo create a backup:');
      console.log('  1. Run: POST /.netlify/functions/daily-tenant-backup');
      console.log('  2. Or use the Tenant Backup & Restore page in the app');
    } else {
      const allDates = [
        ...dailyBackups.map(b => b.date),
        ...tenantBackups.map(b => b.date)
      ].sort().reverse();
      
      console.log(`\n✅ Last backup found: ${allDates[0] || 'Unknown'}`);
      const lastDate = new Date(allDates[0] + 'T00:00:00');
      const daysAgo = Math.floor((Date.now() - lastDate.getTime()) / (1000 * 60 * 60 * 24));
      console.log(`   (${daysAgo} day${daysAgo !== 1 ? 's' : ''} ago)`);
    }

  } catch (error) {
    console.error('\n❌ Error checking backups:', error.message);
    if (error.message.includes('JWT')) {
      console.error('\n💡 Tip: Use SUPABASE_SERVICE_ROLE_KEY for admin access');
    }
    process.exit(1);
  }
}

checkBackups();
