# 🚀 Create Simple Deployment Package (JAR + .platform hook)
# This creates a ZIP with just the JAR and the .platform directory

Write-Host "`n📦 Creating Simple Deployment Package...`n" -ForegroundColor Cyan

# Check if JAR exists
$jarPath = "target\church-app-backend-0.0.1-SNAPSHOT.jar"
if (-not (Test-Path $jarPath)) {
    Write-Host "❌ JAR file not found at: $jarPath" -ForegroundColor Red
    Write-Host "   Please build the project first: mvn clean package`n" -ForegroundColor Yellow
    exit 1
}

# Check if .platform directory exists
$platformPath = ".platform"
if (-not (Test-Path $platformPath)) {
    Write-Host "❌ .platform directory not found!" -ForegroundColor Red
    exit 1
}

# Remove old ZIP if exists
$zipPath = "deploy-simple.zip"
if (Test-Path $zipPath) {
    Remove-Item $zipPath -Force
    Write-Host "🗑️  Removed old $zipPath" -ForegroundColor Yellow
}

# Create ZIP
Write-Host "📦 Adding JAR file..." -ForegroundColor Cyan
Compress-Archive -Path $jarPath -DestinationPath $zipPath -Force

Write-Host "📦 Adding .platform directory..." -ForegroundColor Cyan
$tempZip = "temp.zip"
Compress-Archive -Path "$platformPath\*" -DestinationPath $tempZip -Force

# Merge the ZIPs (PowerShell doesn't have great ZIP merging, so we'll use a different approach)
# Actually, let's just add the .platform directory to the existing ZIP
Add-Type -AssemblyName System.IO.Compression.FileSystem
$zip = [System.IO.Compression.ZipFile]::Open($zipPath, [System.IO.Compression.ZipArchiveMode]::Update)

# Add .platform files
Get-ChildItem -Path $platformPath -Recurse -File | ForEach-Object {
    $relativePath = $_.FullName.Replace((Get-Location).Path + "\", "").Replace("\", "/")
    $entry = $zip.CreateEntry($relativePath)
    $entryStream = $entry.Open()
    $fileStream = [System.IO.File]::OpenRead($_.FullName)
    $fileStream.CopyTo($entryStream)
    $fileStream.Close()
    $entryStream.Close()
}

$zip.Dispose()
Remove-Item $tempZip -ErrorAction SilentlyContinue

Write-Host "`n✅ Deployment package created: $zipPath" -ForegroundColor Green
Write-Host "`n📋 Package contents:" -ForegroundColor Cyan
Write-Host "   - JAR file: $jarPath" -ForegroundColor White
Write-Host "   - .platform/nginx/conf.d/proxy.conf" -ForegroundColor White
Write-Host "`n🚀 Ready to upload to Elastic Beanstalk!`n" -ForegroundColor Green

