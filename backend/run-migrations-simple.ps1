# Simple Migration Script
Write-Host ""
Write-Host "Running Database Migrations" -ForegroundColor Cyan
Write-Host ""

$DB_HOST = "church-app-db.cj88a8mwiwbt.us-west-2.rds.amazonaws.com"
$DB_PORT = "5432"
$DB_NAME = "church_app"
$DB_USER = "church_user"

Write-Host "Enter your database password:" -ForegroundColor Yellow
$securePassword = Read-Host -AsSecureString
$BSTR = [System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($securePassword)
$DB_PASSWORD = [System.Runtime.InteropServices.Marshal]::PtrToStringAuto($BSTR)

$DB_URL = "jdbc:postgresql://${DB_HOST}:${DB_PORT}/${DB_NAME}"

Write-Host ""
Write-Host "Running migrations..." -ForegroundColor Cyan
Write-Host ""

.\mvnw.cmd flyway:migrate "-Dflyway.url=$DB_URL" "-Dflyway.user=$DB_USER" "-Dflyway.password=$DB_PASSWORD"

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "Migrations completed successfully!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Checking migration status..." -ForegroundColor Cyan
    .\mvnw.cmd flyway:info "-Dflyway.url=$DB_URL" "-Dflyway.user=$DB_USER" "-Dflyway.password=$DB_PASSWORD"
} else {
    Write-Host ""
    Write-Host "Migrations failed!" -ForegroundColor Red
    Write-Host ""
}

$DB_PASSWORD = $null
[System.Runtime.InteropServices.Marshal]::ZeroFreeBSTR($BSTR)
