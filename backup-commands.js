// Backup Commands for Browser Console
// Copy and paste these commands into your browser console

// Command 1: Create backup and clear old backups (RECOMMENDED)
// This will create a new backup and remove all backups from before July 2024
(async () => {
  try {
    console.log('🚀 Creating backup and clearing old backups...');
    const { createBackupAndCleanup } = await import('./src/utils/backupManager.js');
    const result = await createBackupAndCleanup();
    console.log('✅ Success!', result.summary);
  } catch (error) {
    console.error('❌ Failed:', error);
  }
})();

// Command 2: Create backup only (no cleanup)
// This will only create a new backup without removing old ones
(async () => {
  try {
    console.log('📦 Creating new backup...');
    const { createNewBackup } = await import('./src/utils/backupManager.js');
    const backup = await createNewBackup();
    console.log('✅ Backup created:', backup.id);
  } catch (error) {
    console.error('❌ Failed:', error);
  }
})();

// Command 3: Clear old backups only (no new backup)
// This will only remove backups from before July 2024
(async () => {
  try {
    console.log('🧹 Clearing old backups...');
    const { clearOldBackupsOnly } = await import('./src/utils/backupManager.js');
    const result = await clearOldBackupsOnly();
    console.log('✅ Cleanup completed:', result.clearedCount, 'backups removed');
  } catch (error) {
    console.error('❌ Failed:', error);
  }
})();

// Command 4: List all backups
// This will show you all available backups
(async () => {
  try {
    console.log('📋 Listing all backups...');
    const { listAllBackups } = await import('./src/utils/backupManager.js');
    const backups = await listAllBackups();
    console.log('Available backups:', backups);
  } catch (error) {
    console.error('❌ Failed:', error);
  }
})();

// Command 5: Get backup statistics
// This will show you backup statistics
(async () => {
  try {
    console.log('📊 Getting backup statistics...');
    const { getBackupStats } = await import('./src/utils/backupManager.js');
    const stats = await getBackupStats();
    console.log('Backup statistics:', stats);
  } catch (error) {
    console.error('❌ Failed:', error);
  }
})();
