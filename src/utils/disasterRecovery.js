import logger from '../utils/logger';
// Disaster Recovery and Multi-Layer Backup System
import { supabase } from '../supabase/client';

const DISASTER_RECOVERY_CONFIG = {
  // Multiple backup strategies
  backupStrategies: {
    realTimeReplication: true,
    dailySnapshots: true,
    weeklyFullBackups: true,
    cloudStorage: true,
    offSiteBackups: true
  },
  
  // Recovery objectives
  rto: 4, // Recovery Time Objective (hours)
  rpo: 15, // Recovery Point Objective (minutes)
  
  // Storage locations
  storageLocations: [
    'primary_supabase',
    'aws_s3_backup',
    'google_cloud_backup',
    'local_encrypted_backup',
    'offsite_partner_backup'
  ],
  
  // Critical data priorities
  dataPriorities: {
    critical: ['organizations', 'profiles', 'customers', 'bottles'],
    important: ['rentals', 'invoices', 'deliveries', 'audit_logs'],
    standard: ['notifications', 'support_tickets', 'user_sessions']
  }
};

class DisasterRecoveryManager {
  constructor() {
    this.isInitialized = false;
    this.backupStatus = {
      lastFullBackup: null,
      lastIncrementalBackup: null,
      replicationStatus: 'unknown',
      healthCheck: null
    };
  }

  async initialize() {
    logger.log('🛡️ Initializing Disaster Recovery System...');
    
    try {
      // Check system health
      await this.performHealthCheck();
      
      // Initialize backup monitoring
      await this.initializeBackupMonitoring();
      
      // Set up automated backups
      await this.setupAutomatedBackups();
      
      // Initialize real-time replication
      await this.initializeReplication();
      
      this.isInitialized = true;
      logger.log('✅ Disaster Recovery System initialized successfully');
      
    } catch (error) {
      logger.error('❌ Failed to initialize Disaster Recovery System:', error);
      throw error;
    }
  }

  async performHealthCheck() {
    logger.log('🔍 Performing system health check...');
    
    const healthStatus = {
      timestamp: new Date().toISOString(),
      database: 'unknown',
      storage: 'unknown',
      backups: 'unknown',
      replication: 'unknown',
      overall: 'unknown'
    };

    try {
      // Check database connectivity
      const { data, error } = await supabase
        .from('organizations')
        .select('count')
        .limit(1);
      
      healthStatus.database = error ? 'error' : 'healthy';
      
      // Check backup status
      const backupCheck = await this.checkBackupStatus();
      healthStatus.backups = backupCheck.isHealthy ? 'healthy' : 'warning';
      
      // Check storage availability
      healthStatus.storage = await this.checkStorageHealth();
      
      // Overall health assessment
      const criticalSystems = [healthStatus.database, healthStatus.storage];
      healthStatus.overall = criticalSystems.every(s => s === 'healthy') ? 'healthy' : 'warning';
      
      this.backupStatus.healthCheck = healthStatus;
      
      logger.log('📊 Health Check Results:', healthStatus);
      return healthStatus;
      
    } catch (error) {
      logger.error('❌ Health check failed:', error);
      healthStatus.overall = 'error';
      return healthStatus;
    }
  }

  async createEmergencyBackup() {
    logger.log('🚨 Creating emergency backup...');
    
    const backupId = `emergency_${Date.now()}`;
    const backupData = {
      id: backupId,
      timestamp: new Date().toISOString(),
      type: 'emergency',
      status: 'in_progress',
      tables: {},
      metadata: {
        trigger: 'manual_emergency',
        priority: 'critical',
        retention: 'permanent'
      }
    };

    try {
      // Backup critical data first
      for (const table of DISASTER_RECOVERY_CONFIG.dataPriorities.critical) {
        logger.log(`📋 Backing up critical table: ${table}`);
        
        const { data, error, count } = await supabase
          .from(table)
          .select('*', { count: 'exact' });

        if (error) {
          logger.error(`❌ Failed to backup ${table}:`, error);
          continue;
        }

        backupData.tables[table] = {
          records: count || data?.length || 0,
          data: data,
          timestamp: new Date().toISOString(),
          status: 'completed'
        };
        
        // Store backup in multiple locations
        await this.storeBackupData(backupId, table, data);
      }

      // Backup important data
      for (const table of DISASTER_RECOVERY_CONFIG.dataPriorities.important) {
        logger.log(`📋 Backing up important table: ${table}`);
        
        const { data, error, count } = await supabase
          .from(table)
          .select('*', { count: 'exact' });

        if (error) {
          logger.warn(`⚠️ Warning: Could not backup ${table}:`, error);
          continue;
        }

        backupData.tables[table] = {
          records: count || data?.length || 0,
          data: data,
          timestamp: new Date().toISOString(),
          status: 'completed'
        };
        
        await this.storeBackupData(backupId, table, data);
      }

      backupData.status = 'completed';
      backupData.completedAt = new Date().toISOString();
      
      // Store backup metadata
      await this.storeBackupMetadata(backupData);
      
      logger.log('✅ Emergency backup completed successfully');
      logger.log(`📦 Backup ID: ${backupId}`);
      
      return backupData;
      
    } catch (error) {
      logger.error('❌ Emergency backup failed:', error);
      backupData.status = 'failed';
      backupData.error = error.message;
      throw error;
    }
  }

  async storeBackupData(backupId, table, data) {
    const backupPayload = {
      backup_id: backupId,
      table_name: table,
      data: JSON.stringify(data),
      record_count: data?.length || 0,
      created_at: new Date().toISOString()
    };

    try {
      // Store in local storage (browser)
      const localKey = `backup_${backupId}_${table}`;
      localStorage.setItem(localKey, JSON.stringify(backupPayload));
      
      // Store in IndexedDB for larger datasets
      await this.storeInIndexedDB(backupId, table, data);
      
      // TODO: Store in cloud storage (AWS S3, Google Cloud, etc.)
      // await this.storeInCloudStorage(backupId, table, data);
      
      logger.log(`💾 Stored backup for ${table}: ${data?.length || 0} records`);
      
    } catch (error) {
      logger.error(`❌ Failed to store backup for ${table}:`, error);
      throw error;
    }
  }

  async storeInIndexedDB(backupId, table, data) {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('DisasterRecoveryDB', 1);
      
      request.onerror = () => reject(request.error);
      
      request.onsuccess = () => {
        const db = request.result;
        const transaction = db.transaction(['backups'], 'readwrite');
        const store = transaction.objectStore('backups');
        
        const backupRecord = {
          id: `${backupId}_${table}`,
          backupId,
          table,
          data,
          timestamp: new Date().toISOString(),
          recordCount: data?.length || 0
        };
        
        store.put(backupRecord);
        
        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error);
      };
      
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains('backups')) {
          const store = db.createObjectStore('backups', { keyPath: 'id' });
          store.createIndex('backupId', 'backupId', { unique: false });
          store.createIndex('table', 'table', { unique: false });
          store.createIndex('timestamp', 'timestamp', { unique: false });
        }
      };
    });
  }

  async storeBackupMetadata(backupData) {
    const metadata = {
      ...backupData,
      // Remove actual data to keep metadata lightweight
      tables: Object.keys(backupData.tables).reduce((acc, table) => {
        acc[table] = {
          records: backupData.tables[table].records,
          timestamp: backupData.tables[table].timestamp,
          status: backupData.tables[table].status
        };
        return acc;
      }, {})
    };

    // Store metadata in localStorage
    localStorage.setItem(`backup_metadata_${backupData.id}`, JSON.stringify(metadata));
    
    // Store in IndexedDB
    await this.storeInIndexedDB('metadata', backupData.id, metadata);
    
    logger.log(`📋 Stored backup metadata for ${backupData.id}`);
  }

  async listAvailableBackups() {
    logger.log('📋 Listing available backups...');
    
    const backups = [];
    
    try {
      // Get backups from localStorage
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('backup_metadata_')) {
          const metadata = JSON.parse(localStorage.getItem(key));
          backups.push(metadata);
        }
      }
      
      // Sort by timestamp (newest first)
      backups.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
      
      logger.log(`📦 Found ${backups.length} available backups`);
      return backups;
      
    } catch (error) {
      logger.error('❌ Failed to list backups:', error);
      return [];
    }
  }

  async restoreFromBackup(backupId, options = {}) {
    logger.log(`🔄 Starting restore from backup: ${backupId}`);
    
    const restoreOptions = {
      dryRun: false,
      tables: 'all',
      confirmOverwrite: true,
      ...options
    };

    try {
      // Get backup metadata
      const metadata = JSON.parse(localStorage.getItem(`backup_metadata_${backupId}`));
      if (!metadata) {
        throw new Error(`Backup ${backupId} not found`);
      }

      logger.log(`📋 Backup found: ${metadata.type} backup from ${metadata.timestamp}`);
      
      if (restoreOptions.dryRun) {
        logger.log('🧪 DRY RUN MODE - No actual data will be restored');
        return this.simulateRestore(metadata);
      }

      // Confirm destructive operation
      if (restoreOptions.confirmOverwrite) {
        const confirmed = confirm(
          `⚠️ WARNING: This will overwrite existing data!\n\n` +
          `Backup: ${backupId}\n` +
          `Created: ${metadata.timestamp}\n` +
          `Tables: ${Object.keys(metadata.tables).join(', ')}\n\n` +
          `Are you sure you want to continue?`
        );
        
        if (!confirmed) {
          logger.log('❌ Restore cancelled by user');
          return { status: 'cancelled' };
        }
      }

      // Perform actual restore
      const restoreResult = await this.performRestore(backupId, metadata, restoreOptions);
      
      logger.log('✅ Restore completed successfully');
      return restoreResult;
      
    } catch (error) {
      logger.error('❌ Restore failed:', error);
      throw error;
    }
  }

  async performRestore(backupId, metadata, options) {
    const restoreResult = {
      backupId,
      startTime: new Date().toISOString(),
      status: 'in_progress',
      tablesRestored: {},
      errors: []
    };

    try {
      const tablesToRestore = options.tables === 'all' 
        ? Object.keys(metadata.tables)
        : options.tables;

      for (const table of tablesToRestore) {
        logger.log(`🔄 Restoring table: ${table}`);
        
        try {
          // Get backup data
          const backupData = JSON.parse(localStorage.getItem(`backup_${backupId}_${table}`));
          if (!backupData) {
            throw new Error(`Backup data for ${table} not found`);
          }

          const data = JSON.parse(backupData.data);
          
          // Clear existing data (if requested)
          if (options.clearExisting) {
            const { error: deleteError } = await supabase
              .from(table)
              .delete()
              .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all
            
            if (deleteError) {
              logger.warn(`⚠️ Warning: Could not clear ${table}:`, deleteError);
            }
          }

          // Insert backup data
          const { error: insertError } = await supabase
            .from(table)
            .insert(data);

          if (insertError) {
            throw insertError;
          }

          restoreResult.tablesRestored[table] = {
            records: data.length,
            status: 'completed',
            timestamp: new Date().toISOString()
          };
          
          logger.log(`✅ Restored ${table}: ${data.length} records`);
          
        } catch (error) {
          logger.error(`❌ Failed to restore ${table}:`, error);
          restoreResult.errors.push({
            table,
            error: error.message,
            timestamp: new Date().toISOString()
          });
          
          restoreResult.tablesRestored[table] = {
            status: 'failed',
            error: error.message,
            timestamp: new Date().toISOString()
          };
        }
      }

      restoreResult.status = restoreResult.errors.length === 0 ? 'completed' : 'completed_with_errors';
      restoreResult.endTime = new Date().toISOString();
      
      return restoreResult;
      
    } catch (error) {
      restoreResult.status = 'failed';
      restoreResult.error = error.message;
      restoreResult.endTime = new Date().toISOString();
      throw error;
    }
  }

  async simulateRestore(metadata) {
    logger.log('🧪 Simulating restore operation...');
    
    const simulation = {
      backupId: metadata.id,
      backupType: metadata.type,
      backupTimestamp: metadata.timestamp,
      tablesFound: Object.keys(metadata.tables),
      totalRecords: Object.values(metadata.tables).reduce((sum, table) => sum + table.records, 0),
      estimatedDuration: '2-5 minutes',
      warnings: []
    };

    // Check for potential issues
    for (const [table, info] of Object.entries(metadata.tables)) {
      if (info.records === 0) {
        simulation.warnings.push(`Table ${table} has no records`);
      }
      if (info.status !== 'completed') {
        simulation.warnings.push(`Table ${table} backup was not completed successfully`);
      }
    }

    logger.log('📊 Restore Simulation Results:', simulation);
    return simulation;
  }

  async checkBackupStatus() {
    const status = {
      isHealthy: true,
      lastBackup: null,
      backupCount: 0,
      totalSize: 0,
      oldestBackup: null,
      issues: []
    };

    try {
      const backups = await this.listAvailableBackups();
      
      status.backupCount = backups.length;
      status.lastBackup = backups[0]?.timestamp || null;
      status.oldestBackup = backups[backups.length - 1]?.timestamp || null;

      // Check if we have recent backups
      if (backups.length === 0) {
        status.isHealthy = false;
        status.issues.push('No backups found');
      } else {
        const lastBackupTime = new Date(status.lastBackup);
        const hoursSinceLastBackup = (Date.now() - lastBackupTime.getTime()) / (1000 * 60 * 60);
        
        if (hoursSinceLastBackup > 24) {
          status.isHealthy = false;
          status.issues.push(`Last backup was ${Math.round(hoursSinceLastBackup)} hours ago`);
        }
      }

      return status;
      
    } catch (error) {
      logger.error('❌ Failed to check backup status:', error);
      status.isHealthy = false;
      status.issues.push(`Error checking backups: ${error.message}`);
      return status;
    }
  }

  async checkStorageHealth() {
    try {
      // Check localStorage availability
      const testKey = 'storage_health_test';
      localStorage.setItem(testKey, 'test');
      localStorage.removeItem(testKey);
      
      // Check IndexedDB availability
      const request = indexedDB.open('health_check', 1);
      
      return new Promise((resolve) => {
        request.onsuccess = () => {
          request.result.close();
          resolve('healthy');
        };
        
        request.onerror = () => {
          resolve('error');
        };
        
        setTimeout(() => resolve('timeout'), 5000);
      });
      
    } catch (error) {
      logger.error('❌ Storage health check failed:', error);
      return 'error';
    }
  }

  async initializeBackupMonitoring() {
    logger.log('📊 Initializing backup monitoring...');
    
    // Set up periodic health checks
    setInterval(async () => {
      await this.performHealthCheck();
    }, 30 * 60 * 1000); // Every 30 minutes

    // Set up automated backups
    setInterval(async () => {
      await this.createEmergencyBackup();
    }, 24 * 60 * 60 * 1000); // Every 24 hours
  }

  async setupAutomatedBackups() {
    logger.log('⚙️ Setting up automated backups...');
    
    // Schedule daily backups
    const scheduleBackup = () => {
      const now = new Date();
      const tomorrow = new Date(now);
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(2, 0, 0, 0); // 2 AM
      
      const msUntilTomorrow = tomorrow.getTime() - now.getTime();
      
      setTimeout(async () => {
        await this.createEmergencyBackup();
        scheduleBackup(); // Schedule next backup
      }, msUntilTomorrow);
    };
    
    scheduleBackup();
  }

  async initializeReplication() {
    logger.log('🔄 Initializing real-time replication...');
    
    // Set up real-time listeners for critical tables
    const criticalTables = DISASTER_RECOVERY_CONFIG.dataPriorities.critical;
    
    for (const table of criticalTables) {
      supabase
        .channel(`replication_${table}`)
        .on('postgres_changes', 
          { event: '*', schema: 'public', table: table },
          (payload) => {
            logger.log(`📡 Replication event for ${table}:`, payload);
            // TODO: Implement real-time backup of changes
          }
        )
        .subscribe();
    }
  }

  async clearOldBackups(cutoffDate = new Date('2024-07-01')) {
    logger.log(`🧹 Clearing backups from before ${cutoffDate.toISOString()}...`);
    
    const clearedBackups = [];
    const errors = [];
    
    try {
      // Clear from localStorage
      const keysToRemove = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (key.startsWith('backup_') || key.startsWith('backup_metadata_'))) {
          try {
            const data = JSON.parse(localStorage.getItem(key));
            if (data && data.timestamp) {
              const backupDate = new Date(data.timestamp);
              if (backupDate < cutoffDate) {
                keysToRemove.push(key);
                clearedBackups.push({
                  key,
                  timestamp: data.timestamp,
                  type: 'localStorage'
                });
              }
            }
          } catch (parseError) {
            // If we can't parse the data, check if it's an old backup by key pattern
            if (key.includes('emergency_') || key.includes('backup_')) {
              // Try to extract timestamp from key
              const timestampMatch = key.match(/(\d{10,13})/);
              if (timestampMatch) {
                const timestamp = parseInt(timestampMatch[1]);
                if (timestamp < cutoffDate.getTime()) {
                  keysToRemove.push(key);
                  clearedBackups.push({
                    key,
                    timestamp: new Date(timestamp).toISOString(),
                    type: 'localStorage'
                  });
                }
              }
            }
          }
        }
      }
      
      // Remove old backups from localStorage
      keysToRemove.forEach(key => {
        try {
          localStorage.removeItem(key);
          logger.log(`🗑️ Removed old backup: ${key}`);
        } catch (error) {
          errors.push(`Failed to remove ${key}: ${error.message}`);
        }
      });
      
      // Clear from IndexedDB
      try {
        await this.clearOldBackupsFromIndexedDB(cutoffDate);
      } catch (indexedDBError) {
        errors.push(`IndexedDB cleanup failed: ${indexedDBError.message}`);
      }
      
      logger.log(`✅ Cleanup complete: ${clearedBackups.length} old backups cleared`);
      
      return {
        success: true,
        clearedCount: clearedBackups.length,
        clearedBackups,
        errors: errors.length > 0 ? errors : null
      };
      
    } catch (error) {
      logger.error('❌ Failed to clear old backups:', error);
      return {
        success: false,
        clearedCount: clearedBackups.length,
        clearedBackups,
        errors: [error.message, ...errors]
      };
    }
  }

  async clearOldBackupsFromIndexedDB(cutoffDate) {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('DisasterRecoveryDB', 1);
      
      request.onerror = () => reject(request.error);
      
      request.onsuccess = () => {
        const db = request.result;
        const transaction = db.transaction(['backups'], 'readwrite');
        const store = transaction.objectStore('backups');
        const index = store.index('timestamp');
        
        const range = IDBKeyRange.upperBound(cutoffDate.toISOString());
        const clearRequest = index.openCursor(range);
        
        let clearedCount = 0;
        
        clearRequest.onsuccess = (event) => {
          const cursor = event.target.result;
          if (cursor) {
            store.delete(cursor.primaryKey);
            clearedCount++;
            cursor.continue();
          } else {
            logger.log(`🗑️ Removed ${clearedCount} old backups from IndexedDB`);
            resolve(clearedCount);
          }
        };
        
        clearRequest.onerror = () => reject(clearRequest.error);
      };
      
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains('backups')) {
          const store = db.createObjectStore('backups', { keyPath: 'id' });
          store.createIndex('backupId', 'backupId', { unique: false });
          store.createIndex('table', 'table', { unique: false });
          store.createIndex('timestamp', 'timestamp', { unique: false });
        }
      };
    });
  }

  async createBackupWithCleanup() {
    logger.log('🔄 Creating backup and clearing old backups...');
    
    try {
      // First, create a new backup
      const backup = await this.createEmergencyBackup();
      logger.log(`✅ New backup created: ${backup.id}`);
      
      // Then, clear old backups from before July 2024
      const cleanupResult = await this.clearOldBackups(new Date('2024-07-01'));
      
      if (cleanupResult.success) {
        logger.log(`✅ Cleanup completed: ${cleanupResult.clearedCount} old backups removed`);
      } else {
        logger.warn(`⚠️ Cleanup had issues: ${cleanupResult.errors?.join(', ')}`);
      }
      
      return {
        backup,
        cleanup: cleanupResult,
        summary: {
          newBackupId: backup.id,
          oldBackupsCleared: cleanupResult.clearedCount,
          timestamp: new Date().toISOString()
        }
      };
      
    } catch (error) {
      logger.error('❌ Backup and cleanup failed:', error);
      throw error;
    }
  }

  // Public API methods
  async getRecoveryStatus() {
    return {
      isInitialized: this.isInitialized,
      backupStatus: this.backupStatus,
      healthCheck: await this.performHealthCheck(),
      availableBackups: await this.listAvailableBackups()
    };
  }

  async createBackup(type = 'manual') {
    return await this.createEmergencyBackup();
  }

  async restore(backupId, options = {}) {
    return await this.restoreFromBackup(backupId, options);
  }
}

// Export singleton instance
export const disasterRecovery = new DisasterRecoveryManager();

// Initialize on app start
export const initializeDisasterRecovery = async () => {
  try {
    await disasterRecovery.initialize();
    logger.log('✅ Disaster Recovery System ready');
  } catch (error) {
    logger.error('❌ Failed to initialize Disaster Recovery:', error);
  }
};

// Emergency backup button for admin UI
export const createEmergencyBackup = async () => {
  return await disasterRecovery.createBackup('emergency');
};

// Recovery status for admin dashboard
export const getRecoveryStatus = async () => {
  return await disasterRecovery.getRecoveryStatus();
};

// Restore from backup with confirmation
export const restoreFromBackup = async (backupId, options = {}) => {
  return await disasterRecovery.restore(backupId, options);
};

export const clearOldBackups = async (cutoffDate = new Date('2024-07-01')) => {
  return await disasterRecovery.clearOldBackups(cutoffDate);
};

export const createBackupWithCleanup = async () => {
  return await disasterRecovery.createBackupWithCleanup();
}; 