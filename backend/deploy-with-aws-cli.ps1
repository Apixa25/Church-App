# 🚀 Deploy to AWS Elastic Beanstalk using AWS CLI
# This script deploys the JAR file to your Elastic Beanstalk environment

param(
    [Parameter(Mandatory=$false)]
    [string]$ApplicationName = "church-app-backend",  # Update this with your actual application name
    
    [Parameter(Mandatory=$false)]
    [string]$EnvironmentName = "church-app-api-prod",  # Update this with your actual environment name
    
    [Parameter(Mandatory=$false)]
    [string]$VersionLabel = "heart-counter-fix-$(Get-Date -Format 'yyyyMMdd-HHmmss')",
    
    [Parameter(Mandatory=$false)]
    [string]$Region = "us-west-2",  # Update this with your AWS region
    
    [Parameter(Mandatory=$false)]
    [string]$JarPath = "target\church-app-backend-0.0.1-SNAPSHOT.jar"
)

Write-Host "`n🚀 Deploying to AWS Elastic Beanstalk...`n" -ForegroundColor Cyan

# Step 1: Verify JAR file exists
if (-not (Test-Path $JarPath)) {
    Write-Host "❌ JAR file not found: $JarPath" -ForegroundColor Red
    Write-Host "Please build the JAR first: .\mvnw.cmd clean package -DskipTests`n" -ForegroundColor Yellow
    exit 1
}

$jarSize = (Get-Item $JarPath).Length / 1MB
Write-Host "✅ JAR file found: $JarPath ($([math]::Round($jarSize, 2)) MB)`n" -ForegroundColor Green

# Step 2: Get Elastic Beanstalk S3 bucket
Write-Host "📦 Step 1: Getting Elastic Beanstalk S3 bucket...`n" -ForegroundColor Yellow
try {
    $bucketInfo = aws elasticbeanstalk create-storage-location --region $Region 2>&1
    if ($LASTEXITCODE -ne 0) {
        # If bucket already exists, get it from application description
        Write-Host "   Getting bucket from application...`n" -ForegroundColor Gray
        $appInfo = aws elasticbeanstalk describe-applications --application-names $ApplicationName --region $Region --query 'Applications[0].ResourceLifecycleConfig.ServiceRole' 2>&1
    }
    
    # Get the S3 bucket name (Elastic Beanstalk creates it automatically)
    $s3Bucket = aws elasticbeanstalk describe-application-versions --application-name $ApplicationName --region $Region --query 'ApplicationVersions[0].SourceBundle.S3Bucket' --output text 2>&1
    
    if ($LASTEXITCODE -ne 0 -or [string]::IsNullOrWhiteSpace($s3Bucket)) {
        # Fallback: Use standard Elastic Beanstalk bucket naming convention
        $accountId = aws sts get-caller-identity --query Account --output text --region $Region
        $s3Bucket = "elasticbeanstalk-$Region-$accountId"
        Write-Host "   Using standard bucket name: $s3Bucket`n" -ForegroundColor Gray
    } else {
        Write-Host "   Found bucket: $s3Bucket`n" -ForegroundColor Gray
    }
} catch {
    Write-Host "   ⚠️  Could not determine bucket, using standard naming...`n" -ForegroundColor Yellow
    $accountId = aws sts get-caller-identity --query Account --output text --region $Region
    $s3Bucket = "elasticbeanstalk-$Region-$accountId"
}

# Step 3: Upload JAR to S3
$s3Key = "versions/$VersionLabel.jar"
Write-Host "📤 Step 2: Uploading JAR to S3...`n" -ForegroundColor Yellow
Write-Host "   Bucket: $s3Bucket" -ForegroundColor Gray
Write-Host "   Key: $s3Key`n" -ForegroundColor Gray

$uploadResult = aws s3 cp $JarPath "s3://$s3Bucket/$s3Key" --region $Region 2>&1

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Failed to upload JAR to S3" -ForegroundColor Red
    Write-Host $uploadResult -ForegroundColor Red
    Write-Host "`n💡 Tip: Make sure you have AWS credentials configured and S3 permissions.`n" -ForegroundColor Yellow
    exit 1
}

Write-Host "✅ JAR uploaded successfully to S3`n" -ForegroundColor Green

# Step 4: Create application version
Write-Host "📝 Step 3: Creating application version...`n" -ForegroundColor Yellow
Write-Host "   Version Label: $VersionLabel" -ForegroundColor Gray
Write-Host "   Application: $ApplicationName`n" -ForegroundColor Gray

$versionResult = aws elasticbeanstalk create-application-version `
    --application-name $ApplicationName `
    --version-label $VersionLabel `
    --source-bundle S3Bucket="$s3Bucket",S3Key="$s3Key" `
    --description "Heart counter fix - idempotent like/unlike operations" `
    --region $Region 2>&1

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Failed to create application version" -ForegroundColor Red
    Write-Host $versionResult -ForegroundColor Red
    Write-Host "`n💡 Tip: Check that the application name is correct.`n" -ForegroundColor Yellow
    exit 1
}

Write-Host "✅ Application version created successfully`n" -ForegroundColor Green

# Step 5: Update environment
Write-Host "🚀 Step 4: Updating environment...`n" -ForegroundColor Yellow
Write-Host "   Environment: $EnvironmentName" -ForegroundColor Gray
Write-Host "   Version: $VersionLabel`n" -ForegroundColor Gray

$updateResult = aws elasticbeanstalk update-environment `
    --application-name $ApplicationName `
    --environment-name $EnvironmentName `
    --version-label $VersionLabel `
    --region $Region 2>&1

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Failed to update environment" -ForegroundColor Red
    Write-Host $updateResult -ForegroundColor Red
    Write-Host "`n💡 Tip: Check that the environment name is correct.`n" -ForegroundColor Yellow
    exit 1
}

Write-Host "✅ Environment update initiated successfully!`n" -ForegroundColor Green

# Step 6: Monitor deployment
Write-Host "⏱️  Step 5: Monitoring deployment...`n" -ForegroundColor Yellow
Write-Host "   This may take 5-10 minutes..." -ForegroundColor Gray
Write-Host "   You can monitor progress in AWS Console or with:" -ForegroundColor Gray
Write-Host "   aws elasticbeanstalk describe-events --environment-name $EnvironmentName --region $Region --max-items 10`n" -ForegroundColor Cyan

Write-Host "📋 Deployment Summary:" -ForegroundColor Cyan
Write-Host "   Application: $ApplicationName" -ForegroundColor White
Write-Host "   Environment: $EnvironmentName" -ForegroundColor White
Write-Host "   Version: $VersionLabel" -ForegroundColor White
Write-Host "   Region: $Region" -ForegroundColor White
Write-Host "   S3 Location: s3://$s3Bucket/$s3Key`n" -ForegroundColor White

Write-Host "✅ Deployment initiated! Check AWS Console for progress.`n" -ForegroundColor Green

