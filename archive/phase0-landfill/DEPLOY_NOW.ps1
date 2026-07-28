# Quick Deploy Script for Netlify
# Run this to deploy your function directly to Netlify

Write-Host "🚀 Deploying to Netlify..." -ForegroundColor Green
Write-Host ""

# Check if logged in
Write-Host "Checking Netlify login status..." -ForegroundColor Yellow
netlify status

Write-Host ""
Write-Host "If not logged in, run: netlify login" -ForegroundColor Yellow
Write-Host ""

# Deploy
Write-Host "Deploying function..." -ForegroundColor Green
netlify deploy --prod

Write-Host ""
Write-Host "✅ Deployment complete!" -ForegroundColor Green
Write-Host ""
Write-Host "Test your function:" -ForegroundColor Cyan
Write-Host "https://scanified.netlify.app/.netlify/functions/daily-tenant-backup" -ForegroundColor White

