# Manually Run Database Migrations V34 and V35
# This script runs the migrations directly via SQL

Write-Host "`nRunning Database Migrations V34 & V35 Manually" -ForegroundColor Cyan
Write-Host "===============================================" -ForegroundColor Cyan
Write-Host ""

# Get database connection details
$dbHost = $env:DB_HOST
$dbPort = $env:DB_PORT
$dbName = $env:DB_NAME
$dbUser = $env:DB_USER
$dbPassword = $env:DB_PASSWORD

# Fallback to defaults if not set
if (-not $dbHost) { $dbHost = "church-app-db.cj88a8mwiwbt.us-west-2.rds.amazonaws.com" }
if (-not $dbPort) { $dbPort = "5432" }
if (-not $dbName) { $dbName = "church_app" }
if (-not $dbUser) { $dbUser = "church_user" }

if (-not $dbPassword) {
    Write-Host "ERROR: DB_PASSWORD not set!" -ForegroundColor Red
    Write-Host ""
    Write-Host "   Please set DB_PASSWORD environment variable" -ForegroundColor Yellow
    Write-Host ""
    exit 1
}

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
    exit 1
}

# Set password for psql
$env:PGPASSWORD = $dbPassword

Write-Host "Running Migration V34..." -ForegroundColor Yellow
Write-Host ""

# Read and execute V34 migration
$v34SQL = Get-Content "src\main\resources\db\migration\V34__add_video_thumbnails.sql" -Raw
$v34Result = psql -h $dbHost -p $dbPort -U $dbUser -d $dbName -c $v34SQL 2>&1

if ($LASTEXITCODE -eq 0) {
    Write-Host "[OK] Migration V34 completed successfully" -ForegroundColor Green
} else {
    Write-Host "[ERROR] Migration V34 failed:" -ForegroundColor Red
    Write-Host $v34Result -ForegroundColor Red
}

Write-Host ""
Write-Host "Running Migration V35..." -ForegroundColor Yellow
Write-Host ""

# Read and execute V35 migration
$v35SQL = Get-Content "src\main\resources\db\migration\V35__add_thumbnail_url_to_media_files.sql" -Raw
$v35Result = psql -h $dbHost -p $dbPort -U $dbUser -d $dbName -c $v35SQL 2>&1

if ($LASTEXITCODE -eq 0) {
    Write-Host "[OK] Migration V35 completed successfully" -ForegroundColor Green
} else {
    Write-Host "[ERROR] Migration V35 failed:" -ForegroundColor Red
    Write-Host $v35Result -ForegroundColor Red
}

Write-Host ""
Write-Host "===============================================" -ForegroundColor Cyan
Write-Host "Verifying migrations..." -ForegroundColor Cyan
Write-Host ""

# Verify table exists
$tableCheck = psql -h $dbHost -p $dbPort -U $dbUser -d $dbName -t -c "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'post_media_thumbnail_urls');" 2>&1
if ($LASTEXITCODE -eq 0 -and $tableCheck.Trim() -eq "t") {
    Write-Host "[OK] post_media_thumbnail_urls table exists" -ForegroundColor Green
} else {
    Write-Host "[FAIL] post_media_thumbnail_urls table does not exist" -ForegroundColor Red
}

# Verify column exists
$columnCheck = psql -h $dbHost -p $dbPort -U $dbUser -d $dbName -t -c "SELECT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'media_files' AND column_name = 'thumbnail_url');" 2>&1
if ($LASTEXITCODE -eq 0 -and $columnCheck.Trim() -eq "t") {
    Write-Host "[OK] media_files.thumbnail_url column exists" -ForegroundColor Green
} else {
    Write-Host "[FAIL] media_files.thumbnail_url column does not exist" -ForegroundColor Red
}

# Clean up
Remove-Item Env:\PGPASSWORD -ErrorAction SilentlyContinue

Write-Host ""
Write-Host "Done!" -ForegroundColor Cyan
Write-Host ""

