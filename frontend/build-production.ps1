# Frontend Production Build Script
# This script ensures the production environment variable is set before building

Write-Host "🚀 Frontend Production Build Script" -ForegroundColor Cyan
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host ""

# Check if .env.production exists
$envFile = Join-Path $PSScriptRoot ".env.production"

if (-not (Test-Path $envFile)) {
    Write-Host "⚠️  .env.production file not found!" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Creating .env.production file with production API URL..." -ForegroundColor Yellow
    
    $content = @"
# Production Environment Variables for Frontend
# This file is used when running: npm run build
# It sets the API URL for production builds

REACT_APP_API_URL=https://api.thegathrd.com/api
"@
    
    Set-Content -Path $envFile -Value $content
    Write-Host "✅ Created .env.production file" -ForegroundColor Green
    Write-Host ""
} else {
    Write-Host "✅ .env.production file found" -ForegroundColor Green
    
    # Verify it contains the production URL
    $content = Get-Content $envFile -Raw
    if ($content -notmatch "REACT_APP_API_URL=https://api\.thegathrd\.com/api") {
        Write-Host "⚠️  WARNING: .env.production may not have correct production URL!" -ForegroundColor Yellow
        Write-Host "   Expected: REACT_APP_API_URL=https://api.thegathrd.com/api" -ForegroundColor Yellow
        Write-Host ""
    } else {
        Write-Host "✅ Production API URL verified in .env.production" -ForegroundColor Green
    }
    Write-Host ""
}

# Clean previous build
Write-Host "🧹 Cleaning previous build..." -ForegroundColor Cyan
if (Test-Path "build") {
    Remove-Item -Recurse -Force "build"
    Write-Host "✅ Previous build removed" -ForegroundColor Green
} else {
    Write-Host "ℹ️  No previous build found (that's okay)" -ForegroundColor Gray
}
Write-Host ""

# Build for production
Write-Host "🔨 Building production bundle..." -ForegroundColor Cyan
Write-Host "   This may take 1-2 minutes..." -ForegroundColor Gray
Write-Host ""

npm run build

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
    Write-Host "✅ BUILD SUCCESSFUL!" -ForegroundColor Green
    Write-Host ""
    Write-Host "📦 Build output location:" -ForegroundColor Cyan
    Write-Host "   $PSScriptRoot\build" -ForegroundColor White
    Write-Host ""
    Write-Host "🔍 Next steps:" -ForegroundColor Cyan
    Write-Host "   1. Verify the build contains production API URL" -ForegroundColor White
    Write-Host "   2. Upload contents of 'build' folder to your web server" -ForegroundColor White
    Write-Host "   3. Invalidate CloudFront cache (if using CloudFront)" -ForegroundColor White
    Write-Host ""
    Write-Host "💡 To verify API URL in built files, run:" -ForegroundColor Cyan
    Write-Host "   Select-String -Path 'build\static\js\*.js' -Pattern 'api.thegathrd.com' -SimpleMatch" -ForegroundColor White
    Write-Host ""
} else {
    Write-Host ""
    Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Red
    Write-Host "❌ BUILD FAILED!" -ForegroundColor Red
    Write-Host ""
    Write-Host "Please check the error messages above and fix any issues." -ForegroundColor Yellow
    Write-Host ""
    exit 1
}

