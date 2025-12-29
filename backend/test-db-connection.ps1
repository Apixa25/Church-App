# Test database connection with current environment variables
# This helps verify if the password is correct

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "   Database Connection Test" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

# Load environment variables
. .\load-env.ps1

$dbHost = [Environment]::GetEnvironmentVariable("DB_HOST", "Process")
$dbPort = [Environment]::GetEnvironmentVariable("DB_PORT", "Process")
$dbName = [Environment]::GetEnvironmentVariable("DB_NAME", "Process")
$dbUser = [Environment]::GetEnvironmentVariable("DB_USER", "Process")
$dbPassword = [Environment]::GetEnvironmentVariable("DB_PASSWORD", "Process")

Write-Host "Connection Details:" -ForegroundColor Yellow
Write-Host "  Host: $dbHost" -ForegroundColor White
Write-Host "  Port: $dbPort" -ForegroundColor White
Write-Host "  Database: $dbName" -ForegroundColor White
Write-Host "  User: $dbUser" -ForegroundColor White
Write-Host "  Password: " -NoNewline -ForegroundColor White
if ($dbPassword) {
    Write-Host "SET (length: $($dbPassword.Length) chars)" -ForegroundColor Green
    Write-Host "  First 3 chars: $($dbPassword.Substring(0, [Math]::Min(3, $dbPassword.Length)))..." -ForegroundColor Gray
    Write-Host "  Last 3 chars: ...$($dbPassword.Substring([Math]::Max(0, $dbPassword.Length - 3)))" -ForegroundColor Gray
} else {
    Write-Host "NOT SET" -ForegroundColor Red
}

Write-Host "`nTesting connection..." -ForegroundColor Yellow

# Check if psql is available
$psqlPath = Get-Command psql -ErrorAction SilentlyContinue
if (-not $psqlPath) {
    Write-Host "`n⚠️  psql not found. Install PostgreSQL client tools to test connection." -ForegroundColor Yellow
    Write-Host "   Or verify the password matches your RDS database password." -ForegroundColor Yellow
    Write-Host "`n   Current database: $dbHost" -ForegroundColor Cyan
    if ($dbHost -like "*localhost*" -or $dbHost -like "*127.0.0.1*") {
        Write-Host "   ⚠️  You're connecting to LOCALHOST!" -ForegroundColor Red
        Write-Host "   Make sure you have a local PostgreSQL database running," -ForegroundColor Yellow
        Write-Host "   OR change DB_HOST in .env to your AWS RDS endpoint." -ForegroundColor Yellow
    } else {
        Write-Host "   ✅ Connecting to AWS RDS: $dbHost" -ForegroundColor Green
    }
} else {
    # Try to connect
    $env:PGPASSWORD = $dbPassword
    $connectionString = "host=$dbHost port=$dbPort dbname=$dbName user=$dbUser"
    
    Write-Host "   Attempting connection..." -ForegroundColor White
    $result = psql -h $dbHost -p $dbPort -U $dbUser -d $dbName -c "SELECT version();" 2>&1
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "`n✅ CONNECTION SUCCESSFUL!" -ForegroundColor Green
        Write-Host "   Password is correct!" -ForegroundColor Green
    } else {
        Write-Host "`n❌ CONNECTION FAILED!" -ForegroundColor Red
        Write-Host "   Error: $result" -ForegroundColor Red
        Write-Host "`n   Possible issues:" -ForegroundColor Yellow
        Write-Host "   1. Password is incorrect" -ForegroundColor White
        Write-Host "   2. Database doesn't exist" -ForegroundColor White
        Write-Host "   3. User doesn't have access" -ForegroundColor White
        Write-Host "   4. Network/firewall blocking connection" -ForegroundColor White
    }
    
    Remove-Item Env:\PGPASSWORD -ErrorAction SilentlyContinue
}

Write-Host ""




















