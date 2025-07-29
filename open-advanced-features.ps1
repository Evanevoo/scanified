# PowerShell script to open all advanced features with correct port
Write-Host "🚀 Opening Advanced Features (Port 5174)" -ForegroundColor Green
Write-Host ""

$urls = @(
    "http://localhost:5174/test-advanced-features",
    "http://localhost:5174/hazmat-compliance",
    "http://localhost:5174/maintenance-workflows", 
    "http://localhost:5174/truck-reconciliation",
    "http://localhost:5174/chain-of-custody",
    "http://localhost:5174/palletization-system",
    "http://localhost:5174/advanced-rental-calculations",
    "http://localhost:5174/predictive-analytics"
)

Write-Host "📋 Available URLs:" -ForegroundColor Yellow
foreach ($url in $urls) {
    Write-Host "  • $url" -ForegroundColor Cyan
}

Write-Host ""
Write-Host "🌐 Opening Test Page..." -ForegroundColor Green
Start-Process "http://localhost:5174/test-advanced-features"

Write-Host ""
Write-Host "💡 If pages appear white:" -ForegroundColor Yellow
Write-Host "  1. Check browser console for errors (F12)" -ForegroundColor White
Write-Host "  2. Make sure you're logged in to the application" -ForegroundColor White  
Write-Host "  3. Verify the dev server is running on port 5174" -ForegroundColor White
Write-Host "  4. Check network tab for failed requests" -ForegroundColor White 