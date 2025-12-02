# Load .env file and set environment variables for PowerShell
# Usage: . .\load-env.ps1

$envFile = ".\.env"
if (Test-Path $envFile) {
    Write-Host "`n📝 Loading environment variables from .env file...`n" -ForegroundColor Cyan
    
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
                Write-Host "  ✅ $key" -ForegroundColor Green
            }
        }
    }
    
    Write-Host "`n✅ Environment variables loaded!`n" -ForegroundColor Green
    Write-Host "🚀 You can now run: .\mvnw.cmd spring-boot:run`n" -ForegroundColor Cyan
} else {
    Write-Host "`n❌ .env file not found at: $envFile" -ForegroundColor Red
    Write-Host "📝 Copy .env.example to .env and fill in your values:`n" -ForegroundColor Yellow
    Write-Host "   Copy-Item .env.example .env" -ForegroundColor White
    Write-Host "   Then edit .env with your actual credentials`n" -ForegroundColor White
}
