# 🚀 Build JAR for Deployment
# Simple script to build the JAR file for AWS Elastic Beanstalk deployment

Write-Host "`n🔨 Building JAR file for deployment...`n" -ForegroundColor Cyan

# Step 1: Clean and build
Write-Host "📦 Step 1: Cleaning previous build..." -ForegroundColor Yellow
.\mvnw.cmd clean

Write-Host "`n📦 Step 2: Building JAR (this may take 1-2 minutes)...`n" -ForegroundColor Yellow
.\mvnw.cmd package -DskipTests

# Check if build succeeded
$jarPath = "target\church-app-backend-0.0.1-SNAPSHOT.jar"
if (Test-Path $jarPath) {
    $jarSize = (Get-Item $jarPath).Length / 1MB
    Write-Host "`n✅ JAR file built successfully!`n" -ForegroundColor Green
    Write-Host "📋 JAR Details:" -ForegroundColor Cyan
    Write-Host "   Location: $jarPath" -ForegroundColor White
    Write-Host "   Size: $([math]::Round($jarSize, 2)) MB`n" -ForegroundColor White
    
    Write-Host "🚀 Next Steps:" -ForegroundColor Cyan
    Write-Host "   1. Go to AWS Elastic Beanstalk Console" -ForegroundColor White
    Write-Host "   2. Select your environment" -ForegroundColor White
    Write-Host "   3. Click 'Upload and deploy'" -ForegroundColor White
    Write-Host "   4. Upload: $jarPath`n" -ForegroundColor White
    
    Write-Host "💡 Tip: You can also rename it to 'application.jar' for easier deployment`n" -ForegroundColor Yellow
} else {
    Write-Host "`n❌ Build failed! JAR file not found.`n" -ForegroundColor Red
    Write-Host "Check the Maven output above for errors.`n" -ForegroundColor Yellow
    exit 1
}

