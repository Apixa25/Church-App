# Get Elastic Beanstalk Logs via AWS CLI
# Usage: .\get-eb-logs.ps1 -EnvironmentName "your-env-name"

param(
    [Parameter(Mandatory=$true)]
    [string]$EnvironmentName,
    
    [string]$Region = "us-west-2",
    [int]$Lines = 1000
)

Write-Host "Getting logs for environment: $EnvironmentName" -ForegroundColor Cyan
Write-Host "Region: $Region" -ForegroundColor Cyan
Write-Host ""

# Step 1: Request logs
Write-Host "Step 1: Requesting logs..." -ForegroundColor Yellow
aws elasticbeanstalk request-environment-info `
    --environment-name $EnvironmentName `
    --region $Region `
    --info-type tail

Write-Host "Waiting 30 seconds for logs to be ready..." -ForegroundColor Yellow
Start-Sleep -Seconds 30

# Step 2: Retrieve logs
Write-Host "Step 2: Retrieving logs..." -ForegroundColor Yellow
$logs = aws elasticbeanstalk retrieve-environment-info `
    --environment-name $EnvironmentName `
    --region $Region `
    --info-type tail `
    --output json | ConvertFrom-Json

# Step 3: Display logs
Write-Host ""
Write-Host "=== RECENT LOGS ===" -ForegroundColor Green
Write-Host ""

if ($logs.EnvironmentInfo) {
    foreach ($info in $logs.EnvironmentInfo) {
        Write-Host "--- $($info.InfoType) - $($info.Ec2InstanceId) ---" -ForegroundColor Cyan
        Write-Host $info.Message
        Write-Host ""
    }
} else {
    Write-Host "No logs retrieved. Try increasing wait time or check environment status." -ForegroundColor Red
}

# Step 4: Get recent events
Write-Host ""
Write-Host "=== RECENT EVENTS ===" -ForegroundColor Green
Write-Host ""

aws elasticbeanstalk describe-events `
    --environment-name $EnvironmentName `
    --region $Region `
    --max-items 20 `
    --output table

