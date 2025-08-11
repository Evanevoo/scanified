// Backup and Cleanup Script
// Run this in your browser console to create a backup and clear old backups from before July 2024

(async function() {
  console.log('🚀 Gas Cylinder App - Backup and Cleanup Script');
  console.log('================================================');
  
  try {
    // Import the backup manager
    const { createBackupAndCleanup, getBackupStats } = await import('./src/utils/backupManager.js');
    
    // Get current backup statistics
    console.log('📊 Getting current backup statistics...');
    const stats = await getBackupStats();
    console.log('Current backup stats:', stats);
    
    // Create backup and cleanup
    console.log('\n🔄 Creating backup and clearing old backups...');
    const result = await createBackupAndCleanup();
    
    // Display results
    console.log('\n✅ Backup and Cleanup Results:');
    console.log('================================');
    console.log(`📦 New Backup ID: ${result.summary.newBackupId}`);
    console.log(`🗑️ Old Backups Cleared: ${result.summary.oldBackupsCleared}`);
    console.log(`⏰ Timestamp: ${result.summary.timestamp}`);
    
    if (result.cleanup.errors) {
      console.log('\n⚠️ Cleanup Warnings:');
      result.cleanup.errors.forEach(error => console.log(`  - ${error}`));
    }
    
    // Get updated statistics
    console.log('\n📊 Updated backup statistics...');
    const updatedStats = await getBackupStats();
    console.log('Updated backup stats:', updatedStats);
    
    console.log('\n🎉 Backup and cleanup completed successfully!');
    
  } catch (error) {
    console.error('❌ Script failed:', error);
    console.log('\n🔧 Troubleshooting:');
    console.log('1. Make sure you\'re logged into the app');
    console.log('2. Check your browser console for any errors');
    console.log('3. Try refreshing the page and running again');
  }
})();
