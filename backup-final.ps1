# Simple Backup Script for Gas Cylinder App
Write-Host "🚀 Gas Cylinder App - Backup and Deploy" -ForegroundColor Green
Write-Host "================================================" -ForegroundColor Green

# Create backup directory
$timestamp = Get-Date -Format 'yyyy-MM-dd_HH-mm-ss'
$backupDir = "backups\$timestamp"
Write-Host "📁 Creating backup directory: $backupDir" -ForegroundColor Yellow
New-Item -ItemType Directory -Path $backupDir -Force | Out-Null

# Backup essential files
Write-Host "📋 Backing up files..." -ForegroundColor Yellow

# Create directories first
New-Item -ItemType Directory -Path "$backupDir\src" -Force | Out-Null
New-Item -ItemType Directory -Path "$backupDir\netlify" -Force | Out-Null

# Copy files
if (Test-Path "src") {
    Copy-Item "src\*" "$backupDir\src\" -Recurse -Force
    Write-Host "  ✅ Backed up: src/" -ForegroundColor Green
}

if (Test-Path "netlify") {
    Copy-Item "netlify\*" "$backupDir\netlify\" -Recurse -Force
    Write-Host "  ✅ Backed up: netlify/" -ForegroundColor Green
}

# Copy individual files
$files = @("package.json", "package-lock.json", "vite.config.js", "tailwind.config.js", "postcss.config.cjs", "tsconfig.json", "tsconfig.node.json", "netlify.toml", "env.template")
foreach ($file in $files) {
    if (Test-Path $file) {
        Copy-Item $file "$backupDir\" -Force
        Write-Host "  ✅ Backed up: $file" -ForegroundColor Green
    }
}

# Copy markdown files
Get-ChildItem "*.md" | ForEach-Object {
    Copy-Item $_.FullName "$backupDir\" -Force
    Write-Host "  ✅ Backed up: $($_.Name)" -ForegroundColor Green
}

# Install dependencies
Write-Host "📦 Installing dependencies..." -ForegroundColor Yellow
npm install

# Build project
Write-Host "🔨 Building project..." -ForegroundColor Yellow
npm run build

if ($LASTEXITCODE -eq 0) {
    Write-Host "  ✅ Build successful!" -ForegroundColor Green
} else {
    Write-Host "  ❌ Build failed!" -ForegroundColor Red
    exit 1
}

# Create deployment info
Write-Host "📋 Creating deployment info..." -ForegroundColor Yellow

$deployInfo = "Gas Cylinder App - Deployment Info`n"
$deployInfo += "Backup Date: $(Get-Date)`n"
$deployInfo += "Backup Location: $backupDir`n"
$deployInfo += "Build Status: Success`n`n"
$deployInfo += "Environment Variables Needed in Netlify:`n"
$deployInfo += "VITE_SUPABASE_URL=your_supabase_url`n"
$deployInfo += "VITE_SUPABASE_ANON_KEY=your_supabase_anon_key`n"
$deployInfo += "VITE_STRIPE_PUBLISHABLE_KEY=your_stripe_publishable_key`n"
$deployInfo += "STRIPE_SECRET_KEY=your_stripe_secret_key`n"
$deployInfo += "STRIPE_WEBHOOK_SECRET=your_stripe_webhook_secret`n"
$deployInfo += "SMTP_HOST=mail.smtp2go.com`n"
$deployInfo += "SMTP_PORT=2525`n"
$deployInfo += "SMTP_USER=your_smtp2go_username`n"
$deployInfo += "SMTP_PASS=your_smtp2go_password`n"
$deployInfo += "CONTACT_EMAIL=your_contact_email@domain.com`n"
$deployInfo += "CONTACT_NAME=Your Business Name`n"
$deployInfo += "CONTACT_PHONE=+1 (555) 123-4567`n`n"
$deployInfo += "Next Steps:`n"
$deployInfo += "1. Go to Netlify Dashboard`n"
$deployInfo += "2. Create new site from Git or drag dist/ folder`n"
$deployInfo += "3. Set environment variables above`n"
$deployInfo += "4. Deploy and test`n"

$deployInfo | Out-File -FilePath "$backupDir\DEPLOYMENT_INFO.md" -Encoding UTF8
Write-Host "  ✅ Created: DEPLOYMENT_INFO.md" -ForegroundColor Green

# Final summary
Write-Host "`n🎉 Backup Complete!" -ForegroundColor Green
Write-Host "================================================" -ForegroundColor Green
Write-Host "📁 Backup Location: $backupDir" -ForegroundColor Cyan
Write-Host "🔧 Build: dist/ folder ready for deployment" -ForegroundColor Cyan
Write-Host "📋 Info: $backupDir\DEPLOYMENT_INFO.md" -ForegroundColor Cyan

Write-Host "`n🚀 Ready for Netlify Deployment!" -ForegroundColor Yellow
Write-Host "1. Go to https://app.netlify.com/" -ForegroundColor White
Write-Host "2. Create new site from Git or drag dist/ folder" -ForegroundColor White
Write-Host "3. Set environment variables" -ForegroundColor White
Write-Host "4. Deploy!" -ForegroundColor White 