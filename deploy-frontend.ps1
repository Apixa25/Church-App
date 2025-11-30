# Church App Frontend Deployment Script (PowerShell)
# This script builds and deploys the frontend to AWS S3 + CloudFront

$ErrorActionPreference = "Stop"

Write-Host "🚀 Starting Church App Frontend Deployment..." -ForegroundColor Green

# Configuration
$S3_BUCKET = "thegathrd-app-frontend"
$CLOUDFRONT_DISTRIBUTION_ID = "E2SM4EXV57KO8B"  # CloudFront Distribution ID
$REGION = "us-west-2"  # Match your database and backend region

# Check if we're on deployment branch
$currentBranch = git rev-parse --abbrev-ref HEAD
if ($currentBranch -ne "deployment") {
    Write-Host "⚠️  Warning: Not on deployment branch. Current branch: $currentBranch" -ForegroundColor Yellow
    $continue = Read-Host "Continue anyway? (y/n)"
    if ($continue -ne "y" -and $continue -ne "Y") {
        exit 1
    }
}

# Navigate to frontend directory
Set-Location frontend

# Check if .env.production exists
if (-not (Test-Path ".env.production")) {
    Write-Host "⚠️  .env.production not found. Creating from template..." -ForegroundColor Yellow
    @"
REACT_APP_API_URL=https://api.thegathrd.com/api
REACT_APP_STRIPE_PUBLIC_KEY=pk_live_your_key_here
NODE_ENV=production
GENERATE_SOURCEMAP=false
"@ | Out-File -FilePath .env.production -Encoding UTF8
    Write-Host "⚠️  Please update .env.production with your production values!" -ForegroundColor Yellow
    Read-Host "Press enter to continue after updating..."
}

Write-Host "📦 Installing dependencies..." -ForegroundColor Green
npm install

Write-Host "🔨 Building production bundle..." -ForegroundColor Green
npm run build

# Check if build was successful
if (-not (Test-Path "build")) {
    Write-Host "❌ Build failed! Build directory not found." -ForegroundColor Red
    exit 1
}

Write-Host "✅ Build successful!" -ForegroundColor Green

# Check if AWS CLI is installed
try {
    $null = Get-Command aws -ErrorAction Stop
} catch {
    Write-Host "❌ AWS CLI not found. Please install: https://aws.amazon.com/cli/" -ForegroundColor Red
    exit 1
}

# Sync to S3
Write-Host "☁️  Uploading to S3..." -ForegroundColor Green
aws s3 sync build/ s3://$S3_BUCKET/ --delete --region $REGION

# Invalidate CloudFront cache if distribution ID is set
if ($CLOUDFRONT_DISTRIBUTION_ID) {
    Write-Host "🔄 Invalidating CloudFront cache..." -ForegroundColor Green
    aws cloudfront create-invalidation `
        --distribution-id $CLOUDFRONT_DISTRIBUTION_ID `
        --paths "/*"
    Write-Host "✅ Cache invalidation initiated. It may take a few minutes to complete." -ForegroundColor Green
} else {
    Write-Host "⚠️  CloudFront distribution ID not set. Skipping cache invalidation." -ForegroundColor Yellow
    Write-Host "   Set CLOUDFRONT_DISTRIBUTION_ID in this script after creating distribution." -ForegroundColor Yellow
}

Write-Host "✅ Deployment complete!" -ForegroundColor Green
Write-Host "🌐 Your frontend should be available at: https://www.thegathrd.com" -ForegroundColor Green

Set-Location ..

