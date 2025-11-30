# AWS CLI Installation Script for Windows
# This script downloads and installs AWS CLI v2

Write-Host "`n🚀 AWS CLI Installation Script`n" -ForegroundColor Cyan
Write-Host "This will install AWS CLI v2 on your system.`n" -ForegroundColor Yellow

# Check if already installed
try {
    $existingVersion = aws --version 2>&1
    Write-Host "✅ AWS CLI is already installed!" -ForegroundColor Green
    Write-Host "Version: $existingVersion`n" -ForegroundColor Yellow
    $continue = Read-Host "Do you want to reinstall? (y/n)"
    if ($continue -ne "y" -and $continue -ne "Y") {
        Write-Host "`nInstallation cancelled. Exiting.`n" -ForegroundColor Yellow
        exit 0
    }
} catch {
    Write-Host "AWS CLI not found. Proceeding with installation...`n" -ForegroundColor Yellow
}

# Set download URL and paths
$downloadUrl = "https://awscli.amazonaws.com/AWSCLIV2.msi"
$tempPath = $env:TEMP
$installerPath = Join-Path $tempPath "AWSCLIV2.msi"

Write-Host "📥 Step 1: Downloading AWS CLI installer...`n" -ForegroundColor Cyan
Write-Host "Source: $downloadUrl" -ForegroundColor Gray
Write-Host "Destination: $installerPath`n" -ForegroundColor Gray

try {
    # Download the installer
    Invoke-WebRequest -Uri $downloadUrl -OutFile $installerPath -UseBasicParsing
    Write-Host "✅ Download complete!`n" -ForegroundColor Green
} catch {
    Write-Host "❌ Error downloading AWS CLI installer!" -ForegroundColor Red
    Write-Host "Error: $_`n" -ForegroundColor Red
    Write-Host "Please try downloading manually from:" -ForegroundColor Yellow
    Write-Host "https://awscli.amazonaws.com/AWSCLIV2.msi`n" -ForegroundColor Cyan
    exit 1
}

# Check if file was downloaded
if (-not (Test-Path $installerPath)) {
    Write-Host "❌ Installer file not found at: $installerPath" -ForegroundColor Red
    exit 1
}

$fileSize = (Get-Item $installerPath).Length / 1MB
Write-Host "📦 Installer size: $([math]::Round($fileSize, 2)) MB`n" -ForegroundColor Yellow

Write-Host "🔧 Step 2: Installing AWS CLI...`n" -ForegroundColor Cyan
Write-Host "This may take a few minutes. Please wait...`n" -ForegroundColor Yellow

try {
    # Install silently
    $process = Start-Process -FilePath "msiexec.exe" `
        -ArgumentList "/i `"$installerPath`" /quiet /norestart" `
        -Wait `
        -PassThru `
        -NoNewWindow
    
    if ($process.ExitCode -eq 0) {
        Write-Host "✅ Installation complete!`n" -ForegroundColor Green
    } else {
        Write-Host "⚠️  Installation completed with exit code: $($process.ExitCode)" -ForegroundColor Yellow
        Write-Host "This might be normal. Let's verify...`n" -ForegroundColor Yellow
    }
} catch {
    Write-Host "❌ Error during installation!" -ForegroundColor Red
    Write-Host "Error: $_`n" -ForegroundColor Red
    Write-Host "You may need to run this script as Administrator." -ForegroundColor Yellow
    Write-Host "Or install manually by running: $installerPath`n" -ForegroundColor Yellow
    exit 1
}

# Clean up installer
Write-Host "🧹 Cleaning up installer file...`n" -ForegroundColor Cyan
try {
    Remove-Item $installerPath -Force -ErrorAction SilentlyContinue
    Write-Host "✅ Cleanup complete!`n" -ForegroundColor Green
} catch {
    Write-Host "⚠️  Could not remove installer (not critical): $_`n" -ForegroundColor Yellow
}

# Refresh environment variables
Write-Host "🔄 Refreshing environment variables...`n" -ForegroundColor Cyan
$env:Path = [System.Environment]::GetEnvironmentVariable("Path", "Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path", "User")

# Verify installation
Write-Host "✅ Step 3: Verifying installation...`n" -ForegroundColor Cyan

# Wait a moment for PATH to update
Start-Sleep -Seconds 2

try {
    # Try to find AWS CLI in common locations
    $awsPaths = @(
        "$env:ProgramFiles\Amazon\AWSCLIV2\aws.exe",
        "${env:ProgramFiles(x86)}\Amazon\AWSCLIV2\aws.exe",
        "$env:LOCALAPPDATA\Programs\Amazon\AWSCLIV2\aws.exe"
    )
    
    $awsFound = $false
    foreach ($path in $awsPaths) {
        if (Test-Path $path) {
            Write-Host "✅ Found AWS CLI at: $path" -ForegroundColor Green
            $awsFound = $true
            break
        }
    }
    
    if (-not $awsFound) {
        Write-Host "⚠️  AWS CLI installed but not found in PATH yet." -ForegroundColor Yellow
        Write-Host "You may need to:" -ForegroundColor Yellow
        Write-Host "  1. Close and reopen PowerShell" -ForegroundColor White
        Write-Host "  2. Or restart your computer`n" -ForegroundColor White
    }
    
    # Try to run aws command
    $awsVersion = & aws --version 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "`n🎉 SUCCESS! AWS CLI is installed and working!`n" -ForegroundColor Green
        Write-Host "Version: $awsVersion`n" -ForegroundColor Yellow
        Write-Host "Next step: Run 'aws configure' to set up your credentials.`n" -ForegroundColor Cyan
    } else {
        Write-Host "`n⚠️  AWS CLI may be installed but not accessible yet.`n" -ForegroundColor Yellow
        Write-Host "Please:" -ForegroundColor Yellow
        Write-Host "  1. Close this PowerShell window" -ForegroundColor White
        Write-Host "  2. Open a NEW PowerShell window" -ForegroundColor White
        Write-Host "  3. Run: aws --version`n" -ForegroundColor White
    }
} catch {
    Write-Host "`n⚠️  Could not verify installation automatically.`n" -ForegroundColor Yellow
    Write-Host "Please close and reopen PowerShell, then run:" -ForegroundColor Yellow
    Write-Host "  aws --version`n" -ForegroundColor Cyan
}

Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Gray
Write-Host "`n📝 Installation Summary:`n" -ForegroundColor Cyan
Write-Host "✅ AWS CLI installer downloaded" -ForegroundColor Green
Write-Host "✅ AWS CLI installation attempted" -ForegroundColor Green
Write-Host "`nNext Steps:`n" -ForegroundColor Yellow
Write-Host "1. Close and reopen PowerShell (to refresh PATH)" -ForegroundColor White
Write-Host "2. Run: aws --version (to verify)" -ForegroundColor White
Write-Host "3. Run: aws configure (to set up credentials)`n" -ForegroundColor White
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`n" -ForegroundColor Gray

