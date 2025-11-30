# Run Flyway Migrations Script
# This script runs database migrations on your RDS PostgreSQL database

Write-Host "`n🗄️  Running Database Migrations`n" -ForegroundColor Cyan
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Gray

# Database configuration
$DB_HOST = "church-app-db.cj88a8mwiwbt.us-west-2.rds.amazonaws.com"
$DB_PORT = "5432"
$DB_NAME = "church_app"
$DB_USER = "church_user"

# Get password securely
Write-Host "`n🔐 Database Password Required`n" -ForegroundColor Yellow
Write-Host "Enter your database password (it won't be displayed):" -ForegroundColor White
$securePassword = Read-Host -AsSecureString
$BSTR = [System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($securePassword)
$DB_PASSWORD = [System.Runtime.InteropServices.Marshal]::PtrToStringAuto($BSTR)

# Build connection URL
$DB_URL = "jdbc:postgresql://${DB_HOST}:${DB_PORT}/${DB_NAME}"

Write-Host "`n📋 Configuration:`n" -ForegroundColor Cyan
Write-Host "  Host: $DB_HOST" -ForegroundColor Gray
Write-Host "  Port: $DB_PORT" -ForegroundColor Gray
Write-Host "  Database: $DB_NAME" -ForegroundColor Gray
Write-Host "  User: $DB_USER" -ForegroundColor Gray
Write-Host "  URL: $DB_URL`n" -ForegroundColor Gray

Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Gray
Write-Host "`n🚀 Running Migrations...`n" -ForegroundColor Cyan

# Run migrations
& mvn flyway:migrate `
    -Dflyway.url=$DB_URL `
    -Dflyway.user=$DB_USER `
    -Dflyway.password=$DB_PASSWORD

$exitCode = $LASTEXITCODE

if ($exitCode -eq 0) {
    Write-Host "`n✅ Migrations completed successfully!`n" -ForegroundColor Green
    
    Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Gray
    Write-Host "`n📊 Checking Migration Status...`n" -ForegroundColor Cyan
    
    # Check migration info
    & mvn flyway:info `
        -Dflyway.url=$DB_URL `
        -Dflyway.user=$DB_USER `
        -Dflyway.password=$DB_PASSWORD
    
    Write-Host "`n✅ Database schema is ready!`n" -ForegroundColor Green
    Write-Host "Next steps:" -ForegroundColor Yellow
    Write-Host "  1. Set up S3 bucket for frontend" -ForegroundColor White
    Write-Host "  2. Set up Elastic Beanstalk for backend" -ForegroundColor White
    Write-Host "  3. Deploy your application!`n" -ForegroundColor White
} else {
    Write-Host "`n❌ Migrations failed with exit code: $exitCode`n" -ForegroundColor Red
    Write-Host "Please check:" -ForegroundColor Yellow
    Write-Host "  • Database is available in RDS console" -ForegroundColor White
    Write-Host "  • Security group allows connections" -ForegroundColor White
    Write-Host "  • Password is correct" -ForegroundColor White
    Write-Host "  • Network connectivity`n" -ForegroundColor White
}

# Clear password from memory
$DB_PASSWORD = $null
$securePassword = $null
[System.Runtime.InteropServices.Marshal]::ZeroFreeBSTR($BSTR)
