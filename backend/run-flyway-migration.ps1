# Run Flyway Migration Script
# This script loads environment variables from .env and runs Flyway migration

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "  Flyway Migration Runner" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

# Navigate to project root to find .env file
$projectRoot = Split-Path -Parent $PSScriptRoot
$envFile = Join-Path $projectRoot ".env"

if (-not (Test-Path $envFile)) {
    Write-Host "ERROR: .env file not found at: $envFile" -ForegroundColor Red
    exit 1
}

Write-Host "Loading environment variables from .env file...`n" -ForegroundColor Yellow

# Load environment variables from .env file
Get-Content $envFile | ForEach-Object {
    $line = $_.Trim()
    # Skip comments and empty lines
    if ($line -and $line -notmatch '^\s*#') {
        if ($line -match '^\s*([^#][^=]*)\s*=\s*(.*)$') {
            $key = $matches[1].Trim()
            $value = $matches[2].Trim()
            
            # Remove quotes if present
            if ($value.StartsWith('"') -and $value.EndsWith('"')) {
                $value = $value.Substring(1, $value.Length - 2)
            } elseif ($value.StartsWith("'") -and $value.EndsWith("'")) {
                $value = $value.Substring(1, $value.Length - 2)
            }
            
            # Set environment variable for current process
            [Environment]::SetEnvironmentVariable($key, $value, "Process")
            Write-Host "  [OK] Loaded: $key" -ForegroundColor Green
        }
    }
}

Write-Host "`nVerifying database connection variables...`n" -ForegroundColor Yellow

# Check if required variables are set
$requiredVars = @("DB_URL", "DB_USER", "DB_PASSWORD")
$missingVars = @()

foreach ($var in $requiredVars) {
    $value = [Environment]::GetEnvironmentVariable($var, "Process")
    if ([string]::IsNullOrEmpty($value)) {
        $missingVars += $var
        Write-Host "  [MISSING] $var" -ForegroundColor Red
    } else {
        if ($var -eq "DB_PASSWORD") {
            Write-Host "  [OK] $var = ********" -ForegroundColor Green
        } else {
            Write-Host "  [OK] $var = $value" -ForegroundColor Green
        }
    }
}

if ($missingVars.Count -gt 0) {
    Write-Host "`nERROR: Missing required environment variables: $($missingVars -join ', ')" -ForegroundColor Red
    exit 1
}

# Get database connection details
$dbUrl = [Environment]::GetEnvironmentVariable("DB_URL", "Process")
$dbUser = [Environment]::GetEnvironmentVariable("DB_USER", "Process")
$dbPassword = [Environment]::GetEnvironmentVariable("DB_PASSWORD", "Process")

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "  Running Flyway Migration" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

Write-Host "Target Database: $dbUrl" -ForegroundColor Yellow
Write-Host "User: $dbUser`n" -ForegroundColor Yellow

# Change to backend directory
Set-Location $PSScriptRoot

# Run Flyway migration
Write-Host "Executing: .\mvnw.cmd flyway:migrate`n" -ForegroundColor Cyan

.\mvnw.cmd flyway:migrate `
    -Ddb.url="$dbUrl" `
    -Ddb.user="$dbUser" `
    -Ddb.password="$dbPassword"

$exitCode = $LASTEXITCODE

if ($exitCode -eq 0) {
    Write-Host "`n========================================" -ForegroundColor Green
    Write-Host "  Migration Completed Successfully!" -ForegroundColor Green
    Write-Host "========================================`n" -ForegroundColor Green
} else {
    Write-Host "`n========================================" -ForegroundColor Red
    Write-Host "  Migration Failed (Exit Code: $exitCode)" -ForegroundColor Red
    Write-Host "========================================`n" -ForegroundColor Red
}

exit $exitCode
