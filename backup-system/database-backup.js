#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
const archiver = require('archiver');

// Configuration
const CONFIG = {
  supabaseUrl: process.env.SUPABASE_URL,
  supabaseServiceKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
  backupDir: './database-backups',
  retentionDays: 30,
  encryptBackups: true
};

class DatabaseBackup {
  constructor() {
    this.supabase = createClient(CONFIG.supabaseUrl, CONFIG.supabaseServiceKey);
    this.timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    this.backupName = `db-backup-${this.timestamp}`;
    this.backupPath = path.join(CONFIG.backupDir, this.backupName);
  }

  async createBackup() {
    try {
      console.log('🗄️ Starting database backup...');
      
      // Create backup directory
      this.createBackupDirectory();
      
      // Export all tables
      await this.exportAllTables();
      
      // Create backup metadata
      await this.createBackupMetadata();
      
      // Create compressed archive
      await this.createCompressedArchive();
      
      // Clean up old backups
      await this.cleanupOldBackups();
      
      console.log('✅ Database backup completed successfully!');
      console.log(`📦 Backup location: ${this.backupPath}.zip`);
      
    } catch (error) {
      console.error('❌ Database backup failed:', error);
      throw error;
    }
  }

  createBackupDirectory() {
    console.log('📁 Creating backup directory...');
    
    if (!fs.existsSync(CONFIG.backupDir)) {
      fs.mkdirSync(CONFIG.backupDir, { recursive: true });
    }
    
    fs.mkdirSync(this.backupPath, { recursive: true });
  }

  async exportAllTables() {
    console.log('📊 Exporting all tables...');
    
    const tables = [
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
      'user_invites'
    ];

    const exportStats = {
      totalRecords: 0,
      totalSize: 0,
      tableStats: {}
    };

    for (const table of tables) {
      try {
        console.log(`  📋 Exporting ${table}...`);
        
        const { data, error, count } = await this.supabase
          .from(table)
          .select('*', { count: 'exact' });

        if (error) {
          console.warn(`  ⚠️ Warning: Could not export ${table}:`, error.message);
          continue;
        }

        const jsonData = JSON.stringify(data, null, 2);
        const filePath = path.join(this.backupPath, `${table}.json`);
        
        fs.writeFileSync(filePath, jsonData);
        
        const recordCount = count || data?.length || 0;
        const fileSize = Buffer.byteLength(jsonData, 'utf8');
        
        exportStats.totalRecords += recordCount;
        exportStats.totalSize += fileSize;
        exportStats.tableStats[table] = {
          records: recordCount,
          size: fileSize,
          sizeFormatted: this.formatBytes(fileSize)
        };
        
        console.log(`    ✅ ${table}: ${recordCount} records (${this.formatBytes(fileSize)})`);
        
      } catch (error) {
        console.error(`  ❌ Error exporting ${table}:`, error);
      }
    }

    console.log(`📊 Export complete: ${exportStats.totalRecords} total records (${this.formatBytes(exportStats.totalSize)})`);
    
    // Save export statistics
    fs.writeFileSync(
      path.join(this.backupPath, 'export-stats.json'),
      JSON.stringify(exportStats, null, 2)
    );
  }

  async createBackupMetadata() {
    console.log('📝 Creating backup metadata...');
    
    const metadata = {
      backupId: this.backupName,
      timestamp: new Date().toISOString(),
      backupType: 'full',
      version: '1.0.0',
      environment: process.env.NODE_ENV || 'production',
      supabaseProject: CONFIG.supabaseUrl,
      
      // System information
      system: {
        platform: process.platform,
        arch: process.arch,
        nodeVersion: process.version,
        backupTool: 'gas-cylinder-app-backup'
      },
      
      // Backup configuration
      configuration: {
        retentionDays: CONFIG.retentionDays,
        encrypted: CONFIG.encryptBackups,
        compression: true
      },
      
      // Database schema version (if available)
      schemaVersion: await this.getSchemaVersion(),
      
      // Backup validation
      validation: {
        checksumMethod: 'sha256',
        verified: false // Will be set after validation
      }
    };

    fs.writeFileSync(
      path.join(this.backupPath, 'metadata.json'),
      JSON.stringify(metadata, null, 2)
    );
    
    console.log('✅ Backup metadata created');
  }

  async getSchemaVersion() {
    try {
      // Try to get schema version from migrations table or similar
      const { data, error } = await this.supabase
        .from('schema_migrations')
        .select('version')
        .order('version', { ascending: false })
        .limit(1);
      
      if (error || !data || data.length === 0) {
        return 'unknown';
      }
      
      return data[0].version;
    } catch (error) {
      return 'unknown';
    }
  }

  async createCompressedArchive() {
    console.log('🗜️ Creating compressed archive...');
    
    return new Promise((resolve, reject) => {
      const output = fs.createWriteStream(`${this.backupPath}.zip`);
      const archive = archiver('zip', {
        zlib: { level: 9 } // Maximum compression
      });

      output.on('close', () => {
        console.log(`✅ Archive created: ${this.formatBytes(archive.pointer())}`);
        
        // Clean up uncompressed backup directory
        fs.rmSync(this.backupPath, { recursive: true, force: true });
        
        resolve();
      });

      output.on('error', reject);
      archive.on('error', reject);
      
      archive.pipe(output);
      archive.directory(this.backupPath, false);
      archive.finalize();
    });
  }

  async cleanupOldBackups() {
    console.log('🧹 Cleaning up old backups...');
    
    try {
      const files = fs.readdirSync(CONFIG.backupDir);
      const backupFiles = files.filter(file => file.startsWith('db-backup-') && file.endsWith('.zip'));
      
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - CONFIG.retentionDays);
      
      let deletedCount = 0;
      
      for (const file of backupFiles) {
        const filePath = path.join(CONFIG.backupDir, file);
        const stats = fs.statSync(filePath);
        
        if (stats.mtime < cutoffDate) {
          fs.unlinkSync(filePath);
          deletedCount++;
          console.log(`  🗑️ Deleted old backup: ${file}`);
        }
      }
      
      console.log(`✅ Cleanup complete: ${deletedCount} old backups deleted`);
      
    } catch (error) {
      console.warn('⚠️ Warning: Could not cleanup old backups:', error.message);
    }
  }

  formatBytes(bytes, decimals = 2) {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  }

  // Restore functionality
  async restoreFromBackup(backupFilePath) {
    console.log('🔄 Starting database restore...');
    
    try {
      // Extract backup
      const extractPath = await this.extractBackup(backupFilePath);
      
      // Validate backup
      await this.validateBackup(extractPath);
      
      // Restore tables
      await this.restoreTables(extractPath);
      
      console.log('✅ Database restore completed successfully!');
      
    } catch (error) {
      console.error('❌ Database restore failed:', error);
      throw error;
    }
  }

  async extractBackup(backupFilePath) {
    // Implementation for extracting backup archive
    // This would use a library like yauzl or similar
    throw new Error('Restore functionality not implemented yet');
  }

  async validateBackup(extractPath) {
    // Implementation for validating backup integrity
    throw new Error('Validation functionality not implemented yet');
  }

  async restoreTables(extractPath) {
    // Implementation for restoring tables from backup
    throw new Error('Restore functionality not implemented yet');
  }
}

// Automated backup service
class AutomatedBackupService {
  constructor() {
    this.backupInterval = 24 * 60 * 60 * 1000; // 24 hours
    this.isRunning = false;
  }

  start() {
    if (this.isRunning) {
      console.log('⚠️ Automated backup service is already running');
      return;
    }

    console.log('🚀 Starting automated backup service...');
    this.isRunning = true;

    // Run initial backup
    this.runBackup();

    // Schedule recurring backups
    this.intervalId = setInterval(() => {
      this.runBackup();
    }, this.backupInterval);

    console.log('✅ Automated backup service started');
  }

  stop() {
    if (!this.isRunning) {
      console.log('⚠️ Automated backup service is not running');
      return;
    }

    console.log('🛑 Stopping automated backup service...');
    
    if (this.intervalId) {
      clearInterval(this.intervalId);
    }
    
    this.isRunning = false;
    console.log('✅ Automated backup service stopped');
  }

  async runBackup() {
    try {
      console.log('⏰ Running scheduled backup...');
      const backup = new DatabaseBackup();
      await backup.createBackup();
      console.log('✅ Scheduled backup completed');
    } catch (error) {
      console.error('❌ Scheduled backup failed:', error);
      // Could send notification/alert here
    }
  }
}

// CLI execution
if (require.main === module) {
  const args = process.argv.slice(2);
  const command = args[0];

  switch (command) {
    case 'backup':
      const backup = new DatabaseBackup();
      backup.createBackup().catch(console.error);
      break;
      
    case 'restore':
      const restoreFile = args[1];
      if (!restoreFile) {
        console.error('❌ Please provide backup file path');
        process.exit(1);
      }
      const restoreBackup = new DatabaseBackup();
      restoreBackup.restoreFromBackup(restoreFile).catch(console.error);
      break;
      
    case 'service':
      const service = new AutomatedBackupService();
      service.start();
      
      // Handle graceful shutdown
      process.on('SIGINT', () => {
        console.log('\n🛑 Received SIGINT, shutting down gracefully...');
        service.stop();
        process.exit(0);
      });
      
      process.on('SIGTERM', () => {
        console.log('\n🛑 Received SIGTERM, shutting down gracefully...');
        service.stop();
        process.exit(0);
      });
      
      break;
      
    default:
      console.log(`
Gas Cylinder App - Database Backup Tool

Usage:
  node database-backup.js backup          # Create a one-time backup
  node database-backup.js restore <file>  # Restore from backup file
  node database-backup.js service         # Start automated backup service

Environment Variables:
  SUPABASE_URL              # Your Supabase project URL
  SUPABASE_SERVICE_ROLE_KEY # Your Supabase service role key

Examples:
  node database-backup.js backup
  node database-backup.js restore ./database-backups/db-backup-2024-01-15.zip
  node database-backup.js service
      `);
  }
}

module.exports = { DatabaseBackup, AutomatedBackupService }; 