# 🔍 Find Your Elastic Beanstalk Application and Environment Names
# Run this script to discover your EB application and environment names

param(
    [Parameter(Mandatory=$false)]
    [string]$Region = "us-west-2"  # Update this with your AWS region
)

Write-Host "`n🔍 Finding your Elastic Beanstalk applications and environments...`n" -ForegroundColor Cyan

# List all applications
Write-Host "📋 Applications:" -ForegroundColor Yellow
aws elasticbeanstalk describe-applications --region $Region --query 'Applications[*].[ApplicationName,DateCreated]' --output table

Write-Host "`n📋 Environments:" -ForegroundColor Yellow
aws elasticbeanstalk describe-environments --region $Region --query 'Environments[*].[ApplicationName,EnvironmentName,Status,Health]' --output table

Write-Host "`n💡 Use these names in the deployment script:`n" -ForegroundColor Cyan
Write-Host "   -ApplicationName <application-name>" -ForegroundColor White
Write-Host "   -EnvironmentName <environment-name>" -ForegroundColor White
Write-Host "   -Region $Region`n" -ForegroundColor White

