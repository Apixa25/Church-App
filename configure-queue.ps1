# Configure MediaConvert Default Queue with SNS Topic
# Run this script to configure your MediaConvert queue

Write-Host "`n🎬 Configuring MediaConvert Queue with SNS" -ForegroundColor Cyan
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host ""

# Configuration
$queueName = "Default"
$snsTopicArn = "arn:aws:sns:us-west-2:060163370478:mediaconvert-job-completion"
$region = "us-west-2"

Write-Host "Configuration:" -ForegroundColor Yellow
Write-Host "  Queue: $queueName" -ForegroundColor White
Write-Host "  SNS Topic: $snsTopicArn" -ForegroundColor White
Write-Host "  Region: $region" -ForegroundColor White
Write-Host ""

# Check AWS CLI
Write-Host "Checking AWS CLI..." -ForegroundColor Yellow
try {
    $awsVersion = aws --version 2>&1
    Write-Host "✅ AWS CLI found: $awsVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ AWS CLI not found!" -ForegroundColor Red
    Write-Host ""
    Write-Host "Please install AWS CLI first:" -ForegroundColor Yellow
    Write-Host "  https://aws.amazon.com/cli/" -ForegroundColor Cyan
    exit 1
}

Write-Host ""

# Build settings JSON
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

Write-Host "Updating queue..." -ForegroundColor Yellow
Write-Host ""

# Run the command
$result = aws mediaconvert update-queue `
    --name $queueName `
    --settings $settingsJson `
    --region $region `
    2>&1

$exitCode = $LASTEXITCODE

if ($exitCode -eq 0) {
    Write-Host "✅ SUCCESS! Queue configured!" -ForegroundColor Green
    Write-Host ""
    
    # Verify
    Write-Host "Verifying configuration..." -ForegroundColor Yellow
    $verify = aws mediaconvert get-queue --name $queueName --region $region --query 'Queue.EventNotifications' --output json 2>&1
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Verification successful!" -ForegroundColor Green
        Write-Host ""
        Write-Host "Event Notifications:" -ForegroundColor Cyan
        Write-Host $verify -ForegroundColor White
        Write-Host ""
    }
    
    Write-Host "🎉 MediaConvert queue is now configured!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Next step: Subscribe your backend endpoint to SNS" -ForegroundColor Yellow
    Write-Host "  See: SUBSCRIBE_BACKEND_TO_SNS.md" -ForegroundColor Gray
    
} else {
    Write-Host "❌ Error configuring queue" -ForegroundColor Red
    Write-Host ""
    Write-Host "Exit code: $exitCode" -ForegroundColor Yellow
    Write-Host "Output:" -ForegroundColor Yellow
    Write-Host $result -ForegroundColor Red
    Write-Host ""
    Write-Host "Troubleshooting:" -ForegroundColor Yellow
    Write-Host "  1. Check AWS credentials: aws configure list" -ForegroundColor White
    Write-Host "  2. Verify SNS topic exists: aws sns get-topic-attributes --topic-arn $snsTopicArn" -ForegroundColor White
    Write-Host "  3. Check MediaConvert permissions" -ForegroundColor White
}

Write-Host ""

