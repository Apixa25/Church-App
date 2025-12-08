# Configure MediaConvert Queue with SNS Topic
# This script configures the Default queue to send job completion notifications to SNS

Write-Host "`n🎬 Configuring MediaConvert Queue with SNS" -ForegroundColor Cyan
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host ""

# Configuration
$queueName = "Default"
$snsTopicArn = "arn:aws:sns:us-west-2:060163370478:mediaconvert-job-completion"
$region = "us-west-2"

Write-Host "Queue Name: $queueName" -ForegroundColor White
Write-Host "SNS Topic ARN: $snsTopicArn" -ForegroundColor White
Write-Host "Region: $region" -ForegroundColor White
Write-Host ""

# Check if AWS CLI is installed
$awsCliCheck = Get-Command aws -ErrorAction SilentlyContinue
if (-not $awsCliCheck) {
    Write-Host "ERROR: AWS CLI is not installed!" -ForegroundColor Red
    Write-Host ""
    Write-Host "Please install AWS CLI:" -ForegroundColor Yellow
    Write-Host "  https://aws.amazon.com/cli/" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Or run this command manually:" -ForegroundColor Yellow
    Write-Host "  aws mediaconvert update-queue --name Default --settings '{\"EventNotifications\":{\"OnComplete\":{\"SnsTopicArn\":\"$snsTopicArn\"},\"OnError\":{\"SnsTopicArn\":\"$snsTopicArn\"}}}' --region $region" -ForegroundColor Gray
    exit 1
}

Write-Host "✅ AWS CLI found" -ForegroundColor Green
Write-Host ""

# First, get the current queue settings
Write-Host "📥 Getting current queue settings..." -ForegroundColor Yellow
try {
    $currentQueue = aws mediaconvert get-queue --name $queueName --region $region 2>&1 | ConvertFrom-Json
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host "ERROR: Failed to get queue settings" -ForegroundColor Red
        Write-Host $currentQueue -ForegroundColor Red
        exit 1
    }
    
    Write-Host "✅ Current queue settings retrieved" -ForegroundColor Green
    Write-Host ""
    
} catch {
    Write-Host "ERROR: Failed to parse queue settings" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    exit 1
}

# Build the update command with event notifications
Write-Host "📤 Updating queue with SNS topic..." -ForegroundColor Yellow

# Create the settings JSON
$settingsJson = @{
    EventNotifications = @{
        OnComplete = @{
            SnsTopicArn = $snsTopicArn
        }
        OnError = @{
            SnsTopicArn = $snsTopicArn
        }
    }
} | ConvertTo-Json -Depth 10 -Compress

# Update the queue
try {
    $result = aws mediaconvert update-queue `
        --name $queueName `
        --settings $settingsJson `
        --region $region `
        2>&1
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Queue updated successfully!" -ForegroundColor Green
        Write-Host ""
        Write-Host "Configuration:" -ForegroundColor Cyan
        Write-Host "  ✅ SNS Topic: $snsTopicArn" -ForegroundColor White
        Write-Host "  ✅ Job Complete notifications: Enabled" -ForegroundColor White
        Write-Host "  ✅ Job Error notifications: Enabled" -ForegroundColor White
        Write-Host ""
        Write-Host "🎉 MediaConvert queue is now configured to send notifications to SNS!" -ForegroundColor Green
        Write-Host ""
        Write-Host "Next step: Subscribe your backend endpoint to the SNS topic" -ForegroundColor Yellow
        Write-Host "  See: SUBSCRIBE_BACKEND_TO_SNS.md" -ForegroundColor Gray
        Write-Host ""
    } else {
        Write-Host "ERROR: Failed to update queue" -ForegroundColor Red
        Write-Host $result -ForegroundColor Red
        Write-Host ""
        Write-Host "Troubleshooting:" -ForegroundColor Yellow
        Write-Host "  1. Check AWS credentials are configured (aws configure)" -ForegroundColor White
        Write-Host "  2. Verify you have MediaConvert permissions" -ForegroundColor White
        Write-Host "  3. Check the SNS topic exists and is in the same region" -ForegroundColor White
        exit 1
    }
    
} catch {
    Write-Host "ERROR: Exception occurred" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    exit 1
}

Write-Host "Done! 🚀" -ForegroundColor Green
Write-Host ""

