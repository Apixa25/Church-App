# Diagnostic script to check database password configuration
# This helps identify if Spring Boot is reading the password correctly

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "   Database Password Diagnostic Tool" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

# Check if .env file exists
$envFile = ".\.env.local"
if (-not (Test-Path $envFile)) {
    $envFile = ".\.env"
}

if (Test-Path $envFile) {
    Write-Host "✅ Found .env file: $envFile" -ForegroundColor Green
    
    # Read DB_PASSWORD from .env file
    $envContent = Get-Content $envFile
    $dbPasswordFromFile = $null
    foreach ($line in $envContent) {
        if ($line -match '^\s*DB_PASSWORD\s*=\s*(.+)$') {
            $dbPasswordFromFile = $matches[1].Trim()
            # Remove quotes if present
            if ($dbPasswordFromFile.StartsWith('"') -and $dbPasswordFromFile.EndsWith('"')) {
                $dbPasswordFromFile = $dbPasswordFromFile.Substring(1, $dbPasswordFromFile.Length - 2)
            } elseif ($dbPasswordFromFile.StartsWith("'") -and $dbPasswordFromFile.EndsWith("'")) {
                $dbPasswordFromFile = $dbPasswordFromFile.Substring(1, $dbPasswordFromFile.Length - 2)
            }
            break
        }
    }
    
    if ($dbPasswordFromFile) {
        Write-Host "`n📝 Password in .env file:" -ForegroundColor Yellow
        Write-Host "   Length: $($dbPasswordFromFile.Length) characters" -ForegroundColor White
        Write-Host "   First 3 chars: $($dbPasswordFromFile.Substring(0, [Math]::Min(3, $dbPasswordFromFile.Length)))..." -ForegroundColor White
        Write-Host "   Last 3 chars: ...$($dbPasswordFromFile.Substring([Math]::Max(0, $dbPasswordFromFile.Length - 3)))" -ForegroundColor White
    } else {
        Write-Host "`n❌ DB_PASSWORD not found in .env file!" -ForegroundColor Red
    }
} else {
    Write-Host "❌ No .env file found!" -ForegroundColor Red
    Write-Host "   Expected: .env.local or .env in backend directory" -ForegroundColor Yellow
}

# Check environment variable (if loaded)
$envPassword = [Environment]::GetEnvironmentVariable("DB_PASSWORD", "Process")
if ($envPassword) {
    Write-Host "`n✅ DB_PASSWORD environment variable is SET" -ForegroundColor Green
    Write-Host "   Length: $($envPassword.Length) characters" -ForegroundColor White
    Write-Host "   First 3 chars: $($envPassword.Substring(0, [Math]::Min(3, $envPassword.Length)))..." -ForegroundColor White
    Write-Host "   Last 3 chars: ...$($envPassword.Substring([Math]::Max(0, $envPassword.Length - 3)))" -ForegroundColor White
    
    # Compare with .env file
    if ($dbPasswordFromFile -and $envPassword -eq $dbPasswordFromFile) {
        Write-Host "`n✅ PASSWORDS MATCH between .env file and environment variable" -ForegroundColor Green
    } elseif ($dbPasswordFromFile) {
        Write-Host "`n⚠️  PASSWORDS DO NOT MATCH!" -ForegroundColor Red
        Write-Host "   .env file password length: $($dbPasswordFromFile.Length)" -ForegroundColor Yellow
        Write-Host "   Environment variable length: $($envPassword.Length)" -ForegroundColor Yellow
        Write-Host "`n   💡 Solution: Run '. .\load-env.ps1' to load .env file into environment" -ForegroundColor Cyan
    }
} else {
    Write-Host "`n❌ DB_PASSWORD environment variable is NOT SET" -ForegroundColor Red
    Write-Host "`n   💡 Solution: Run '. .\load-env.ps1' to load .env file" -ForegroundColor Cyan
}

# Check application.properties
$appPropsPath = "src\main\resources\application.properties"
if (Test-Path $appPropsPath) {
    Write-Host "`n📄 application.properties configuration:" -ForegroundColor Yellow
    $appProps = Get-Content $appPropsPath
    $passwordLine = $appProps | Where-Object { $_ -match 'spring\.datasource\.password' }
    if ($passwordLine) {
        Write-Host "   $passwordLine" -ForegroundColor White
        if ($passwordLine -match '\$\{DB_PASSWORD:([^}]+)\}') {
            $fallbackPassword = $matches[1]
            Write-Host "   Fallback password: $fallbackPassword" -ForegroundColor Gray
        }
    }
} else {
    Write-Host "`n❌ application.properties not found at: $appPropsPath" -ForegroundColor Red
}

# Summary and recommendations
Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "   Summary and Recommendations" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

if (-not $envPassword) {
    Write-Host "⚠️  ACTION REQUIRED:" -ForegroundColor Yellow
    Write-Host "   1. Make sure your .env file has DB_PASSWORD set" -ForegroundColor White
    Write-Host "   2. Run: . .\load-env.ps1" -ForegroundColor White
    Write-Host "   3. Then run: .\mvnw.cmd spring-boot:run" -ForegroundColor White
} elseif ($dbPasswordFromFile -and $envPassword -ne $dbPasswordFromFile) {
    Write-Host "⚠️  ACTION REQUIRED:" -ForegroundColor Yellow
    Write-Host "   Environment variable does not match .env file" -ForegroundColor White
    Write-Host "   Run: . .\load-env.ps1 to reload" -ForegroundColor White
} else {
    Write-Host "✅ Configuration looks good!" -ForegroundColor Green
    Write-Host "   Spring Boot should use the DB_PASSWORD environment variable" -ForegroundColor White
}

Write-Host ""

