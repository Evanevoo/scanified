# Script to remove Vision Camera from all files
# Run this from the project root: .\remove-vision-camera.ps1

Write-Host "Removing Vision Camera from all files..." -ForegroundColor Green

# Function to remove Vision Camera code from a TypeScript screen file
function Remove-VisionCameraFromScreen {
    param([string]$FilePath)
    
    if (-not (Test-Path $FilePath)) {
        Write-Host "File not found: $FilePath" -ForegroundColor Yellow
        return
    }
    
    Write-Host "Processing: $FilePath" -ForegroundColor Cyan
    
    $content = Get-Content $FilePath -Raw
    
    # Remove Constants import (if only used for Vision Camera check)
    $content = $content -replace "import Constants from 'expo-constants';`r?`n", ""
    
    # Remove Vision Camera availability check block
    $pattern1 = "(?s)// Check if Vision Camera is available.*?const \{ width, height \} = Dimensions\.get\('window'\);"
    $content = $content -replace $pattern1, "const { width, height } = Dimensions.get('window');"
    
    # Remove useVisionCamera state variable
    $content = $content -replace "  const \[useVisionCamera, setUseVisionCamera\] = useState\(false\);.*?`r?`n", ""
    
    # Remove Vision Camera conditional rendering patterns
    # Pattern: {useVisionCamera && visionCameraAvailable && VisionCameraScanner ? (...) : (...)}
    $pattern2 = "(?s)\{\s*useVisionCamera\s*&&\s*visionCameraAvailable\s*&&\s*VisionCameraScanner\s*\?\s*\([^)]*VisionCameraScanner[^)]*\)\s*:\s*\(\s*<>"
    $content = $content -replace $pattern2, ""
    
    $pattern3 = "(?s)\{\s*useVisionCamera\s*&&\s*visionCameraAvailable\s*&&\s*VisionCameraScanner\s*\?\s*\([^)]*VisionCameraScanner[^)]*\)\s*:\s*\("
    $content = $content -replace $pattern3, ""
    
    # Remove closing tags
    $content = $content -replace "(?s)\s*</>\s*\)\s*\}", "}"
    $content = $content -replace "(?s)\s*\)\s*\}", "}"
    
    # Remove Vision Camera toggle buttons
    $content = $content -replace "(?s)\s*\{visionCameraAvailable\s*&&\s*VisionCameraScanner\s*&&[^}]*scannerToggleButton[^}]*\}", ""
    $content = $content -replace "(?s)\s*\{visionCameraAvailable\s*&&\s*VisionCameraScanner\s*&&\s*!useVisionCamera[^}]*\}", ""
    
    # Remove setUseVisionCamera calls
    $content = $content -replace "setUseVisionCamera\([^)]*\);", ""
    
    Set-Content $FilePath -Value $content -NoNewline
    Write-Host "  Updated" -ForegroundColor Green
}

# List of all screen files to process
$screenFiles = @(
    "gas-cylinder-mobile/screens/ScanCylindersScreen.tsx",
    "gas-cylinder-mobile/screens/EnhancedScanScreen.tsx",
    "gas-cylinder-mobile/screens/FillCylinderScreen.tsx",
    "gas-cylinder-mobile/screens/LocateCylinderScreen.tsx",
    "gas-cylinder-mobile/screens/TrackAboutStyleScanScreen.tsx",
    "gas-cylinder-android/screens/ScanCylindersScreen.tsx",
    "gas-cylinder-android/screens/EnhancedScanScreen.tsx",
    "gas-cylinder-android/screens/FillCylinderScreen.tsx",
    "gas-cylinder-android/screens/LocateCylinderScreen.tsx",
    "gas-cylinder-android/screens/TrackAboutStyleScanScreen.tsx"
)

# Process all screen files
Write-Host "`nProcessing screen files..." -ForegroundColor Green
foreach ($file in $screenFiles) {
    Remove-VisionCameraFromScreen $file
}

# Update package.json files
Write-Host "`nUpdating package.json files..." -ForegroundColor Green

$mobilePackageJson = "gas-cylinder-mobile/package.json"
$androidPackageJson = "gas-cylinder-android/package.json"

foreach ($file in @($mobilePackageJson, $androidPackageJson)) {
    if (Test-Path $file) {
        $content = Get-Content $file -Raw
        $content = $content -replace ',\s*"react-native-vision-camera": "\^4\.7\.3"', ''
        $content = $content -replace ',\s*"react-native-worklets": "\^0\.5\.1"', ''
        Set-Content $file -Value $content -NoNewline
        Write-Host "  Updated $file" -ForegroundColor Green
    }
}

# Update app.json files
Write-Host "`nUpdating app.json files..." -ForegroundColor Green

$mobileAppJson = "gas-cylinder-mobile/app.json"
$androidAppJson = "gas-cylinder-android/app.json"

foreach ($file in @($mobileAppJson, $androidAppJson)) {
    if (Test-Path $file) {
        $content = Get-Content $file -Raw
        $pattern = '(?s),\s*\[\s*"react-native-vision-camera",\s*\{[^}]*"cameraPermissionText"[^}]*"enableMicrophonePermission"[^}]*\}\s*\]'
        $content = $content -replace $pattern, ''
        Set-Content $file -Value $content -NoNewline
        Write-Host "  Updated $file" -ForegroundColor Green
    }
}

Write-Host "`nVision Camera removal completed!" -ForegroundColor Green
Write-Host "`nNext steps:" -ForegroundColor Yellow
Write-Host "1. Review the screen files to ensure Vision Camera conditionals are fully removed" -ForegroundColor Yellow
Write-Host "2. Run: npm install (in both gas-cylinder-mobile and gas-cylinder-android)" -ForegroundColor Yellow
Write-Host "3. Delete VisionCameraScanner.tsx component files (optional)" -ForegroundColor Yellow
