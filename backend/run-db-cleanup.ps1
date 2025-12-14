# Script to run the MediaFile cleanup SQL script
# This removes incorrectly tracked MediaFile records for profile pictures and banner images

param(
    [string]$DB_HOST = $env:DB_HOST,
    [string]$DB_PORT = $env:DB_PORT,
    [string]$DB_NAME = $env:DB_NAME,
    [string]$DB_USER = $env:DB_USER,
    [string]$DB_PASSWORD = $env:DB_PASSWORD
)

# If environment variables not set, use defaults or prompt
if ([string]::IsNullOrEmpty($DB_HOST)) {
    $DB_HOST = Read-Host "Enter DB_HOST (or press Enter for localhost)"
    if ([string]::IsNullOrEmpty($DB_HOST)) { $DB_HOST = "localhost" }
}

if ([string]::IsNullOrEmpty($DB_PORT)) {
    $DB_PORT = Read-Host "Enter DB_PORT (or press Enter for 5433)"
    if ([string]::IsNullOrEmpty($DB_PORT)) { $DB_PORT = "5433" }
}

if ([string]::IsNullOrEmpty($DB_NAME)) {
    $DB_NAME = Read-Host "Enter DB_NAME (or press Enter for church_app)"
    if ([string]::IsNullOrEmpty($DB_NAME)) { $DB_NAME = "church_app" }
}

if ([string]::IsNullOrEmpty($DB_USER)) {
    $DB_USER = Read-Host "Enter DB_USER (or press Enter for church_user)"
    if ([string]::IsNullOrEmpty($DB_USER)) { $DB_USER = "church_user" }
}

if ([string]::IsNullOrEmpty($DB_PASSWORD)) {
    $DB_PASSWORD = Read-Host "Enter DB_PASSWORD" -AsSecureString
    $BSTR = [System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($DB_PASSWORD)
    $DB_PASSWORD = [System.Runtime.InteropServices.Marshal]::PtrToStringAuto($BSTR)
}

Write-Host "`n🔍 Running MediaFile cleanup script...`n" -ForegroundColor Cyan
Write-Host "Database: ${DB_USER}@${DB_HOST}:${DB_PORT}/${DB_NAME}`n" -ForegroundColor Gray

# Check if psql is available
$psqlPath = Get-Command psql -ErrorAction SilentlyContinue
if (-not $psqlPath) {
    Write-Host "❌ psql not found. Please install PostgreSQL client tools." -ForegroundColor Red
    Write-Host "Or run the SQL manually using your database client.`n" -ForegroundColor Yellow
    exit 1
}

# Set PGPASSWORD environment variable for psql
$env:PGPASSWORD = $DB_PASSWORD

$connectionString = "postgresql://${DB_USER}@${DB_HOST}:${DB_PORT}/${DB_NAME}"

# Step 1: Show what will be deleted
Write-Host "📊 Step 1: Checking for incorrectly tracked MediaFile records...`n" -ForegroundColor Yellow

$checkQuery = @"
SELECT 
    folder,
    COUNT(*) as count,
    MIN(created_at) as earliest,
    MAX(created_at) as latest
FROM media_file
WHERE folder IN ('profile-pictures', 'banner-images', 'banners', 'organizations/logos', 'prayer-requests')
GROUP BY folder;
"@

$result = psql $connectionString -t -A -c $checkQuery 2>&1

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Error connecting to database" -ForegroundColor Red
    Write-Host $result -ForegroundColor Red
    exit 1
}

if ([string]::IsNullOrWhiteSpace($result) -or $result -match "0 rows") {
    Write-Host "✅ No incorrectly tracked MediaFile records found. Database is clean!`n" -ForegroundColor Green
    exit 0
}

Write-Host "Found incorrectly tracked records:" -ForegroundColor Yellow
psql $connectionString -c $checkQuery

# Step 2: Confirm deletion
Write-Host "`n⚠️  WARNING: This will delete MediaFile tracking records for:" -ForegroundColor Yellow
Write-Host "   - profile-pictures" -ForegroundColor White
Write-Host "   - banner-images" -ForegroundColor White
Write-Host "   - banners" -ForegroundColor White
Write-Host "   - organizations/logos" -ForegroundColor White
Write-Host "   - prayer-requests" -ForegroundColor White
Write-Host "`nNOTE: This does NOT delete the actual image files in S3!" -ForegroundColor Cyan
Write-Host "It only removes database tracking records that shouldn't exist.`n" -ForegroundColor Cyan

$confirm = Read-Host "Continue? (yes/no)"
if ($confirm -ne "yes") {
    Write-Host "`n❌ Cancelled by user.`n" -ForegroundColor Yellow
    exit 0
}

# Step 3: Delete the records
Write-Host "`n🗑️  Step 2: Deleting incorrectly tracked MediaFile records...`n" -ForegroundColor Yellow

$deleteQuery = @"
DELETE FROM media_file
WHERE folder IN ('profile-pictures', 'banner-images', 'banners', 'organizations/logos', 'prayer-requests');
"@

$deleteResult = psql $connectionString -c $deleteQuery 2>&1

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Error deleting records" -ForegroundColor Red
    Write-Host $deleteResult -ForegroundColor Red
    exit 1
}

Write-Host $deleteResult

# Step 4: Verify deletion
Write-Host "`n✅ Step 3: Verifying deletion...`n" -ForegroundColor Yellow

$verifyQuery = @"
SELECT COUNT(*) as remaining_incorrect_records
FROM media_file
WHERE folder IN ('profile-pictures', 'banner-images', 'banners', 'organizations/logos', 'prayer-requests');
"@

$verifyResult = psql $connectionString -t -A -c $verifyQuery 2>&1

if ($LASTEXITCODE -eq 0 -and $verifyResult -eq "0") {
    Write-Host "✅ Cleanup complete! All incorrectly tracked records have been removed.`n" -ForegroundColor Green
} else {
    Write-Host "⚠️  Warning: Some records may remain. Check the output above.`n" -ForegroundColor Yellow
}

Write-Host "✅ Database cleanup completed!`n" -ForegroundColor Green

