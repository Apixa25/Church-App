# Church App Backend Deployment Script (PowerShell)
# This script builds and deploys the backend to AWS Elastic Beanstalk

$ErrorActionPreference = "Stop"

Write-Host "🚀 Starting Church App Backend Deployment..." -ForegroundColor Green

# Check if we're on deployment branch
$currentBranch = git rev-parse --abbrev-ref HEAD
if ($currentBranch -ne "deployment") {
    Write-Host "⚠️  Warning: Not on deployment branch. Current branch: $currentBranch" -ForegroundColor Yellow
    $continue = Read-Host "Continue anyway? (y/n)"
    if ($continue -ne "y" -and $continue -ne "Y") {
        exit 1
    }
}

# Navigate to backend directory
Set-Location backend

Write-Host "📦 Building application..." -ForegroundColor Green
# Build the application
& mvn clean package -DskipTests

# Check if build was successful
if (-not (Test-Path "target\church-app-backend-0.0.1-SNAPSHOT.jar")) {
    Write-Host "❌ Build failed! JAR file not found." -ForegroundColor Red
    exit 1
}

Write-Host "✅ Build successful!" -ForegroundColor Green

# Check if EB CLI is installed
try {
    $null = Get-Command eb -ErrorAction Stop
} catch {
    Write-Host "⚠️  EB CLI not found. Please install: pip install awsebcli" -ForegroundColor Yellow
    exit 1
}

# Initialize EB if not already done
if (-not (Test-Path ".elasticbeanstalk")) {
    Write-Host "🔧 Initializing Elastic Beanstalk..." -ForegroundColor Green
    & eb init church-app-backend --platform "Java 17 running on 64bit Amazon Linux 2023" --region us-east-1
}

# Create environment if it doesn't exist
Write-Host "🌍 Checking Elastic Beanstalk environment..." -ForegroundColor Green
$envList = & eb list
if ($envList -notmatch "church-app-api-prod") {
    Write-Host "📝 Creating new environment..." -ForegroundColor Green
    & eb create church-app-api-prod `
        --instance-type t3.small `
        --envvars SPRING_PROFILES_ACTIVE=production `
        --platform "Java 17 running on 64bit Amazon Linux 2023" `
        --region us-east-1
} else {
    Write-Host "🔄 Deploying to existing environment..." -ForegroundColor Green
    & eb deploy church-app-api-prod
}

Write-Host "✅ Deployment complete!" -ForegroundColor Green
$status = & eb status
$cname = ($status | Select-String "CNAME").ToString().Split(":")[1].Trim()
Write-Host "🌐 Your API should be available at: $cname" -ForegroundColor Green

Set-Location ..

