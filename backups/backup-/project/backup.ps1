# Daily Backup Script for Gas Cylinder App
# Run this script daily to create backups

param(
    [string]$BackupPath = ".\backups"
)

# Create backup directory if it doesn't exist
if (!(Test-Path $BackupPath)) {
    New-Item -ItemType Directory -Path $BackupPath -Force
}

# Get current date for folder name
$DateStamp = Get-Date -Format "yyyy-MM-dd"
$BackupFolder = Join-Path $BackupPath "gas-cylinder-app-$DateStamp"

# Create today's backup folder
if (Test-Path $BackupFolder) {
    Write-Host "Backup folder for today already exists. Removing old backup..."
    Remove-Item $BackupFolder -Recurse -Force
}

New-Item -ItemType Directory -Path $BackupFolder -Force

# Files and folders to backup (exclude node_modules, .git, etc.)
$SourcePath = "."
$ExcludeItems = @(
    "node_modules",
    ".git",
    "backups",
    "dist",
    "build",
    ".vscode",
    ".idea",
    "*.log",
    "*.tmp",
    ".env.local",
    ".env.production"
)

# Build exclude parameters for robocopy
$ExcludeParams = @()
foreach ($item in $ExcludeItems) {
    if (Test-Path (Join-Path $SourcePath $item) -PathType Container) {
        $ExcludeParams += "/XD"
    } else {
        $ExcludeParams += "/XF"
    }
    $ExcludeParams += $item
}

# Use robocopy for efficient copying
Write-Host "Creating backup for $DateStamp..."
robocopy $SourcePath $BackupFolder /E /R:3 /W:1 $ExcludeParams /TEE /LOG+:"$BackupFolder\backup.log"

# Check if backup was successful
if ($LASTEXITCODE -le 7) {
    Write-Host "Backup completed successfully: $BackupFolder" -ForegroundColor Green
    
    # Create a summary file
    $SummaryContent = @"
Gas Cylinder App - Daily Backup Summary
========================================
Date: $DateStamp
Time: $(Get-Date -Format "HH:mm:ss")
Backup Location: $BackupFolder
Status: SUCCESS

Files backed up:
- Source code (src/)
- Configuration files
- Package files
- Documentation

Excluded:
- node_modules/
- .git/
- backups/
- dist/
- build/
- Log files
- Environment files

Backup completed at: $(Get-Date)
"@
    
    $SummaryContent | Out-File -FilePath "$BackupFolder\backup-summary.txt" -Encoding UTF8
    
    # Keep only last 30 days of backups
    Write-Host "Cleaning up old backups (keeping last 30 days)..."
    $OldBackups = Get-ChildItem $BackupPath -Directory | Where-Object { $_.Name -like "gas-cylinder-app-*" } | Sort-Object CreationTime -Descending | Select-Object -Skip 30
    
    foreach ($oldBackup in $OldBackups) {
        Write-Host "Removing old backup: $($oldBackup.Name)"
        Remove-Item $oldBackup.FullName -Recurse -Force
    }
    
} else {
    Write-Host "Backup failed with exit code: $LASTEXITCODE" -ForegroundColor Red
    exit 1
}

Write-Host "Daily backup process completed!" -ForegroundColor Green 