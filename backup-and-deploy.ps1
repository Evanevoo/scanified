# Gas Cylinder App - Backup and Deploy Script
# This script creates a backup and prepares the project for Netlify deployment

Write-Host "🚀 Gas Cylinder App - Backup and Deploy" -ForegroundColor Green
Write-Host "================================================" -ForegroundColor Green

# Step 1: Create backup directory
$backupDir = "backups/$(Get-Date -Format 'yyyy-MM-dd_HH-mm-ss')"
Write-Host "📁 Creating backup directory: $backupDir" -ForegroundColor Yellow
New-Item -ItemType Directory -Path $backupDir -Force | Out-Null

# Step 2: Copy essential files to backup
Write-Host "📋 Backing up essential files..." -ForegroundColor Yellow

$filesToBackup = @(
    "src/",
    "netlify/",
    "package.json",
    "package-lock.json",
    "vite.config.js",
    "tailwind.config.js",
    "postcss.config.cjs",
    "tsconfig.json",
    "tsconfig.node.json",
    "vercel.json",
    "README.md",
    "DEPLOYMENT.md",
    "SETUP_GUIDE.md",
    "SMTP2GO_SETUP.md",
    "SMTP_SETUP_GUIDE.md",
    "FEATURES_IMPLEMENTED.md",
    "BILLING_SETUP.md",
    "EMAIL_SETUP.md",
    "INVITE_SYSTEM_SETUP.md",
    "MULTI_TENANCY_SETUP.md",
    "ORGANIZATION_FEATURES_SUMMARY.md",
    "ORGANIZATION_TOOLS_SUMMARY.md",
    "OWNER_PORTAL_GUIDE.md",
    "SUPPORT_TICKET_SYSTEM.md",
    "SUPPORT_TICKET_CHAT_HISTORY.md",
    "TICKET_REOPEN_FEATURE.md",
    "DAILY_UPDATE_SETUP.md",
    "NOTIFICATION_SETUP.md",
    "AUTHENTICATION_SETUP.md",
    "GOOGLE_PLAY_STORE.md",
    "SETTINGS_FEATURES.md"
)

foreach ($file in $filesToBackup) {
    if (Test-Path $file) {
        $destPath = Join-Path $backupDir $file
        $destDir = Split-Path $destPath -Parent
        if (!(Test-Path $destDir)) {
            New-Item -ItemType Directory -Path $destDir -Force | Out-Null
        }
        Copy-Item -Path $file -Destination $destPath -Recurse -Force
        Write-Host "  ✅ Backed up: $file" -ForegroundColor Green
    } else {
        Write-Host "  ⚠️  Not found: $file" -ForegroundColor Yellow
    }
}

# Step 3: Create environment variables template
Write-Host "🔐 Creating environment variables template..." -ForegroundColor Yellow

$envTemplate = @"
# Supabase Configuration
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key

# Stripe Configuration
VITE_STRIPE_PUBLISHABLE_KEY=your_stripe_publishable_key
STRIPE_SECRET_KEY=your_stripe_secret_key
STRIPE_WEBHOOK_SECRET=your_stripe_webhook_secret

# Email Configuration (SMTP2GO)
SMTP_HOST=mail.smtp2go.com
SMTP_PORT=2525
SMTP_USER=your_smtp2go_username
SMTP_PASS=your_smtp2go_password
CONTACT_EMAIL=your_contact_email@domain.com
CONTACT_NAME=Your Business Name
CONTACT_PHONE=+1 (555) 123-4567

# SMS Configuration (Optional)
TWILIO_ACCOUNT_SID=your_twilio_sid
TWILIO_AUTH_TOKEN=your_twilio_token
TWILIO_PHONE_NUMBER=your_twilio_number

# Netlify Configuration
NETLIFY_SITE_ID=your_netlify_site_id
NETLIFY_ACCESS_TOKEN=your_netlify_access_token
"@

$envTemplate | Out-File -FilePath "$backupDir/env.template" -Encoding UTF8
Write-Host "  ✅ Created: env.template" -ForegroundColor Green

# Step 4: Create deployment checklist
Write-Host "📋 Creating deployment checklist..." -ForegroundColor Yellow

$checklist = @"
# Netlify Deployment Checklist

## Pre-Deployment
- Environment variables configured in Netlify
- SMTP2GO credentials set up in Supabase
- Stripe webhooks configured
- Domain configured (if using custom domain)

## Environment Variables to Set in Netlify
- VITE_SUPABASE_URL
- VITE_SUPABASE_ANON_KEY
- VITE_STRIPE_PUBLISHABLE_KEY
- STRIPE_SECRET_KEY
- STRIPE_WEBHOOK_SECRET
- SMTP_HOST
- SMTP_PORT
- SMTP_USER
- SMTP_PASS
- CONTACT_EMAIL
- CONTACT_NAME
- CONTACT_PHONE

## Post-Deployment
- Test user registration
- Test email confirmation
- Test payment flow
- Test invite system
- Test mobile app integration
- Monitor error logs
- Set up monitoring

## Backup Information
- Backup created: $backupDir
- Date: $(Get-Date)
- Files backed up: $($filesToBackup.Count) items
"@

$checklist | Out-File -FilePath "$backupDir/DEPLOYMENT_CHECKLIST.md" -Encoding UTF8
Write-Host "  ✅ Created: DEPLOYMENT_CHECKLIST.md" -ForegroundColor Green

# Step 5: Create build script
Write-Host "🔨 Creating build script..." -ForegroundColor Yellow

$buildScript = @"
# Build script for Netlify deployment
npm install
npm run build
"@

$buildScript | Out-File -FilePath "$backupDir/build.sh" -Encoding UTF8
Write-Host "  ✅ Created: build.sh" -ForegroundColor Green

# Step 6: Create deployment summary
Write-Host "📊 Creating deployment summary..." -ForegroundColor Yellow

$summary = @"
# Gas Cylinder App - Deployment Summary

## Backup Information
- Backup Location: $backupDir
- Backup Date: $(Get-Date)
- Total Files: $($filesToBackup.Count) items

## Project Structure
- Frontend: React + Vite
- Backend: Supabase + Netlify Functions
- Database: PostgreSQL (Supabase)
- Email: SMTP2GO
- Payments: Stripe
- Mobile: React Native (Expo)

## Key Features
- Multi-tenant SaaS platform
- User authentication and authorization
- Organization management
- Payment processing
- Email notifications
- Mobile app support
- Real-time updates

## Deployment Steps
1. Configure environment variables in Netlify
2. Set up SMTP2GO in Supabase
3. Configure Stripe webhooks
4. Deploy to Netlify
5. Test all features
6. Monitor performance

## Support Files
- SMTP2GO_SETUP.md - Email configuration guide
- DEPLOYMENT.md - Complete deployment guide
- SETUP_GUIDE.md - Initial setup instructions
- FEATURES_IMPLEMENTED.md - Feature documentation
"@

$summary | Out-File -FilePath "$backupDir/DEPLOYMENT_SUMMARY.md" -Encoding UTF8
Write-Host "  ✅ Created: DEPLOYMENT_SUMMARY.md" -ForegroundColor Green

# Step 7: Install dependencies and build
Write-Host "📦 Installing dependencies..." -ForegroundColor Yellow
npm install

Write-Host "🔨 Building project..." -ForegroundColor Yellow
npm run build

if ($LASTEXITCODE -eq 0) {
    Write-Host "  ✅ Build successful!" -ForegroundColor Green
} else {
    Write-Host "  ❌ Build failed!" -ForegroundColor Red
    exit 1
}

# Step 8: Create git backup
Write-Host "📚 Creating git backup..." -ForegroundColor Yellow

if (Test-Path ".git") {
    $gitBackupDir = "$backupDir/git-backup"
    New-Item -ItemType Directory -Path $gitBackupDir -Force | Out-Null
    
    # Export git log
    git log --oneline > "$gitBackupDir/git-log.txt"
    
    # Export current status
    git status > "$gitBackupDir/git-status.txt"
    
    # Export current branch
    git branch --show-current > "$gitBackupDir/current-branch.txt"
    
    Write-Host "  ✅ Git backup created" -ForegroundColor Green
} else {
    Write-Host "  ⚠️  No git repository found" -ForegroundColor Yellow
}

# Step 9: Final summary
Write-Host "`n🎉 Backup and Deployment Preparation Complete!" -ForegroundColor Green
Write-Host "================================================" -ForegroundColor Green
Write-Host "📁 Backup Location: $backupDir" -ForegroundColor Cyan
Write-Host "📋 Checklist: $backupDir/DEPLOYMENT_CHECKLIST.md" -ForegroundColor Cyan
Write-Host "📊 Summary: $backupDir/DEPLOYMENT_SUMMARY.md" -ForegroundColor Cyan
Write-Host "🔧 Build: dist/ folder ready for deployment" -ForegroundColor Cyan

Write-Host "`n🚀 Next Steps:" -ForegroundColor Yellow
Write-Host "1. Go to Netlify Dashboard" -ForegroundColor White
Write-Host "2. Create new site from Git or drag dist/ folder" -ForegroundColor White
Write-Host "3. Configure environment variables" -ForegroundColor White
Write-Host "4. Set up custom domain (optional)" -ForegroundColor White
Write-Host "5. Test deployment" -ForegroundColor White

Write-Host "`n📚 Documentation:" -ForegroundColor Yellow
Write-Host "- SMTP2GO_SETUP.md - Email configuration" -ForegroundColor White
Write-Host "- DEPLOYMENT.md - Complete deployment guide" -ForegroundColor White
Write-Host "- SETUP_GUIDE.md - Initial setup" -ForegroundColor White 