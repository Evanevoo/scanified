// Backup Manager Utility
// Easy-to-use functions for creating backups and cleaning up old ones

import { createEmergencyBackup, clearOldBackups, createBackupWithCleanup } from './disasterRecovery.js';

/**
 * Create a new backup and clear old backups from before July 2024
 * @returns {Promise<Object>} Result object with backup and cleanup information
 */
export const createBackupAndCleanup = async () => {
  try {
    console.log('🚀 Starting backup and cleanup process...');
    
    const result = await createBackupWithCleanup();
    
    console.log('✅ Backup and cleanup completed successfully!');
    console.log(`📦 New backup ID: ${result.summary.newBackupId}`);
    console.log(`🗑️ Old backups cleared: ${result.summary.oldBackupsCleared}`);
    
    return result;
  } catch (error) {
    console.error('❌ Backup and cleanup failed:', error);
    throw error;
  }
};

/**
 * Create a new backup only
 * @returns {Promise<Object>} Backup result
 */
export const createNewBackup = async () => {
  try {
    console.log('📦 Creating new backup...');
    const backup = await createEmergencyBackup();
    console.log(`✅ Backup created successfully: ${backup.id}`);
    return backup;
  } catch (error) {
    console.error('❌ Backup creation failed:', error);
    throw error;
  }
};

/**
 * Clear old backups from before a specific date
 * @param {Date} cutoffDate - Date before which backups should be cleared (default: July 1, 2024)
 * @returns {Promise<Object>} Cleanup result
 */
export const clearOldBackupsOnly = async (cutoffDate = new Date('2024-07-01')) => {
  try {
    console.log(`🧹 Clearing backups from before ${cutoffDate.toISOString()}...`);
    const result = await clearOldBackups(cutoffDate);
    
    if (result.success) {
      console.log(`✅ Cleanup completed: ${result.clearedCount} old backups removed`);
    } else {
      console.warn(`⚠️ Cleanup had issues: ${result.errors?.join(', ')}`);
    }
    
    return result;
  } catch (error) {
    console.error('❌ Cleanup failed:', error);
    throw error;
  }
};

/**
 * List all available backups
 * @returns {Promise<Array>} Array of backup metadata
 */
export const listAllBackups = async () => {
  try {
    const { disasterRecovery } = await import('./disasterRecovery.js');
    const backups = await disasterRecovery.listAvailableBackups();
    console.log(`📋 Found ${backups.length} available backups`);
    return backups;
  } catch (error) {
    console.error('❌ Failed to list backups:', error);
    throw error;
  }
};

/**
 * Get backup statistics
 * @returns {Promise<Object>} Backup statistics
 */
export const getBackupStats = async () => {
  try {
    const backups = await listAllBackups();
    const now = new Date();
    const july2024 = new Date('2024-07-01');
    
    const stats = {
      totalBackups: backups.length,
      backupsBeforeJuly: backups.filter(b => new Date(b.timestamp) < july2024).length,
      backupsAfterJuly: backups.filter(b => new Date(b.timestamp) >= july2024).length,
      oldestBackup: backups.length > 0 ? backups[backups.length - 1].timestamp : null,
      newestBackup: backups.length > 0 ? backups[0].timestamp : null,
      storageUsed: 'Calculating...' // This would need to be implemented
    };
    
    return stats;
  } catch (error) {
    console.error('❌ Failed to get backup stats:', error);
    throw error;
  }
};
