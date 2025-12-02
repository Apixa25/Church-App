# Load .env.local file (or .env as fallback) and set environment variables for PowerShell
# Usage: . .\load-env.ps1

# Try .env.local first, then fallback to .env
$envFile = ".\.env.local"
if (-not (Test-Path $envFile)) {
    $envFile = ".\.env"
}

if (Test-Path $envFile) {
    Write-Host "`nLoading environment variables from $envFile...`n" -ForegroundColor Cyan
    
    Get-Content $envFile | ForEach-Object {
        $line = $_
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
                Write-Host "  [OK] $key" -ForegroundColor Green
            }
        }
    }
    
    Write-Host "`nEnvironment variables loaded!`n" -ForegroundColor Green
    Write-Host "You can now run: .\mvnw.cmd spring-boot:run`n" -ForegroundColor Cyan
} else {
    Write-Host "`nERROR: Neither .env.local nor .env file found!" -ForegroundColor Red
    Write-Host "Create .env.local file and fill in your values:`n" -ForegroundColor Yellow
    Write-Host "   New-Item -Path .env.local -ItemType File" -ForegroundColor White
    Write-Host "   Then edit .env.local with your actual credentials`n" -ForegroundColor White
}
