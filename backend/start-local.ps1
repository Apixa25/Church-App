# Start script that ensures environment variables are loaded and passed to Maven
# Usage: .\start-local.ps1

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "   Starting Church App Backend" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

# Step 1: Load environment variables
Write-Host "Step 1: Loading environment variables..." -ForegroundColor Yellow
. .\load-env.ps1

# Step 2: Verify critical variables
Write-Host "`nStep 2: Verifying environment variables..." -ForegroundColor Yellow

$requiredVars = @("DB_HOST", "DB_PORT", "DB_NAME", "DB_USER", "DB_PASSWORD")
$missingVars = @()

foreach ($var in $requiredVars) {
    $value = [Environment]::GetEnvironmentVariable($var, "Process")
    if ([string]::IsNullOrEmpty($value)) {
        $missingVars += $var
        Write-Host "  ❌ $var is NOT SET" -ForegroundColor Red
    } else {
        if ($var -eq "DB_PASSWORD") {
            Write-Host "  ✅ $var is SET (length: $($value.Length) chars)" -ForegroundColor Green
        } else {
            Write-Host "  ✅ $var = $value" -ForegroundColor Green
        }
    }
}

if ($missingVars.Count -gt 0) {
    Write-Host "`n❌ ERROR: Missing required environment variables!" -ForegroundColor Red
    Write-Host "   Missing: $($missingVars -join ', ')" -ForegroundColor Yellow
    Write-Host "`n   Make sure your .env file has all required variables." -ForegroundColor Yellow
    exit 1
}

# Step 3: Show connection info (without password)
Write-Host "`nStep 3: Database connection info:" -ForegroundColor Yellow
$dbHost = [Environment]::GetEnvironmentVariable("DB_HOST", "Process")
$dbPort = [Environment]::GetEnvironmentVariable("DB_PORT", "Process")
$dbName = [Environment]::GetEnvironmentVariable("DB_NAME", "Process")
$dbUser = [Environment]::GetEnvironmentVariable("DB_USER", "Process")
Write-Host "   Host: $dbHost" -ForegroundColor White
Write-Host "   Port: $dbPort" -ForegroundColor White
Write-Host "   Database: $dbName" -ForegroundColor White
Write-Host "   User: $dbUser" -ForegroundColor White

# Step 4: Start the application
Write-Host "`nStep 4: Starting Spring Boot application...`n" -ForegroundColor Yellow
Write-Host "========================================`n" -ForegroundColor Cyan

# Run Maven with environment variables explicitly passed
.\mvnw.cmd spring-boot:run












