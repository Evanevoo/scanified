# Comprehensive Website Backup Script
# Creates a complete backup of the Gas Cylinder App including code, database, and configuration

Write-Host "Gas Cylinder App - Complete Website Backup" -ForegroundColor Green
Write-Host "================================================" -ForegroundColor Green

# Create backup directory with timestamp
$timestamp = Get-Date -Format 'yyyy-MM-dd_HH-mm-ss'
$backupDir = "backups\complete-backup-$timestamp"
Write-Host "Creating backup directory: $backupDir" -ForegroundColor Yellow
New-Item -ItemType Directory -Path $backupDir -Force | Out-Null

# Create subdirectories
$subdirs = @("code", "database", "mobile-apps", "config", "docs", "scripts")
foreach ($dir in $subdirs) {
    New-Item -ItemType Directory -Path "$backupDir\$dir" -Force | Out-Null
}

# Step 1: Backup source code
Write-Host "`nStep 1: Backing up source code..." -ForegroundColor Yellow

$codeDirs = @("src", "netlify", "supabase")
foreach ($dir in $codeDirs) {
    if (Test-Path $dir) {
        Copy-Item -Path $dir -Destination "$backupDir\code\" -Recurse -Force
        Write-Host "  [OK] Backed up: $dir/" -ForegroundColor Green
    }
}

# Backup root config files
$configFiles = @(
    "package.json",
    "package-lock.json",
    "vite.config.js",
    "tailwind.config.js",
    "postcss.config.cjs",
    "tsconfig.json",
    "tsconfig.node.json",
    "netlify.toml",
    ".eslintrc.json",
    ".gitignore",
    "env.template",
    "app.json",
    "eas.json"
)

foreach ($file in $configFiles) {
    if (Test-Path $file) {
        Copy-Item -Path $file -Destination "$backupDir\code\" -Force
        Write-Host "  [OK] Backed up: $file" -ForegroundColor Green
    }
}

# Step 2: Backup mobile apps
Write-Host "`nStep 2: Backing up mobile apps..." -ForegroundColor Yellow

$mobileDirs = @("gas-cylinder-android", "gas-cylinder-mobile")
foreach ($dir in $mobileDirs) {
    if (Test-Path $dir) {
        $sourcePath = (Resolve-Path $dir).Path
        $destPath = "$backupDir\mobile-apps\$dir"
        
        # Create destination directory
        New-Item -ItemType Directory -Path $destPath -Force | Out-Null
        
        # Copy files excluding certain directories using robocopy
        robocopy $sourcePath $destPath /E /XD node_modules dist build .expo .expo-shared /NFL /NDL /NJH /NJS /NC /NS /NP /R:3 /W:5 | Out-Null
        
        Write-Host "  [OK] Backed up: $dir/" -ForegroundColor Green
    }
}

# Step 3: Backup documentation
Write-Host "`nStep 3: Backing up documentation..." -ForegroundColor Yellow

Get-ChildItem -Path "." -Filter "*.md" -File | ForEach-Object {
    Copy-Item -Path $_.FullName -Destination "$backupDir\docs\" -Force
    Write-Host "  [OK] Backed up: $($_.Name)" -ForegroundColor Green
}

# Step 4: Backup scripts and utilities
Write-Host "`nStep 4: Backing up scripts and utilities..." -ForegroundColor Yellow

$scriptFiles = @("*.ps1", "*.js", "*.sql", "*.html")
foreach ($pattern in $scriptFiles) {
    Get-ChildItem -Path "." -Filter $pattern -File | Where-Object {
        $_.DirectoryName -eq (Get-Location).Path -or 
        $_.DirectoryName -like "*\scripts\*" -or
        $_.DirectoryName -like "*\backup-system\*"
    } | ForEach-Object {
        Copy-Item -Path $_.FullName -Destination "$backupDir\scripts\" -Force
        Write-Host "  [OK] Backed up: $($_.Name)" -ForegroundColor Green
    }
}

# Step 5: Backup database (create SQL export script)
Write-Host "`nStep 5: Creating database backup instructions..." -ForegroundColor Yellow

$dbBackupInstructions = @"
# Database Backup Instructions

## Option 1: Use Supabase Dashboard
1. Go to Supabase Dashboard > Database > Backups
2. Create a new backup
3. Download the backup file

## Option 2: Use Supabase CLI
` + "```" + `bash
supabase db dump -f database-backup.sql
` + "```" + `

## Option 3: Use Tenant Backup Function
Call the Netlify function: /.netlify/functions/daily-tenant-backup
This will backup all tenant data to Supabase Storage.

## Option 4: Manual SQL Export
Run the following queries in Supabase SQL Editor to export data:

### Export all tables
` + "```" + `sql
-- Export customers
COPY (SELECT * FROM customers WHERE organization_id = 'YOUR_ORG_ID') TO STDOUT WITH CSV HEADER;

-- Export bottles
COPY (SELECT * FROM bottles WHERE organization_id = 'YOUR_ORG_ID') TO STDOUT WITH CSV HEADER;

-- Export rentals
COPY (SELECT * FROM rentals WHERE organization_id = 'YOUR_ORG_ID') TO STDOUT WITH CSV HEADER;

-- Continue for other tables...
` + "```" + `

## Backup Date
Backup created: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')
"@

$dbBackupInstructions | Out-File -FilePath "$backupDir\database\DATABASE_BACKUP_INSTRUCTIONS.md" -Encoding UTF8
Write-Host "  [OK] Created: DATABASE_BACKUP_INSTRUCTIONS.md" -ForegroundColor Green

# Step 6: Create backup manifest
Write-Host "`nStep 6: Creating backup manifest..." -ForegroundColor Yellow

$manifest = @{
    backup_date = Get-Date -Format 'yyyy-MM-dd HH:mm:ss'
    backup_location = $backupDir
    backup_type = "complete_website_backup"
    items = @{
        source_code = $codeDirs
        mobile_apps = $mobileDirs
        config_files = $configFiles
        documentation = (Get-ChildItem -Path "." -Filter "*.md" -File).Name
        scripts = @(
            (Get-ChildItem -Path "." -Filter "*.ps1" -File).Name
            (Get-ChildItem -Path "." -Filter "*.js" -File).Name
            (Get-ChildItem -Path "." -Filter "*.sql" -File).Name
            (Get-ChildItem -Path "." -Filter "*.html" -File).Name
        )
    }
    total_size = (Get-ChildItem -Path $backupDir -Recurse | Measure-Object -Property Length -Sum).Sum
}

$manifest | ConvertTo-Json -Depth 10 | Out-File -FilePath "$backupDir\BACKUP_MANIFEST.json" -Encoding UTF8
Write-Host "  [OK] Created: BACKUP_MANIFEST.json" -ForegroundColor Green

# Step 7: Create restore instructions
Write-Host "`nStep 7: Creating restore instructions..." -ForegroundColor Yellow

$restoreInstructions = @"
# Website Restore Instructions

## Backup Information
- Backup Date: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')
- Backup Location: $backupDir
- Backup Type: Complete Website Backup

## Restore Steps

### 1. Restore Source Code
` + "```" + `powershell
# Copy source code back
Copy-Item -Path "$backupDir\code\*" -Destination "." -Recurse -Force
` + "```" + `

### 2. Restore Mobile Apps
` + "```" + `powershell
# Copy mobile apps back
Copy-Item -Path "$backupDir\mobile-apps\*" -Destination "." -Recurse -Force
` + "```" + `

### 3. Restore Configuration
` + "```" + `powershell
# Copy config files back
Copy-Item -Path "$backupDir\code\*.json" -Destination "." -Force
Copy-Item -Path "$backupDir\code\*.js" -Destination "." -Force
Copy-Item -Path "$backupDir\code\*.toml" -Destination "." -Force
` + "```" + `

### 4. Restore Database
See: database/DATABASE_BACKUP_INSTRUCTIONS.md

### 5. Install Dependencies
` + "```" + `bash
npm install
cd gas-cylinder-android && npm install
cd ../gas-cylinder-mobile && npm install
` + "```" + `

### 6. Rebuild Project
` + "```" + `bash
npm run build
` + "```" + `

## Environment Variables
Make sure to set all required environment variables:
- VITE_SUPABASE_URL
- VITE_SUPABASE_ANON_KEY
- STRIPE_SECRET_KEY
- SMTP credentials
- etc.

See env.template for complete list.
"@

$restoreInstructions | Out-File -FilePath "$backupDir\RESTORE_INSTRUCTIONS.md" -Encoding UTF8
Write-Host "  [OK] Created: RESTORE_INSTRUCTIONS.md" -ForegroundColor Green

# Step 8: Create git status backup
Write-Host "`nStep 8: Backing up git information..." -ForegroundColor Yellow

if (Test-Path ".git") {
    $gitInfo = @{
        current_branch = git branch --show-current 2>$null
        last_commit = git log -1 --oneline 2>$null
        git_status = git status --short 2>$null
        git_log = git log --oneline -20 2>$null
    }
    
    $gitInfo | ConvertTo-Json | Out-File -FilePath "$backupDir\GIT_INFO.json" -Encoding UTF8
    
    # Export git log
    git log --oneline > "$backupDir\GIT_LOG.txt" 2>$null
    git status > "$backupDir\GIT_STATUS.txt" 2>$null
    
    Write-Host "  [OK] Backed up git information" -ForegroundColor Green
} else {
    Write-Host "  [WARN] No git repository found" -ForegroundColor Yellow
}

# Step 9: Calculate backup size
Write-Host "`nStep 9: Calculating backup size..." -ForegroundColor Yellow

$totalSize = (Get-ChildItem -Path $backupDir -Recurse -File | Measure-Object -Property Length -Sum).Sum
$sizeMB = [math]::Round($totalSize / 1MB, 2)
$sizeGB = [math]::Round($totalSize / 1GB, 2)

Write-Host "  Total backup size: $sizeMB MB ($sizeGB GB)" -ForegroundColor Cyan

# Step 10: Create summary
Write-Host "`nStep 10: Creating backup summary..." -ForegroundColor Yellow

$summary = @"
# Complete Website Backup Summary

## Backup Information
- **Backup Date**: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')
- **Backup Location**: $backupDir
- **Backup Type**: Complete Website Backup
- **Total Size**: $sizeMB MB ($sizeGB GB)

## What Was Backed Up

### Source Code
- src/ directory
- netlify/ functions
- supabase/ migrations
- Configuration files (package.json, vite.config.js, etc.)

### Mobile Apps
- gas-cylinder-android/
- gas-cylinder-mobile/

### Documentation
- All .md files

### Scripts & Utilities
- PowerShell scripts (.ps1)
- Node.js scripts (.js)
- SQL scripts (.sql)
- HTML utilities (.html)

### Database
- Backup instructions created
- See: database/DATABASE_BACKUP_INSTRUCTIONS.md

## Next Steps

1. **Database Backup**: Follow instructions in database/DATABASE_BACKUP_INSTRUCTIONS.md
2. **Verify Backup**: Check that all files were copied successfully
3. **Store Safely**: Move backup to secure location (cloud storage, external drive, etc.)
4. **Test Restore**: Periodically test restore process to ensure backup is valid

## Restore Instructions
See: RESTORE_INSTRUCTIONS.md

## Backup Manifest
See: BACKUP_MANIFEST.json for detailed file listing
"@

$summary | Out-File -FilePath "$backupDir\BACKUP_SUMMARY.md" -Encoding UTF8
Write-Host "  [OK] Created: BACKUP_SUMMARY.md" -ForegroundColor Green

# Final summary
Write-Host "`nComplete Website Backup Finished!" -ForegroundColor Green
Write-Host "================================================" -ForegroundColor Green
Write-Host "Backup Location: $backupDir" -ForegroundColor Cyan
Write-Host "Total Size: $sizeMB MB ($sizeGB GB)" -ForegroundColor Cyan
Write-Host "Summary: $backupDir\BACKUP_SUMMARY.md" -ForegroundColor Cyan
Write-Host "Restore Guide: $backupDir\RESTORE_INSTRUCTIONS.md" -ForegroundColor Cyan
Write-Host "Database Instructions: $backupDir\database\DATABASE_BACKUP_INSTRUCTIONS.md" -ForegroundColor Cyan

Write-Host "`nIMPORTANT: Database backup must be done separately!" -ForegroundColor Yellow
Write-Host "   See: $backupDir\database\DATABASE_BACKUP_INSTRUCTIONS.md" -ForegroundColor White

Write-Host "`nBackup complete! Store this backup in a safe location." -ForegroundColor Green
