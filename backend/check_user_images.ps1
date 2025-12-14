# Script to check if user profile pictures and banner images exist in S3
# and verify their URLs in the database

param(
    [string]$DB_HOST = "localhost",
    [string]$DB_PORT = "5433",
    [string]$DB_NAME = "church_app",
    [string]$DB_USER = "church_user",
    [string]$DB_PASSWORD = $env:DB_PASSWORD
)

Write-Host "🔍 Checking user images in S3 and database..." -ForegroundColor Cyan

# Check if psql is available
$psqlPath = Get-Command psql -ErrorAction SilentlyContinue
if (-not $psqlPath) {
    Write-Host "❌ psql not found. Please install PostgreSQL client tools." -ForegroundColor Red
    exit 1
}

# Set PGPASSWORD environment variable for psql
$env:PGPASSWORD = $DB_PASSWORD

$connectionString = "postgresql://${DB_USER}@${DB_HOST}:${DB_PORT}/${DB_NAME}"

Write-Host "`n📊 Checking database for users with profile pictures..." -ForegroundColor Yellow
$query = @"
SELECT 
    id,
    name,
    email,
    profile_pic_url,
    banner_image_url,
    CASE 
        WHEN profile_pic_url IS NOT NULL AND profile_pic_url != '' THEN 'Has Profile Pic'
        ELSE 'No Profile Pic'
    END as profile_status,
    CASE 
        WHEN banner_image_url IS NOT NULL AND banner_image_url != '' THEN 'Has Banner'
        ELSE 'No Banner'
    END as banner_status
FROM users
WHERE name IN ('Sheena Toohey', 'Terry Sills')
   OR email LIKE '%sheena%'
   OR email LIKE '%terry%'
ORDER BY name;
"@

Write-Host "Querying database..." -ForegroundColor Gray
psql $connectionString -c $query

Write-Host "`n📦 Checking S3 for profile pictures..." -ForegroundColor Yellow
aws s3 ls s3://church-app-uploads-stevensills2/profile-pictures/originals/ --recursive | Select-Object -First 10

Write-Host "`n📦 Checking S3 for banner images (banners folder)..." -ForegroundColor Yellow
aws s3 ls s3://church-app-uploads-stevensills2/banners/originals/ --recursive | Select-Object -First 10

Write-Host "`n📦 Checking S3 for banner images (banner-images folder)..." -ForegroundColor Yellow
aws s3 ls s3://church-app-uploads-stevensills2/banner-images/originals/ --recursive | Select-Object -First 10

Write-Host "`n✅ Check complete!" -ForegroundColor Green

