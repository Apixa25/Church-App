# Verify Database Migrations V34 and V35
# Checks if video thumbnail migrations ran successfully

Write-Host "`nVerifying Database Migrations V34 & V35" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Load environment variables if .env exists
if (Test-Path ".env") {
    Write-Host "Loading environment variables from .env..." -ForegroundColor Yellow
    Get-Content .env | ForEach-Object {
        if ($_ -match '^\s*([^#][^=]+)=(.*)$') {
            $key = $matches[1].Trim()
            $value = $matches[2].Trim()
            [Environment]::SetEnvironmentVariable($key, $value, "Process")
        }
    }
}

# Get database connection details
$dbHost = $env:DB_HOST
$dbPort = $env:DB_PORT
$dbName = $env:DB_NAME
$dbUser = $env:DB_USER
$dbPassword = $env:DB_PASSWORD

# Fallback to defaults if not set
if (-not $dbHost) { $dbHost = "localhost" }
if (-not $dbPort) { $dbPort = "5432" }
if (-not $dbName) { $dbName = "church_app" }
if (-not $dbUser) { $dbUser = "church_user" }

Write-Host "Database Connection:" -ForegroundColor Cyan
Write-Host "   Host: $dbHost" -ForegroundColor White
Write-Host "   Port: $dbPort" -ForegroundColor White
Write-Host "   Database: $dbName" -ForegroundColor White
Write-Host "   User: $dbUser" -ForegroundColor White
Write-Host ""

# Check if psql is available
$psqlPath = Get-Command psql -ErrorAction SilentlyContinue
if (-not $psqlPath) {
    Write-Host "ERROR: psql (PostgreSQL client) not found!" -ForegroundColor Red
    Write-Host ""
    Write-Host "   Please install PostgreSQL client tools:" -ForegroundColor Yellow
    Write-Host "   https://www.postgresql.org/download/windows/" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "   OR use AWS RDS Query Editor or pgAdmin to run these queries:" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "   Query 1: Check if post_media_thumbnail_urls table exists" -ForegroundColor White
    Write-Host "   SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'post_media_thumbnail_urls');" -ForegroundColor Gray
    Write-Host ""
    Write-Host "   Query 2: Check if media_files.thumbnail_url column exists" -ForegroundColor White
    Write-Host "   SELECT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'media_files' AND column_name = 'thumbnail_url');" -ForegroundColor Gray
    Write-Host ""
    Write-Host "   Query 3: Check Flyway migration history" -ForegroundColor White
    Write-Host "   SELECT version, description, installed_on FROM flyway_schema_history WHERE version IN ('34', '35') ORDER BY installed_on DESC;" -ForegroundColor Gray
    Write-Host ""
    exit 1
}

if (-not $dbPassword) {
    Write-Host "ERROR: DB_PASSWORD not set!" -ForegroundColor Red
    Write-Host ""
    Write-Host "   Please set DB_PASSWORD environment variable or add it to .env file" -ForegroundColor Yellow
    Write-Host ""
    exit 1
}

# Set password for psql
$env:PGPASSWORD = $dbPassword

Write-Host "Checking migrations..." -ForegroundColor Cyan
Write-Host ""

# Initialize result variables
$tableExists = $false
$columnExists = $false

# Query 1: Check if post_media_thumbnail_urls table exists
Write-Host "1. Checking if 'post_media_thumbnail_urls' table exists..." -ForegroundColor Yellow
$tableCheck = psql -h $dbHost -p $dbPort -U $dbUser -d $dbName -t -c "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'post_media_thumbnail_urls');" 2>&1

if ($LASTEXITCODE -eq 0) {
    $tableExists = $tableCheck.Trim() -eq "t"
    if ($tableExists) {
        Write-Host "   [OK] Table 'post_media_thumbnail_urls' EXISTS" -ForegroundColor Green
    } else {
        Write-Host "   [FAIL] Table 'post_media_thumbnail_urls' DOES NOT EXIST" -ForegroundColor Red
    }
} else {
    Write-Host "   [ERROR] Error checking table: $tableCheck" -ForegroundColor Red
}

Write-Host ""

# Query 2: Check if media_files.thumbnail_url column exists
Write-Host "2. Checking if 'media_files.thumbnail_url' column exists..." -ForegroundColor Yellow
$columnCheck = psql -h $dbHost -p $dbPort -U $dbUser -d $dbName -t -c "SELECT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'media_files' AND column_name = 'thumbnail_url');" 2>&1

if ($LASTEXITCODE -eq 0) {
    $columnExists = $columnCheck.Trim() -eq "t"
    if ($columnExists) {
        Write-Host "   [OK] Column 'media_files.thumbnail_url' EXISTS" -ForegroundColor Green
    } else {
        Write-Host "   [FAIL] Column 'media_files.thumbnail_url' DOES NOT EXIST" -ForegroundColor Red
    }
} else {
    Write-Host "   [ERROR] Error checking column: $columnCheck" -ForegroundColor Red
}

Write-Host ""

# Query 3: Check Flyway migration history
Write-Host "3. Checking Flyway migration history for V34 and V35..." -ForegroundColor Yellow
$flywayCheck = psql -h $dbHost -p $dbPort -U $dbUser -d $dbName -c "SELECT version, description, installed_on FROM flyway_schema_history WHERE version IN ('34', '35') ORDER BY installed_on DESC;" 2>&1

if ($LASTEXITCODE -eq 0) {
    if ($flywayCheck -match "34|35") {
        Write-Host "   [OK] Found migration records:" -ForegroundColor Green
        Write-Host $flywayCheck -ForegroundColor Gray
    } else {
        Write-Host "   [FAIL] No migration records found for V34 or V35" -ForegroundColor Red
        Write-Host "   This means the migrations have NOT run yet" -ForegroundColor Yellow
    }
} else {
    Write-Host "   [ERROR] Error checking Flyway history: $flywayCheck" -ForegroundColor Red
}

Write-Host ""

# Summary
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Summary:" -ForegroundColor Cyan
Write-Host ""

if ($tableExists -and $columnExists) {
    Write-Host "[SUCCESS] Both migrations appear to have run!" -ForegroundColor Green
    Write-Host "   - post_media_thumbnail_urls table exists" -ForegroundColor White
    Write-Host "   - media_files.thumbnail_url column exists" -ForegroundColor White
    Write-Host ""
    Write-Host "Phase 2 video thumbnail infrastructure is ready!" -ForegroundColor Green
} else {
    Write-Host "[WARNING] Migrations may not have run yet" -ForegroundColor Yellow
    Write-Host ""
    if (-not $tableExists) {
        Write-Host "   [MISSING] post_media_thumbnail_urls table" -ForegroundColor Red
    }
    if (-not $columnExists) {
        Write-Host "   [MISSING] media_files.thumbnail_url column" -ForegroundColor Red
    }
    Write-Host ""
    Write-Host "Next steps:" -ForegroundColor Cyan
    Write-Host "   1. Check application logs for Flyway migration messages" -ForegroundColor White
    Write-Host "   2. Verify migrations are in the JAR file" -ForegroundColor White
    Write-Host "   3. Restart the application to trigger migrations" -ForegroundColor White
}

# Clean up
Remove-Item Env:\PGPASSWORD -ErrorAction SilentlyContinue

Write-Host ""
