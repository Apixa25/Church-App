# Frontend S3 Deployment Script
# Deploys the built frontend to AWS S3

param(
    [Parameter(Mandatory=$true)]
    [string]$BucketName
)

Write-Host "🚀 Deploying Frontend to S3" -ForegroundColor Cyan
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host ""

# Check if build directory exists
$buildDir = Join-Path $PSScriptRoot "build"
if (-not (Test-Path $buildDir)) {
    Write-Host "❌ ERROR: Build directory not found!" -ForegroundColor Red
    Write-Host "   Expected location: $buildDir" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "   Please run 'npm run build' first to create the build." -ForegroundColor Yellow
    exit 1
}

Write-Host "✅ Build directory found: $buildDir" -ForegroundColor Green
Write-Host ""

# Check if AWS CLI is available
$awsCliPath = Get-Command aws -ErrorAction SilentlyContinue
if (-not $awsCliPath) {
    Write-Host "❌ ERROR: AWS CLI not found!" -ForegroundColor Red
    Write-Host ""
    Write-Host "   Please install AWS CLI:" -ForegroundColor Yellow
    Write-Host "   https://aws.amazon.com/cli/" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "   OR provide the bucket name and I'll create manual upload instructions." -ForegroundColor Yellow
    exit 1
}

Write-Host "✅ AWS CLI found" -ForegroundColor Green
Write-Host ""

# Verify bucket exists
Write-Host "🔍 Verifying S3 bucket exists..." -ForegroundColor Cyan
$bucketCheck = aws s3 ls "s3://$BucketName" 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ ERROR: Cannot access bucket '$BucketName'" -ForegroundColor Red
    Write-Host ""
    Write-Host "   Error details:" -ForegroundColor Yellow
    Write-Host $bucketCheck -ForegroundColor Yellow
    Write-Host ""
    Write-Host "   Please verify:" -ForegroundColor Yellow
    Write-Host "   1. Bucket name is correct: $BucketName" -ForegroundColor Yellow
    Write-Host "   2. AWS credentials are configured" -ForegroundColor Yellow
    Write-Host "   3. You have permissions to access this bucket" -ForegroundColor Yellow
    exit 1
}

Write-Host "✅ Bucket '$BucketName' is accessible" -ForegroundColor Green
Write-Host ""

# Sync files to S3 (this will upload new/changed files only)
Write-Host "📤 Uploading files to S3..." -ForegroundColor Cyan
Write-Host "   This may take a minute..." -ForegroundColor Gray
Write-Host ""

# Use sync to upload files (no --acl flag - bucket uses bucket policy, not ACLs)
aws s3 sync $buildDir "s3://$BucketName" --delete

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
    Write-Host "✅ DEPLOYMENT SUCCESSFUL!" -ForegroundColor Green
    Write-Host ""
    Write-Host "📦 Files uploaded to: s3://$BucketName" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "🔍 Next steps:" -ForegroundColor Cyan
    Write-Host "   1. Invalidate CloudFront cache (you'll do this)" -ForegroundColor White
    Write-Host "   2. Wait for invalidation to complete (1-2 minutes)" -ForegroundColor White
    Write-Host "   3. Hard refresh browser: Ctrl+Shift+R" -ForegroundColor White
    Write-Host "   4. Test the deployment!" -ForegroundColor White
    Write-Host ""
} else {
    Write-Host ""
    Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Red
    Write-Host "❌ DEPLOYMENT FAILED!" -ForegroundColor Red
    Write-Host ""
    Write-Host "Please check the error messages above and try again." -ForegroundColor Yellow
    Write-Host ""
    exit 1
}

