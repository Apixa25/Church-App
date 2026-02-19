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
    
    # Check if the application port is already in use
    $appPort = [Environment]::GetEnvironmentVariable("PORT", "Process")
    if ([string]::IsNullOrEmpty($appPort)) {
        $appPort = "8083"  # Default port
    }
    
    Write-Host "Checking if port $appPort is available...`n" -ForegroundColor Cyan
    
    $portInUse = Get-NetTCPConnection -LocalPort $appPort -State Listen -ErrorAction SilentlyContinue
    if ($portInUse) {
        $processId = $portInUse.OwningProcess
        $process = Get-Process -Id $processId -ErrorAction SilentlyContinue
        
        Write-Host "  [WARNING] Port $appPort is already in use!" -ForegroundColor Yellow
        if ($process) {
            Write-Host "  Process: $($process.ProcessName) (PID: $processId)" -ForegroundColor Yellow
            Write-Host "  Memory: $([math]::Round($process.WorkingSet64 / 1MB, 2)) MB" -ForegroundColor Yellow
        } else {
            Write-Host "  Process ID: $processId (process details unavailable)" -ForegroundColor Yellow
        }
        
        Write-Host "`n  Would you like to kill this process? (Y/N): " -ForegroundColor Cyan -NoNewline
        $response = Read-Host
        
        if ($response -eq 'Y' -or $response -eq 'y') {
            try {
                Stop-Process -Id $processId -Force -ErrorAction Stop
                Write-Host "  [OK] Process $processId terminated successfully!`n" -ForegroundColor Green
                Start-Sleep -Seconds 1  # Brief pause to let port release
            } catch {
                Write-Host "  [ERROR] Failed to kill process: $_`n" -ForegroundColor Red
            }
        } else {
            Write-Host "  [INFO] Process left running. You may need to stop it manually or use a different port.`n" -ForegroundColor Yellow
        }
    } else {
        Write-Host "  [OK] Port $appPort is available!`n" -ForegroundColor Green
    }
    
    Write-Host "You can now run: .\mvnw.cmd spring-boot:run`n" -ForegroundColor Cyan
} else {
    Write-Host "`nERROR: Neither .env.local nor .env file found!" -ForegroundColor Red
    Write-Host "Create .env.local file and fill in your values:`n" -ForegroundColor Yellow
    Write-Host "   New-Item -Path .env.local -ItemType File" -ForegroundColor White
    Write-Host "   Then edit .env.local with your actual credentials`n" -ForegroundColor White
}
