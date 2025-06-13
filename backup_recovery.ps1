# Gas Cylinder App - Backup and Recovery Script
# This script helps backup and recover data for the gas cylinder management system

param(
    [string]$Action = "backup",  # backup, restore, or check
    [string]$BackupPath = ".\backups\",
    [string]$ProjectPath = ".\"
)

# Create backup directory if it doesn't exist
if (!(Test-Path $BackupPath)) {
    New-Item -ItemType Directory -Path $BackupPath -Force
}

$timestamp = Get-Date -Format "yyyy-MM-dd_HH-mm-ss"
$backupFolder = Join-Path $BackupPath "backup_$timestamp"

function Write-Log {
    param([string]$Message, [string]$Level = "INFO")
    $logMessage = "$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss') [$Level] $Message"
    Write-Host $logMessage
    Add-Content -Path (Join-Path $BackupPath "backup.log") -Value $logMessage
}

function Backup-Project {
    Write-Log "Starting project backup..."
    
    try {
        # Create backup folder
        New-Item -ItemType Directory -Path $backupFolder -Force | Out-Null
        
        # Copy source code
        Write-Log "Backing up source code..."
        $sourceFolders = @("src", "public", "gas-cylinder-mobile")
        foreach ($folder in $sourceFolders) {
            if (Test-Path (Join-Path $ProjectPath $folder)) {
                Copy-Item -Path (Join-Path $ProjectPath $folder) -Destination (Join-Path $backupFolder $folder) -Recurse -Force
                Write-Log "Backed up $folder"
            }
        }
        
        # Copy configuration files
        Write-Log "Backing up configuration files..."
        $configFiles = @("package.json", "package-lock.json", "vite.config.js", "tailwind.config.js", "postcss.config.js", "supabase.js", "App.tsx", "index.html")
        foreach ($file in $configFiles) {
            if (Test-Path (Join-Path $ProjectPath $file)) {
                Copy-Item -Path (Join-Path $ProjectPath $file) -Destination (Join-Path $backupFolder $file) -Force
                Write-Log "Backed up $file"
            }
        }
        
        # Create database schema backup
        Write-Log "Creating database schema backup..."
        $schemaBackup = @"
-- Gas Cylinder App Database Schema Backup
-- Generated on: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')

-- This file contains the database schema for the gas cylinder management system
-- Tables: customers, cylinders, rentals, locations, etc.

-- Customers Table
CREATE TABLE IF NOT EXISTS customers (
    CustomerListID TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    contact_details TEXT,
    phone TEXT,
    barcode TEXT,
    customer_number TEXT
);

-- Cylinders Table
CREATE TABLE IF NOT EXISTS cylinders (
    id SERIAL PRIMARY KEY,
    serial_number TEXT UNIQUE NOT NULL,
    barcode_number TEXT UNIQUE,
    gas_type TEXT,
    assigned_customer TEXT REFERENCES customers(CustomerListID),
    rental_start_date DATE,
    status TEXT DEFAULT 'available'
);

-- Rentals Table
CREATE TABLE IF NOT EXISTS rentals (
    id SERIAL PRIMARY KEY,
    customer_id TEXT REFERENCES customers(CustomerListID),
    cylinder_id INTEGER REFERENCES cylinders(id),
    rental_start_date DATE NOT NULL,
    rental_end_date DATE,
    rental_type TEXT DEFAULT 'Monthly',
    rental_amount DECIMAL(10,2),
    tax_code TEXT DEFAULT 'GST',
    location TEXT
);

-- Locations Table
CREATE TABLE IF NOT EXISTS locations (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    province TEXT NOT NULL,
    gst_rate DECIMAL(5,2) DEFAULT 5.0,
    pst_rate DECIMAL(5,2) DEFAULT 0.0,
    total_tax_rate DECIMAL(5,2)
);

-- Insert default locations
INSERT INTO locations (id, name, province, gst_rate, pst_rate, total_tax_rate) VALUES
('saskatoon', 'Saskatoon', 'Saskatchewan', 5.0, 6.0, 11.0),
('regina', 'Regina', 'Saskatchewan', 5.0, 6.0, 11.0),
('chilliwack', 'Chilliwack', 'British Columbia', 5.0, 7.0, 12.0),
('prince-george', 'Prince George', 'British Columbia', 5.0, 7.0, 12.0)
ON CONFLICT (id) DO NOTHING;
"@
        
        $schemaBackup | Out-File -FilePath (Join-Path $backupFolder "database_schema.sql") -Encoding UTF8
        Write-Log "Created database schema backup"
        
        # Create recovery instructions
        $recoveryInstructions = @"
# Gas Cylinder App - Recovery Instructions

## System Overview
This backup contains the complete gas cylinder management system with the following features:

### Core Features Implemented:
1. **Dashboard with Accurate Cylinder Counting**
   - Total cylinders count
   - Rented cylinders (based on active rentals)
   - Available cylinders
   - Total customers count

2. **Rentals Management**
   - Customer grouping by rentals
   - Total bottles per customer display
   - Dropdown menus for:
     - Tax codes (GST, PST, None)
     - Locations (SASKATOON, REGINA, CHILLIWACK, PRINCE_GEORGE)
     - Rental types (Monthly, Yearly)
   - Performance optimizations with pagination
   - CSV export functionality

3. **Customers Management**
   - Server-side pagination
   - Debounced search functionality
   - Bulk operations (select, delete)
   - Real-time asset counting
   - Enhanced UI with proper error handling

4. **Location Management**
   - Tax rate configuration per location
   - GST/PST rate management
   - Province-based tax calculations

### Database Structure:
- customers: Customer information and details
- cylinders: Gas cylinder inventory
- rentals: Active and historical rental records
- locations: Location-based tax rate configuration

### Recovery Steps:
1. Restore the source code from the backup
2. Set up Supabase database using the schema file
3. Import any existing data backups
4. Update environment variables and configuration
5. Test all functionality

### Key Files:
- src/pages/Home.jsx: Dashboard with cylinder counting logic
- src/pages/Rentals.jsx: Complete rentals management
- src/pages/Customers.jsx: Optimized customer management
- src/pages/Locations.jsx: Location and tax rate management
- database_schema.sql: Complete database structure

### Performance Features:
- Pagination for large datasets
- Debounced search to reduce API calls
- Efficient asset counting
- Optimized database queries
- Proper error handling and user feedback

Backup created on: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')
"@
        
        $recoveryInstructions | Out-File -FilePath (Join-Path $backupFolder "RECOVERY_INSTRUCTIONS.md") -Encoding UTF8
        Write-Log "Created recovery instructions"
        
        Write-Log "Backup completed successfully at: $backupFolder"
        return $backupFolder
        
    } catch {
        Write-Log "Backup failed: $($_.Exception.Message)" "ERROR"
        throw
    }
}

function Restore-Project {
    param([string]$BackupSource)
    
    Write-Log "Starting project restore from: $BackupSource"
    
    if (!(Test-Path $BackupSource)) {
        Write-Log "Backup source not found: $BackupSource" "ERROR"
        return
    }
    
    try {
        # Restore source code
        Write-Log "Restoring source code..."
        $sourceFolders = @("src", "public", "gas-cylinder-mobile")
        foreach ($folder in $sourceFolders) {
            $sourcePath = Join-Path $BackupSource $folder
            if (Test-Path $sourcePath) {
                Copy-Item -Path $sourcePath -Destination (Join-Path $ProjectPath $folder) -Recurse -Force
                Write-Log "Restored $folder"
            }
        }
        
        # Restore configuration files
        Write-Log "Restoring configuration files..."
        $configFiles = @("package.json", "package-lock.json", "vite.config.js", "tailwind.config.js", "postcss.config.js", "supabase.js", "App.tsx", "index.html")
        foreach ($file in $configFiles) {
            $sourcePath = Join-Path $BackupSource $file
            if (Test-Path $sourcePath) {
                Copy-Item -Path $sourcePath -Destination (Join-Path $ProjectPath $file) -Force
                Write-Log "Restored $file"
            }
        }
        
        Write-Log "Restore completed successfully"
        
    } catch {
        Write-Log "Restore failed: $($_.Exception.Message)" "ERROR"
        throw
    }
}

function Check-Backups {
    Write-Log "Checking available backups..."
    
    $backups = Get-ChildItem -Path $BackupPath -Directory -Filter "backup_*" | Sort-Object CreationTime -Descending
    
    if ($backups.Count -eq 0) {
        Write-Log "No backups found" "WARNING"
        return
    }
    
    Write-Log "Found $($backups.Count) backup(s):"
    foreach ($backup in $backups) {
        $size = (Get-ChildItem -Path $backup.FullName -Recurse | Measure-Object -Property Length -Sum).Sum / 1MB
        Write-Log "  - $($backup.Name) (Created: $($backup.CreationTime), Size: $([math]::Round($size, 2)) MB)"
    }
}

# Main execution
try {
    switch ($Action.ToLower()) {
        "backup" {
            $backupPath = Backup-Project
            Write-Log "Backup completed: $backupPath"
        }
        "restore" {
            $latestBackup = Get-ChildItem -Path $BackupPath -Directory -Filter "backup_*" | Sort-Object CreationTime -Descending | Select-Object -First 1
            if ($latestBackup) {
                Restore-Project -BackupSource $latestBackup.FullName
                Write-Log "Restore completed from: $($latestBackup.FullName)"
            } else {
                Write-Log "No backup found to restore" "ERROR"
            }
        }
        "check" {
            Check-Backups
        }
        default {
            Write-Log "Invalid action. Use: backup, restore, or check" "ERROR"
        }
    }
} catch {
    Write-Log "Script execution failed: $($_.Exception.Message)" "ERROR"
    exit 1
}

Write-Log "Script completed successfully" 