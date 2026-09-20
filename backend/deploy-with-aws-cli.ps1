# Deploy the backend JAR to AWS Elastic Beanstalk using the AWS CLI.
#
# Usage (from the backend folder, after .\mvnw.cmd clean package -DskipTests):
#   .\deploy-with-aws-cli.ps1
#   .\deploy-with-aws-cli.ps1 -Description "Person scope feature"
#   .\deploy-with-aws-cli.ps1 -NoWait
#
# NOTE: This file is intentionally ASCII-only. Windows PowerShell 5 reads .ps1
# files without a BOM as ANSI, and multi-byte characters (emoji) can corrupt
# string literals and break the whole script.

param(
    [string]$ApplicationName = "church-app-backend",

    # Live environment name (case-sensitive in the AWS API).
    [string]$EnvironmentName = "Church-app-backend-prod",

    # Unique per deploy so EB rollbacks restore the exact older JAR.
    [string]$VersionLabel = "v-deploy-$(Get-Date -Format 'yyyyMMdd-HHmmss')",

    [string]$Description = "Deployed via deploy-with-aws-cli.ps1",

    [string]$Region = "us-west-2",

    # Bucket the deployer already has write access to. Each JAR gets its own key.
    [string]$S3Bucket = "church-app-uploads-stevensills2",

    [string]$JarPath = "target\church-app-backend-0.0.1-SNAPSHOT.jar",

    # Skip the wait-for-Ready loop at the end.
    [switch]$NoWait
)

$ErrorActionPreference = "Stop"

function Fail($message) {
    Write-Host ""
    Write-Host "[FAIL] $message" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "Deploying to AWS Elastic Beanstalk" -ForegroundColor Cyan
Write-Host "----------------------------------" -ForegroundColor Cyan

# Step 1: JAR present?
if (-not (Test-Path $JarPath)) {
    Fail "JAR not found at $JarPath. Build it first: .\mvnw.cmd clean package -DskipTests"
}
$jarSizeMb = [math]::Round((Get-Item $JarPath).Length / 1MB, 1)
Write-Host "[OK] JAR: $JarPath ($jarSizeMb MB)" -ForegroundColor Green

# Step 2: Environment exists? Fail fast with the real names if not.
$envStatus = aws elasticbeanstalk describe-environments `
    --application-name $ApplicationName `
    --environment-names $EnvironmentName `
    --region $Region `
    --query "Environments[?Status!='Terminated'].[Status,Health,VersionLabel]" `
    --output text 2>&1
if ($LASTEXITCODE -ne 0 -or [string]::IsNullOrWhiteSpace($envStatus)) {
    Write-Host "[FAIL] Environment '$EnvironmentName' not found in application '$ApplicationName'." -ForegroundColor Red
    Write-Host "       Live environments:" -ForegroundColor Yellow
    aws elasticbeanstalk describe-environments --application-name $ApplicationName --region $Region `
        --query "Environments[?Status!='Terminated'].[EnvironmentName,Status,Health,VersionLabel]" --output table
    exit 1
}
Write-Host "[OK] Environment: $EnvironmentName (currently $($envStatus -replace "`t", ' / '))" -ForegroundColor Green

# Step 3: Upload JAR under a unique key.
$s3Key = "deployments/church-app-backend-$VersionLabel.jar"
Write-Host ""
Write-Host "Uploading to s3://$S3Bucket/$s3Key ..." -ForegroundColor Yellow
aws s3 cp $JarPath "s3://$S3Bucket/$s3Key" --region $Region --only-show-errors
if ($LASTEXITCODE -ne 0) { Fail "S3 upload failed. Check AWS credentials and bucket permissions." }
Write-Host "[OK] Uploaded" -ForegroundColor Green

# Step 4: Register the application version.
Write-Host ""
Write-Host "Creating application version $VersionLabel ..." -ForegroundColor Yellow
aws elasticbeanstalk create-application-version `
    --application-name $ApplicationName `
    --version-label $VersionLabel `
    --source-bundle "S3Bucket=$S3Bucket,S3Key=$s3Key" `
    --description $Description `
    --region $Region `
    --query "ApplicationVersion.[VersionLabel,Status]" --output text
if ($LASTEXITCODE -ne 0) { Fail "create-application-version failed." }
Write-Host "[OK] Version registered" -ForegroundColor Green

# Step 5: Roll it out.
Write-Host ""
Write-Host "Updating environment $EnvironmentName ..." -ForegroundColor Yellow
aws elasticbeanstalk update-environment `
    --application-name $ApplicationName `
    --environment-name $EnvironmentName `
    --version-label $VersionLabel `
    --region $Region `
    --query "[EnvironmentName,Status,VersionLabel]" --output text
if ($LASTEXITCODE -ne 0) { Fail "update-environment failed." }
Write-Host "[OK] Rollout started" -ForegroundColor Green

Write-Host ""
Write-Host "Summary" -ForegroundColor Cyan
Write-Host "  Application : $ApplicationName"
Write-Host "  Environment : $EnvironmentName"
Write-Host "  Version     : $VersionLabel"
Write-Host "  Artifact    : s3://$S3Bucket/$s3Key"
Write-Host "  Rollback    : aws elasticbeanstalk update-environment --environment-name $EnvironmentName --version-label <previous-label> --region $Region"

if ($NoWait) {
    Write-Host ""
    Write-Host "Skipping wait. Monitor with:" -ForegroundColor Gray
    Write-Host "  aws elasticbeanstalk describe-events --environment-name $EnvironmentName --region $Region --max-items 10" -ForegroundColor Gray
    exit 0
}

# Step 6: Wait until the environment is Ready on the new version (typically 2-5 minutes).
Write-Host ""
Write-Host "Waiting for rollout (Spring Boot needs ~40s to boot after the swap) ..." -ForegroundColor Yellow
$deadline = (Get-Date).AddMinutes(12)
do {
    Start-Sleep -Seconds 20
    $state = aws elasticbeanstalk describe-environments `
        --application-name $ApplicationName `
        --environment-names $EnvironmentName `
        --region $Region `
        --query "Environments[0].[Status,Health,VersionLabel]" --output text
    Write-Host "  $(Get-Date -Format HH:mm:ss)  $($state -replace "`t", '  ')" -ForegroundColor Gray
    $ready = ($state -match "^Ready\s+Green\s+$([regex]::Escape($VersionLabel))")
} while (-not $ready -and (Get-Date) -lt $deadline)

if ($ready) {
    Write-Host ""
    Write-Host "[OK] Deployment healthy on $VersionLabel" -ForegroundColor Green
} else {
    Write-Host ""
    Write-Host "[WARN] Not Green yet. Recent events:" -ForegroundColor Yellow
    aws elasticbeanstalk describe-events --environment-name $EnvironmentName --region $Region `
        --max-items 8 --query "Events[].[EventDate,Severity,Message]" --output text
    exit 2
}
