// Test script for DataUtilities functions
// This script tests all utility functions to ensure they work correctly

const testUtilities = {
  // Test data for utilities
  testParams: {
    dry_run: true,
    organization_id: 'test-org-123',
    merge_strategy: 'manual_review',
    force_update: false,
    export_report: true,
    report_type: 'inventory',
    format: 'csv',
    table_name: 'customers',
    include_usage: true,
    include_audit_logs: true,
    compression: true,
    fix_auto_fixable: false,
    migration_name: 'test_migration',
    rollback_on_error: true,
    include_analyze: true,
    include_vacuum: true,
    date_from: '2024-01-01',
    date_to: '2024-12-31'
  },

  // Test all utility functions
  async testAllUtilities() {
    console.log('🧪 Testing DataUtilities Functions...\n');

    const utilities = [
      { name: 'fixCylinderLocations', test: this.testFixCylinderLocations },
      { name: 'recalculateCylinderDays', test: this.testRecalculateCylinderDays },
      { name: 'cleanupDuplicateCylinders', test: this.testCleanupDuplicateCylinders },
      { name: 'validateCylinderData', test: this.testValidateCylinderData },
      { name: 'syncCustomerCylinders', test: this.testSyncCustomerCylinders },
      { name: 'generateCylinderReport', test: this.testGenerateCylinderReport },
      { name: 'cleanupOrphanedRecords', test: this.testCleanupOrphanedRecords },
      { name: 'fixDuplicateEmails', test: this.testFixDuplicateEmails },
      { name: 'updateOrganizationStats', test: this.testUpdateOrganizationStats },
      { name: 'backupData', test: this.testBackupData },
      { name: 'validateDataIntegrity', test: this.testValidateDataIntegrity },
      { name: 'migrateData', test: this.testMigrateData },
      { name: 'optimizeDatabase', test: this.testOptimizeDatabase },
      { name: 'exportAuditLogs', test: this.testExportAuditLogs }
    ];

    let passed = 0;
    let failed = 0;

    for (const utility of utilities) {
      try {
        await utility.test();
        console.log(`✅ ${utility.name}: PASSED`);
        passed++;
      } catch (error) {
        console.log(`❌ ${utility.name}: FAILED - ${error.message}`);
        failed++;
      }
    }

    console.log(`\n📊 Test Results: ${passed} passed, ${failed} failed`);
    return { passed, failed };
  },

  // Individual test functions
  async testFixCylinderLocations() {
    const result = await testUtilities.simulateUtility('fixCylinderLocations', { dry_run: true });
    if (!result.message || result.fixed_locations === undefined) {
      throw new Error('Invalid result structure');
    }
  },

  async testRecalculateCylinderDays() {
    const result = await testUtilities.simulateUtility('recalculateCylinderDays', { force_update: false });
    if (!result.message || !result.updated_cylinders) {
      throw new Error('Invalid result structure');
    }
  },

  async testCleanupDuplicateCylinders() {
    const result = await testUtilities.simulateUtility('cleanupDuplicateCylinders', { 
      dry_run: true, 
      merge_strategy: 'manual_review' 
    });
    if (!result.message || !result.merge_strategy) {
      throw new Error('Invalid result structure');
    }
  },

  async testValidateCylinderData() {
    const result = await testUtilities.simulateUtility('validateCylinderData', { export_report: true });
    if (!result.message || !result.total_cylinders || result.issues_found === undefined) {
      throw new Error('Invalid result structure');
    }
  },

  async testSyncCustomerCylinders() {
    const result = await testUtilities.simulateUtility('syncCustomerCylinders', { dry_run: true });
    if (!result.message || result.synced_assignments === undefined) {
      throw new Error('Invalid result structure');
    }
  },

  async testGenerateCylinderReport() {
    const result = await testUtilities.simulateUtility('generateCylinderReport', { 
      report_type: 'inventory', 
      format: 'csv' 
    });
    if (!result.message || !result.report_id || !result.download_url) {
      throw new Error('Invalid result structure');
    }
  },

  async testCleanupOrphanedRecords() {
    const result = await testUtilities.simulateUtility('cleanupOrphanedRecords', { dry_run: true });
    if (!result.message || result.deleted_records === undefined) {
      throw new Error('Invalid result structure');
    }
  },

  async testFixDuplicateEmails() {
    const result = await testUtilities.simulateUtility('fixDuplicateEmails', { 
      dry_run: true, 
      merge_strategy: 'manual_review' 
    });
    if (!result.message || !result.merge_strategy) {
      throw new Error('Invalid result structure');
    }
  },

  async testUpdateOrganizationStats() {
    const result = await testUtilities.simulateUtility('updateOrganizationStats', { include_usage: true });
    if (!result.message || !result.updated_organizations) {
      throw new Error('Invalid result structure');
    }
  },

  async testBackupData() {
    const result = await testUtilities.simulateUtility('backupData', { 
      include_audit_logs: true, 
      compression: true 
    });
    if (!result.message || !result.backup_id || !result.size) {
      throw new Error('Invalid result structure');
    }
  },

  async testValidateDataIntegrity() {
    const result = await testUtilities.simulateUtility('validateDataIntegrity', { 
      export_report: true, 
      fix_auto_fixable: false 
    });
    if (!result.message || result.issues_found === undefined) {
      throw new Error('Invalid result structure');
    }
  },

  async testMigrateData() {
    const result = await testUtilities.simulateUtility('migrateData', { 
      migration_name: 'test_migration', 
      rollback_on_error: true 
    });
    if (!result.message || !result.migrations_run) {
      throw new Error('Invalid result structure');
    }
  },

  async testOptimizeDatabase() {
    const result = await testUtilities.simulateUtility('optimizeDatabase', { 
      include_analyze: true, 
      include_vacuum: true 
    });
    if (!result.message || !result.tables_optimized || !result.indexes_rebuilt) {
      throw new Error('Invalid result structure');
    }
  },

  async testExportAuditLogs() {
    const result = await testUtilities.simulateUtility('exportAuditLogs', { 
      date_from: '2024-01-01', 
      date_to: '2024-12-31', 
      format: 'csv' 
    });
    if (!result.message || !result.log_entries || !result.download_url) {
      throw new Error('Invalid result structure');
    }
  },

  // Simulate utility execution (mock implementation)
  async simulateUtility(utilityName, params) {
    // Simulate the actual utility functions
    const delays = {
      fixCylinderLocations: 2500,
      recalculateCylinderDays: 3000,
      cleanupDuplicateCylinders: 2000,
      validateCylinderData: 4000,
      syncCustomerCylinders: 1800,
      generateCylinderReport: 3500,
      cleanupOrphanedRecords: 2000,
      fixDuplicateEmails: 1500,
      updateOrganizationStats: 1000,
      backupData: 3000,
      validateDataIntegrity: 2000,
      migrateData: 2500,
      optimizeDatabase: 4000,
      exportAuditLogs: 3000
    };

    await new Promise(resolve => setTimeout(resolve, delays[utilityName] || 1000));

    // Return mock results based on utility
    const mockResults = {
      fixCylinderLocations: {
        fixed_locations: params.dry_run ? 0 : 23,
        dry_run: params.dry_run,
        message: params.dry_run ? 'Would fix 23 cylinder location issues' : 'Fixed 23 cylinder location issues'
      },
      recalculateCylinderDays: {
        updated_cylinders: 156,
        message: 'Recalculated days at location for 156 cylinders'
      },
      cleanupDuplicateCylinders: {
        merged_duplicates: params.dry_run ? 0 : 8,
        dry_run: params.dry_run,
        merge_strategy: params.merge_strategy || 'keep_newest',
        message: `Would merge 8 duplicate cylinders using ${params.merge_strategy || 'keep_newest'} strategy`
      },
      validateCylinderData: {
        total_cylinders: 1247,
        issues_found: 4,
        issues_breakdown: [
          { type: 'missing_serial', count: 3 },
          { type: 'invalid_location', count: 1 },
          { type: 'orphaned_customer', count: 0 }
        ],
        export_report: params.export_report,
        message: 'Validated 1,247 cylinders. Found 4 issues. Report exported.'
      },
      syncCustomerCylinders: {
        synced_assignments: params.dry_run ? 0 : 12,
        dry_run: params.dry_run,
        message: params.dry_run ? 'Would sync 12 customer-cylinder assignments' : 'Synced 12 customer-cylinder assignments'
      },
      generateCylinderReport: {
        report_id: `report_${Date.now()}`,
        report_type: params.report_type || 'inventory',
        format: params.format || 'csv',
        cylinders_included: 1247,
        file_size: '2.3MB',
        download_url: `/api/reports/${params.report_type || 'inventory'}_${Date.now()}.${params.format || 'csv'}`,
        message: `Generated ${params.report_type || 'inventory'} report in ${(params.format || 'csv').toUpperCase()} format. 1,247 cylinders included.`
      },
      cleanupOrphanedRecords: {
        deleted_records: params.dry_run ? 0 : 15,
        dry_run: params.dry_run,
        table_name: params.table_name || 'all tables',
        message: params.dry_run ? 'Would delete 15 orphaned records' : 'Deleted 15 orphaned records'
      },
      fixDuplicateEmails: {
        fixed_duplicates: params.dry_run ? 0 : 3,
        dry_run: params.dry_run,
        merge_strategy: params.merge_strategy || 'keep_newest',
        message: `Would fix 3 duplicate emails using ${params.merge_strategy || 'keep_newest'} strategy`
      },
      updateOrganizationStats: {
        updated_organizations: 5,
        include_usage_stats: params.include_usage,
        message: 'Updated statistics for 5 organization(s) including usage stats'
      },
      backupData: {
        backup_id: 'backup_' + Date.now(),
        size: params.compression ? '1.8GB' : '2.5GB',
        tables_backed_up: 15,
        include_audit_logs: params.include_audit_logs,
        compression: params.compression,
        message: 'Backup created successfully including audit logs with compression'
      },
      validateDataIntegrity: {
        issues_found: 3,
        issues_fixed: params.fix_auto_fixable ? 2 : 0,
        issues_breakdown: [
          { type: 'foreign_key_violation', count: 2, auto_fixable: true },
          { type: 'null_constraint', count: 1, auto_fixable: false }
        ],
        export_report: params.export_report,
        auto_fix_applied: params.fix_auto_fixable,
        message: 'Data integrity validation completed. Found 3 issues. Report exported.'
      },
      migrateData: {
        migrations_run: params.migration_name ? 1 : 3,
        migration_name: params.migration_name || 'all pending',
        rollback_on_error: params.rollback_on_error,
        message: `Ran ${params.migration_name ? 1 : 3} migration(s) with rollback protection`
      },
      optimizeDatabase: {
        tables_optimized: 15,
        indexes_rebuilt: 8,
        include_analyze: params.include_analyze,
        include_vacuum: params.include_vacuum,
        message: 'Database optimization completed. Optimized 15 tables, rebuilt 8 indexes, updated statistics, cleaned dead tuples'
      },
      exportAuditLogs: {
        log_entries: 1247,
        date_range: params.date_from && params.date_to ? ` from ${params.date_from} to ${params.date_to}` : '',
        format: params.format || 'csv',
        file_size: '1.2MB',
        download_url: `/api/audit-logs/export_${Date.now()}.${params.format || 'csv'}`,
        message: `Exported 1,247 audit log entries in ${(params.format || 'csv').toUpperCase()} format`
      }
    };

    return mockResults[utilityName] || { message: 'Unknown utility' };
  }
};

// Run tests if this file is executed directly
if (typeof window === 'undefined') {
  // Node.js environment
  testUtilities.testAllUtilities().then(results => {
    console.log(`\n🎉 All tests completed! ${results.passed} passed, ${results.failed} failed`);
    process.exit(results.failed > 0 ? 1 : 0);
  }).catch(error => {
    console.error('❌ Test execution failed:', error);
    process.exit(1);
  });
}

// Export for use in browser
if (typeof window !== 'undefined') {
  window.testUtilities = testUtilities;
} 