# Script to check and restore profile pictures and banner images for specific users

param(
    [string]$DB_HOST = "church-app-db.cj88a8mwiwbt.us-west-2.rds.amazonaws.com",
    [string]$DB_PORT = "5432",
    [string]$DB_NAME = "church_app",
    [string]$DB_USER = "church_user",
    [string]$DB_PASSWORD = "Z.jS~w]fvv[W-TyYhB8TlTD_fEG2"
)

$env:PGPASSWORD = $DB_PASSWORD

Write-Host "Checking database for users..." -ForegroundColor Cyan

$connectionString = "postgresql://${DB_USER}@${DB_HOST}:${DB_PORT}/${DB_NAME}"
$query = "SELECT id, name, email, profile_pic_url, banner_image_url FROM users WHERE name ILIKE '%sheena%' OR name ILIKE '%tuohy%' OR name ILIKE '%justin%' OR name ILIKE '%terry%' OR name ILIKE '%sills%' ORDER BY name;"

$dbResult = psql $connectionString -c $query 2>&1
Write-Host $dbResult

Write-Host "`nChecking S3 for profile pictures..." -ForegroundColor Cyan
aws s3 ls s3://church-app-uploads-stevensills2/profile-pictures/originals/ --recursive

Write-Host "`nChecking S3 for banner images..." -ForegroundColor Cyan
aws s3 ls s3://church-app-uploads-stevensills2/banners/originals/ --recursive
aws s3 ls s3://church-app-uploads-stevensills2/banner-images/originals/ --recursive

