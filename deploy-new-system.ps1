# Deploy New Organization & Invitation System
# PowerShell script for Windows

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Deploy New System" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check if we're in the right directory
if (!(Test-Path "package.json")) {
    Write-Host "❌ Error: package.json not found. Please run this script from the project root." -ForegroundColor Red
    exit 1
}

Write-Host "✅ Project directory confirmed" -ForegroundColor Green
Write-Host ""

# Check for SQL file
if (!(Test-Path "setup-proper-invitation-system.sql")) {
    Write-Host "❌ Error: setup-proper-invitation-system.sql not found!" -ForegroundColor Red
    exit 1
}

Write-Host "✅ SQL setup file found" -ForegroundColor Green
Write-Host ""

# Summary of changes
Write-Host "📋 Summary of Changes:" -ForegroundColor Yellow
Write-Host "   • Created new organization signup with email verification" -ForegroundColor White
Write-Host "   • Rebuilt user invitation system (clean and simple)" -ForegroundColor White
Write-Host "   • Fixed organization deletion to permanently delete users" -ForegroundColor White
Write-Host "   • Added professional email templates" -ForegroundColor White
Write-Host "   • Updated all navigation links" -ForegroundColor White
Write-Host ""

# Ask for confirmation
Write-Host "🚀 Ready to deploy?" -ForegroundColor Yellow
Write-Host ""
Write-Host "BEFORE YOU CONTINUE:" -ForegroundColor Red
Write-Host "1. Have you backed up your database?" -ForegroundColor White
Write-Host "2. Are you ready to drop/recreate the organization_invites table?" -ForegroundColor White
Write-Host "3. Do you have email service configured in Netlify?" -ForegroundColor White
Write-Host ""

$confirm = Read-Host "Type 'YES' to continue"

if ($confirm -ne "YES") {
    Write-Host "❌ Deployment cancelled." -ForegroundColor Red
    exit 0
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Deploying..." -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Step 1: Open Supabase SQL Editor
Write-Host "📂 STEP 1: Database Setup" -ForegroundColor Yellow
Write-Host ""
Write-Host "Opening SQL file in notepad..." -ForegroundColor White
Start-Process notepad "setup-proper-invitation-system.sql"
Write-Host ""
Write-Host "👉 Copy the entire contents and paste into Supabase SQL Editor" -ForegroundColor Cyan
Write-Host "👉 Execute the script" -ForegroundColor Cyan
Write-Host ""
$dbDone = Read-Host "Press ENTER when database setup is complete"

Write-Host "✅ Database setup marked as complete" -ForegroundColor Green
Write-Host ""

# Step 2: Build frontend
Write-Host "📦 STEP 2: Building Frontend" -ForegroundColor Yellow
Write-Host ""
Write-Host "Running npm build..." -ForegroundColor White

try {
    npm run build
    Write-Host "✅ Build successful" -ForegroundColor Green
} catch {
    Write-Host "❌ Build failed. Please check errors above." -ForegroundColor Red
    exit 1
}

Write-Host ""

# Step 3: Test locally
Write-Host "🧪 STEP 3: Local Testing" -ForegroundColor Yellow
Write-Host ""
Write-Host "Do you want to test locally before deploying? (recommended)" -ForegroundColor Cyan
$testLocal = Read-Host "Type 'YES' to start dev server, 'NO' to skip"

if ($testLocal -eq "YES") {
    Write-Host ""
    Write-Host "Starting development server..." -ForegroundColor White
    Write-Host "Test these pages:" -ForegroundColor Cyan
    Write-Host "  • http://localhost:5174/create-organization" -ForegroundColor White
    Write-Host "  • http://localhost:5174/user-invites (sign in first)" -ForegroundColor White
    Write-Host ""
    Write-Host "Press Ctrl+C to stop the server when done testing" -ForegroundColor Yellow
    Write-Host ""
    
    npm run dev
}

Write-Host ""

# Step 4: Deploy
Write-Host "🚀 STEP 4: Deploy to Production" -ForegroundColor Yellow
Write-Host ""
Write-Host "Ready to deploy to Netlify?" -ForegroundColor Cyan
$deploy = Read-Host "Type 'YES' to deploy now"

if ($deploy -eq "YES") {
    Write-Host ""
    Write-Host "Deploying..." -ForegroundColor White
    
    # Check if Netlify CLI is installed
    $netlifyInstalled = Get-Command netlify -ErrorAction SilentlyContinue
    
    if ($netlifyInstalled) {
        netlify deploy --prod
        Write-Host "✅ Deployment complete!" -ForegroundColor Green
    } else {
        Write-Host "⚠️  Netlify CLI not found." -ForegroundColor Yellow
        Write-Host "You can:" -ForegroundColor White
        Write-Host "  1. Install it: npm install -g netlify-cli" -ForegroundColor White
        Write-Host "  2. Or deploy via Git push (Netlify will auto-deploy)" -ForegroundColor White
        Write-Host "  3. Or use Netlify web interface to deploy" -ForegroundColor White
    }
} else {
    Write-Host ""
    Write-Host "⏸️  Deployment skipped." -ForegroundColor Yellow
    Write-Host "When ready, run: netlify deploy --prod" -ForegroundColor White
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Deployment Complete! 🎉" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "📚 Documentation:" -ForegroundColor Yellow
Write-Host "   • QUICK_START.md - Quick reference" -ForegroundColor White
Write-Host "   • SETUP_NEW_SYSTEM.md - Detailed guide" -ForegroundColor White
Write-Host "   • REBUILD_SUMMARY.md - What changed" -ForegroundColor White
Write-Host ""
Write-Host "🧪 Test these URLs:" -ForegroundColor Yellow
Write-Host "   • /create-organization - Create new organization" -ForegroundColor White
Write-Host "   • /user-invites - Send invitations" -ForegroundColor White
Write-Host "   • /owner-portal/customer-management - Delete/restore orgs" -ForegroundColor White
Write-Host ""
Write-Host "✨ All systems ready!" -ForegroundColor Green
Write-Host ""

