# Gas Cylinder App Backup Script
# This script creates a timestamped backup of the entire project

param(
    [string]$BackupPath = ".\backups"
)

# Create backup directory if it doesn't exist
if (!(Test-Path $BackupPath)) {
    New-Item -ItemType Directory -Path $BackupPath -Force
}

# Generate timestamp for backup name
$timestamp = Get-Date -Format "yyyy-MM-dd_HH-mm-ss"
$backupName = "gas-cylinder-app-backup-$timestamp"
$backupFullPath = Join-Path $BackupPath $backupName

Write-Host "Creating backup: $backupName" -ForegroundColor Green

# Create backup directory
New-Item -ItemType Directory -Path $backupFullPath -Force

# Copy all files except node_modules and other unnecessary directories
$excludeDirs = @(
    "node_modules",
    ".git",
    "dist",
    "build",
    ".expo",
    "android\app\build",
    "android\.gradle",
    "ios\build",
    "ios\Pods",
    "backups"
)

# Build exclude pattern
$excludePattern = $excludeDirs | ForEach-Object { "*/$_/*" }

# Copy files with exclusions
Get-ChildItem -Path "." -Recurse -Force | Where-Object {
    $isExcluded = $false
    foreach ($pattern in $excludePattern) {
        if ($_.FullName -like $pattern) {
            $isExcluded = $true
            break
        }
    }
    return !$isExcluded
} | ForEach-Object {
    $relativePath = $_.FullName.Substring((Get-Location).Path.Length + 1)
    $targetPath = Join-Path $backupFullPath $relativePath
    
    if ($_.PSIsContainer) {
        # Create directory
        New-Item -ItemType Directory -Path $targetPath -Force | Out-Null
    } else {
        # Create parent directory if it doesn't exist
        $parentDir = Split-Path $targetPath -Parent
        if (!(Test-Path $parentDir)) {
            New-Item -ItemType Directory -Path $parentDir -Force | Out-Null
        }
        # Copy file
        Copy-Item $_.FullName -Destination $targetPath -Force
    }
}

Write-Host "Backup completed successfully!" -ForegroundColor Green
Write-Host "Backup location: $backupFullPath" -ForegroundColor Yellow

# Create a summary file
$summaryPath = Join-Path $backupFullPath "backup-summary.txt"
$summary = @"
Gas Cylinder App Backup Summary
===============================
Backup Date: $(Get-Date -Format "yyyy-MM-dd HH:mm:ss")
Backup Name: $backupName
Source Path: $(Get-Location)

Project Structure:
- Web Application (src/)
- Mobile Application (gas-cylinder-mobile/)
- Database Scripts
- Configuration Files

Total Files: $((Get-ChildItem -Path $backupFullPath -Recurse -File).Count)
Total Size: $([math]::Round((Get-ChildItem -Path $backupFullPath -Recurse -File | Measure-Object -Property Length -Sum).Sum / 1MB, 2)) MB

Excluded Directories:
$($excludeDirs -join "`n")

This backup contains all source code, configuration files, and documentation
for the Gas Cylinder Management Application.
"@

$summary | Out-File -FilePath $summaryPath -Encoding UTF8

Write-Host "Backup summary created: backup-summary.txt" -ForegroundColor Cyan 