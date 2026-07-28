# Scanified Android Logo Updater
# Drag and drop your logo PNG file onto this script

param(
    [Parameter(Mandatory=$false)]
    [string]$LogoPath
)

Write-Host "=====================================" -ForegroundColor Cyan
Write-Host "  Scanified Android Logo Updater" -ForegroundColor Cyan
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host ""

# If no file provided via drag-drop, ask for it
if (-not $LogoPath -or -not (Test-Path $LogoPath)) {
    Add-Type -AssemblyName System.Windows.Forms
    $FileBrowser = New-Object System.Windows.Forms.OpenFileDialog
    $FileBrowser.Filter = "PNG Images (*.png)|*.png|All Files (*.*)|*.*"
    $FileBrowser.Title = "Select your Scanified logo PNG file"
    
    if ($FileBrowser.ShowDialog() -eq 'OK') {
        $LogoPath = $FileBrowser.FileName
    } else {
        Write-Host "No file selected. Exiting..." -ForegroundColor Red
        Read-Host "Press Enter to exit"
        exit
    }
}

Write-Host "Selected logo: $LogoPath" -ForegroundColor Green
Write-Host ""

# Define target paths
$androidAssetsPath = "gas-cylinder-android\assets"
$targetFiles = @(
    "app-icon.png",
    "adaptive-icon.png", 
    "splash-icon.png"
)

# Check if we're in the right directory
if (-not (Test-Path $androidAssetsPath)) {
    Write-Host "Error: Could not find $androidAssetsPath" -ForegroundColor Red
    Write-Host "Make sure you run this script from the gas-cylinder-app directory" -ForegroundColor Yellow
    Read-Host "Press Enter to exit"
    exit
}

# Copy the logo to all three icon files
Write-Host "Copying logo to Android assets..." -ForegroundColor Yellow
Write-Host ""

foreach ($targetFile in $targetFiles) {
    $targetPath = Join-Path $androidAssetsPath $targetFile
    try {
        Copy-Item -Path $LogoPath -Destination $targetPath -Force
        Write-Host "✓ Created: $targetFile" -ForegroundColor Green
    } catch {
        Write-Host "✗ Failed: $targetFile - $($_.Exception.Message)" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host "  Done! Next steps:" -ForegroundColor Cyan
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host "1. In your Expo terminal, press 'r' to reload" -ForegroundColor White
Write-Host "2. Your new logo will appear!" -ForegroundColor White
Write-Host ""
Write-Host "Press Enter to exit..."
Read-Host

