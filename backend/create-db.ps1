# Simple script to create church_app database
Write-Host ""
Write-Host "Creating church_app database..." -ForegroundColor Cyan
Write-Host ""

$DB_HOST = "church-app-db.cj88a8mwiwbt.us-west-2.rds.amazonaws.com"
$DB_PORT = "5432"
$DB_USER = "church_user"
$NEW_DB = "church_app"

Write-Host "Enter your database password:" -ForegroundColor Yellow
$securePassword = Read-Host -AsSecureString
$BSTR = [System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($securePassword)
$DB_PASSWORD = [System.Runtime.InteropServices.Marshal]::PtrToStringAuto($BSTR)

Write-Host ""
Write-Host "Step 1: Getting PostgreSQL driver..." -ForegroundColor Cyan

# Try to find PostgreSQL driver in Maven repository first
$mavenRepo = "$env:USERPROFILE\.m2\repository"
$postgresJar = (Get-ChildItem -Path "$mavenRepo\org\postgresql\postgresql\*\postgresql-*.jar" -Recurse -ErrorAction SilentlyContinue | Sort-Object LastWriteTime -Descending | Select-Object -First 1).FullName

if (-not $postgresJar) {
    Write-Host "Driver not found in Maven cache. Downloading..." -ForegroundColor Yellow
    
    # Use Maven to get the dependency
    .\mvnw.cmd dependency:get -Dartifact=org.postgresql:postgresql:42.7.4 -DremoteRepositories=central::default::https://repo1.maven.org/maven2 2>&1 | Out-Null
    
    # Try to find it again
    $postgresJar = (Get-ChildItem -Path "$mavenRepo\org\postgresql\postgresql\*\postgresql-*.jar" -Recurse -ErrorAction SilentlyContinue | Sort-Object LastWriteTime -Descending | Select-Object -First 1).FullName
}

if (-not $postgresJar) {
    Write-Host "ERROR: Could not find or download PostgreSQL driver" -ForegroundColor Red
    Write-Host "Trying alternative: Using Maven classpath..." -ForegroundColor Yellow
    
    # Use Maven exec plugin instead
    $mvnClasspath = .\mvnw.cmd dependency:build-classpath -DincludeArtifactIds=postgresql 2>&1 | Select-String -Pattern "C:" | Select-Object -First 1
    
    if ($mvnClasspath) {
        $postgresJar = ($mvnClasspath -split ';' | Where-Object { $_ -like '*postgresql*.jar' } | Select-Object -First 1)
    }
}

if (-not $postgresJar) {
    Write-Host "ERROR: Could not locate PostgreSQL driver" -ForegroundColor Red
    Write-Host "Please ensure Maven can download dependencies." -ForegroundColor Yellow
    exit 1
}

Write-Host "Found driver: $postgresJar" -ForegroundColor Green

Write-Host "Step 2: Compiling Java program..." -ForegroundColor Cyan
javac -cp $postgresJar CreateDatabase.java

if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Failed to compile" -ForegroundColor Red
    exit 1
}

Write-Host "Step 3: Creating database..." -ForegroundColor Cyan
java -cp "$postgresJar;." CreateDatabase $DB_PASSWORD

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "SUCCESS! Database '$NEW_DB' is ready!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Next: Run migrations with:" -ForegroundColor Cyan
    Write-Host "  .\run-migrations-simple.ps1" -ForegroundColor White
} else {
    Write-Host ""
    Write-Host "Failed to create database. Check errors above." -ForegroundColor Red
}

# Cleanup
$DB_PASSWORD = $null
[System.Runtime.InteropServices.Marshal]::ZeroFreeBSTR($BSTR)

