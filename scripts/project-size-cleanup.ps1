# Project size analysis and safe cleanup for gas-cylinder-app
# Run from project root: .\scripts\project-size-cleanup.ps1

param(
    [switch]$AnalyzeOnly,
    [switch]$CleanNodeModules,
    [switch]$CleanDist,
    [switch]$CleanGlobalCaches,
    [switch]$GitGc,
    [switch]$MeasureTotal
)

$ErrorActionPreference = "SilentlyContinue"

function Get-SizeGB { param($path)
    if (-not (Test-Path $path)) { return $null }
    $s = (Get-ChildItem $path -Recurse -Force -File -EA SilentlyContinue | Measure-Object -Property Length -Sum).Sum
    return [math]::Round($s / 1GB, 2)
}

Write-Host "`n=== PROJECT SIZE ANALYSIS ===`n" -ForegroundColor Cyan

# In-project
$inProject = @{
    "node_modules (root)"           = Get-SizeGB "node_modules"
    "gas-cylinder-android/node_modules" = Get-SizeGB "gas-cylinder-android\node_modules"
    "gas-cylinder-mobile/node_modules"  = Get-SizeGB "gas-cylinder-mobile\node_modules"
    "netlify/node_modules"          = Get-SizeGB "netlify\node_modules"
    "backup-system/node_modules"    = Get-SizeGB "backup-system\node_modules"
    ".git"                          = Get-SizeGB ".git"
    "dist"                          = Get-SizeGB "dist"
    "gas-cylinder-android/android/app/build" = Get-SizeGB "gas-cylinder-android\android\app\build"
    "gas-cylinder-android/android/.gradle"   = Get-SizeGB "gas-cylinder-android\android\.gradle"
    ".expo"                         = Get-SizeGB ".expo"
}

foreach ($k in $inProject.Keys | Sort-Object) {
    $v = $inProject[$k]
    if ($null -ne $v -and $v -ge 0) { Write-Host ("  {0,-42} {1,6} GB" -f $k, $v) }
}

# Global caches (outside project, often 10–20GB combined)
Write-Host "`n--- Global caches (outside project, used by this app) ---" -ForegroundColor Yellow
$global = @{
    "$env:USERPROFILE\.gradle (Gradle)" = Get-SizeGB "$env:USERPROFILE\.gradle"
    "$env:LOCALAPPDATA\npm-cache (npm)" = Get-SizeGB "$env:LOCALAPPDATA\npm-cache"
}
foreach ($k in $global.Keys) {
    $v = $global[$k]
    if ($null -ne $v -and $v -ge 0) { Write-Host ("  {0,-42} {1,6} GB" -f $k, $v) }
}

# Total project (optional; can be slow on very large trees)
if ($MeasureTotal) {
    Write-Host "`n--- Measuring total project size (can take several minutes) ---" -ForegroundColor Yellow
    $total = (Get-ChildItem -Path (Get-Location).Path -Recurse -Force -File -EA SilentlyContinue | Measure-Object -Property Length -Sum).Sum
    Write-Host ("  Total project folder: {0} GB`n" -f [math]::Round($total / 1GB, 2)) -ForegroundColor White
} else {
    Write-Host "`n  (Use -MeasureTotal to compute full project size; can be slow.)`n" -ForegroundColor DarkGray
}

# --- Cleanup actions ---
if ($AnalyzeOnly) { Write-Host "AnalyzeOnly: no changes made.`n"; exit 0 }

if ($CleanNodeModules) {
    $dirs = @("node_modules", "gas-cylinder-android\node_modules", "gas-cylinder-mobile\node_modules", "netlify\node_modules", "backup-system\node_modules")
    foreach ($d in $dirs) {
        if (Test-Path $d) { Remove-Item $d -Recurse -Force -EA SilentlyContinue; Write-Host "Removed $d" -ForegroundColor Green }
    }
    Write-Host "Run: npm install (root), and in gas-cylinder-android, gas-cylinder-mobile, netlify, backup-system as needed.`n" -ForegroundColor Yellow
}

if ($CleanDist) {
    if (Test-Path "dist") { Remove-Item "dist" -Recurse -Force; Write-Host "Removed dist/`n" -ForegroundColor Green }
}

if ($GitGc) {
    if (Test-Path ".git") { git gc --aggressive --prune=now; Write-Host "Ran: git gc --aggressive --prune=now`n" -ForegroundColor Green }
}

if ($CleanGlobalCaches) {
    Write-Host "Global caches (run only if you are willing to re-download on next build):" -ForegroundColor Yellow
    Write-Host "  Gradle:  Remove-Item -Recurse -Force `"$env:USERPROFILE\.gradle\caches`"" -ForegroundColor Gray
    Write-Host "  npm:     npm cache clean --force" -ForegroundColor Gray
    Write-Host "These are outside the project folder.`n" -ForegroundColor Gray
}

if (-not ($CleanNodeModules -or $CleanDist -or $GitGc -or $CleanGlobalCaches)) {
    Write-Host "Cleanup usage:" -ForegroundColor Cyan
    Write-Host "  .\scripts\project-size-cleanup.ps1 -AnalyzeOnly           # only report sizes"
    Write-Host "  .\scripts\project-size-cleanup.ps1 -CleanNodeModules      # remove all node_modules (run npm install after)"
    Write-Host "  .\scripts\project-size-cleanup.ps1 -CleanDist             # remove dist/"
    Write-Host "  .\scripts\project-size-cleanup.ps1 -GitGc                 # run git gc"
    Write-Host "  .\scripts\project-size-cleanup.ps1 -CleanGlobalCaches     # show commands for Gradle/npm cache"
    Write-Host "  Combine: -CleanNodeModules -CleanDist -GitGc`n"
}
