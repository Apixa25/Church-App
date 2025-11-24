# Quick Test Script for Media Upload (PowerShell)
# This script helps you test the data management implementation

$BaseUrl = "http://localhost:8083/api"
$Email = "test@example.com"
$Password = "password123"

Write-Host "🧪 Testing Media Upload Implementation" -ForegroundColor Cyan
Write-Host "======================================" -ForegroundColor Cyan
Write-Host ""

# Step 1: Register or Login
Write-Host "Step 1: Authenticating..." -ForegroundColor Yellow
$LoginBody = @{
    email = $Email
    password = $Password
} | ConvertTo-Json

try {
    $LoginResponse = Invoke-RestMethod -Uri "$BaseUrl/auth/login" `
        -Method Post `
        -ContentType "application/json" `
        -Body $LoginBody `
        -ErrorAction Stop
    
    $Token = $LoginResponse.token
    Write-Host "✅ Authenticated successfully" -ForegroundColor Green
    Write-Host "Token: $($Token.Substring(0, [Math]::Min(20, $Token.Length)))..." -ForegroundColor Gray
} catch {
    Write-Host "Login failed, trying to register..." -ForegroundColor Yellow
    
    $RegisterBody = @{
        name = "Test User"
        email = $Email
        password = $Password
    } | ConvertTo-Json
    
    try {
        $RegisterResponse = Invoke-RestMethod -Uri "$BaseUrl/auth/register" `
            -Method Post `
            -ContentType "application/json" `
            -Body $RegisterBody `
            -ErrorAction Stop
        
        # Try login again
        $LoginResponse = Invoke-RestMethod -Uri "$BaseUrl/auth/login" `
            -Method Post `
            -ContentType "application/json" `
            -Body $LoginBody `
            -ErrorAction Stop
        
        $Token = $LoginResponse.token
        Write-Host "✅ Registered and authenticated successfully" -ForegroundColor Green
    } catch {
        Write-Host "❌ Registration/Login failed. Please check your backend is running." -ForegroundColor Red
        Write-Host "Error: $_" -ForegroundColor Red
        exit 1
    }
}

Write-Host ""

# Step 2: Test Image Upload
Write-Host "Step 2: Testing Image Upload..." -ForegroundColor Yellow
$ImagePath = Read-Host "Please provide path to a test image (or press Enter to skip)"

if ($ImagePath -and (Test-Path $ImagePath)) {
    Write-Host "Uploading image: $ImagePath" -ForegroundColor Gray
    
    $Headers = @{
        "Authorization" = "Bearer $Token"
    }
    
    $FormData = @{
        files = Get-Item $ImagePath
    }
    
    try {
        $ImageResponse = Invoke-RestMethod -Uri "$BaseUrl/posts/upload-media" `
            -Method Post `
            -Headers $Headers `
            -Form $FormData `
            -ErrorAction Stop
        
        Write-Host "Response: $($ImageResponse | ConvertTo-Json)" -ForegroundColor Gray
        Write-Host "✅ Image upload completed" -ForegroundColor Green
        Write-Host "Check your S3 bucket for:" -ForegroundColor Cyan
        Write-Host "  - posts/originals/ (original file)" -ForegroundColor Gray
        Write-Host "  - posts/optimized/ (compressed file - appears after processing)" -ForegroundColor Gray
    } catch {
        Write-Host "❌ Image upload failed: $_" -ForegroundColor Red
    }
    Write-Host ""
} else {
    Write-Host "⏭️  Skipping image upload" -ForegroundColor Gray
    Write-Host ""
}

# Step 3: Test Video Upload
Write-Host "Step 3: Testing Video Upload..." -ForegroundColor Yellow
$VideoPath = Read-Host "Please provide path to a test video (or press Enter to skip)"

if ($VideoPath -and (Test-Path $VideoPath)) {
    Write-Host "Uploading video: $VideoPath" -ForegroundColor Gray
    
    $Headers = @{
        "Authorization" = "Bearer $Token"
    }
    
    $FormData = @{
        files = Get-Item $VideoPath
    }
    
    try {
        $VideoResponse = Invoke-RestMethod -Uri "$BaseUrl/posts/upload-media" `
            -Method Post `
            -Headers $Headers `
            -Form $FormData `
            -ErrorAction Stop
        
        Write-Host "Response: $($VideoResponse | ConvertTo-Json)" -ForegroundColor Gray
        Write-Host "✅ Video upload completed" -ForegroundColor Green
        Write-Host "Check your S3 bucket for:" -ForegroundColor Cyan
        Write-Host "  - posts/originals/ (original file)" -ForegroundColor Gray
        Write-Host "  - posts/optimized/ (480p compressed file - appears after processing)" -ForegroundColor Gray
    } catch {
        Write-Host "❌ Video upload failed: $_" -ForegroundColor Red
    }
    Write-Host ""
} else {
    Write-Host "⏭️  Skipping video upload" -ForegroundColor Gray
    Write-Host ""
}

Write-Host "======================================" -ForegroundColor Cyan
Write-Host "✅ Testing complete!" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "1. Check backend logs for processing messages" -ForegroundColor Gray
Write-Host "2. Check S3 bucket for optimized files" -ForegroundColor Gray
Write-Host "3. Compare file sizes (should see 80-90% reduction)" -ForegroundColor Gray
Write-Host ""
Write-Host "For detailed testing, see: TESTING_DATA_MANAGEMENT.md" -ForegroundColor Cyan

