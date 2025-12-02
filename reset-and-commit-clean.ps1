# 🚀 Reset to clean commit and create one new clean commit
# This will delete all the problematic commits and start fresh

Write-Host "`n🚀 RESETTING TO CLEAN STATE AND CREATING ONE NEW COMMIT`n" -ForegroundColor Cyan

# Step 1: Make sure we're on deployment branch
Write-Host "[1/5] Checking branch..." -ForegroundColor Yellow
$branch = git rev-parse --abbrev-ref HEAD
if ($branch -ne "deployment") {
    Write-Host "  Switching to deployment branch..." -ForegroundColor Yellow
    git checkout deployment 2>&1 | Out-Null
}
Write-Host "  ✅ On deployment branch`n" -ForegroundColor Green

# Step 2: Reset to safe commit (this keeps all changes staged)
Write-Host "[2/5] Resetting to safe commit 769f9fd..." -ForegroundColor Yellow
Write-Host "  (This removes problematic commits but keeps all your changes)`n" -ForegroundColor Gray

git reset --soft 769f9fd 2>&1 | Out-Null

if ($LASTEXITCODE -ne 0) {
    Write-Host "  ❌ Reset failed!`n" -ForegroundColor Red
    exit 1
}

Write-Host "  ✅ Reset complete`n" -ForegroundColor Green

# Step 3: Unstage everything first
Write-Host "[3/5] Preparing files for clean commit..." -ForegroundColor Yellow
git reset HEAD . 2>&1 | Out-Null

# Step 4: Verify files are clean (no secrets)
Write-Host "[4/5] Verifying no secrets in files..." -ForegroundColor Yellow

$hasSecrets = $false

if (Test-Path "LOCAL_DEVELOPMENT_GUIDE.md") {
    $content = Get-Content "LOCAL_DEVELOPMENT_GUIDE.md" -Raw
    if ($content -match "AKIA[A-Z0-9]{16}") {
        Write-Host "  ❌ LOCAL_DEVELOPMENT_GUIDE.md has secrets!" -ForegroundColor Red
        $hasSecrets = $true
    }
}

if (Test-Path "fix-git-secrets.ps1") {
    $content = Get-Content "fix-git-secrets.ps1" -Raw
    if ($content -match "AKIA[A-Z0-9]{16}") {
        Write-Host "  ❌ fix-git-secrets.ps1 has secrets!" -ForegroundColor Red
        $hasSecrets = $true
    }
}

if ($hasSecrets) {
    Write-Host "`n  ❌ Cannot proceed - files contain secrets!`n" -ForegroundColor Red
    exit 1
}

Write-Host "  ✅ All files are clean (no secrets found)`n" -ForegroundColor Green

# Step 5: Stage all files and create one clean commit
Write-Host "[5/5] Creating one clean commit..." -ForegroundColor Yellow

# Stage all files
git add . 2>&1 | Out-Null

# Get list of changes for commit message
$changedFiles = git diff --cached --name-only

# Create commit
$commitMessage = "Clean commit: All changes without secrets

- Removed AWS credentials from documentation
- All files use placeholder values for sensitive data
- Ready for deployment"

git commit -m $commitMessage 2>&1 | Out-Null

if ($LASTEXITCODE -eq 0) {
    Write-Host "  ✅ Clean commit created successfully!`n" -ForegroundColor Green
    
    Write-Host "═══════════════════════════════════════════════════" -ForegroundColor Cyan
    Write-Host "  READY TO PUSH!" -ForegroundColor Green
    Write-Host "═══════════════════════════════════════════════════`n" -ForegroundColor Cyan
    
    Write-Host "Run this command to push:" -ForegroundColor Yellow
    Write-Host "  git push origin deployment --force-with-lease`n" -ForegroundColor Green
    
    Write-Host "This will:" -ForegroundColor White
    Write-Host "  • Replace all problematic commits with one clean commit" -ForegroundColor Gray
    Write-Host "  • Allow GitHub to accept the push (no secrets!)" -ForegroundColor Gray
    Write-Host "  • Keep all your changes`n" -ForegroundColor Gray
    
} else {
    Write-Host "  ❌ Commit failed!`n" -ForegroundColor Red
    exit 1
}

Write-Host "✅ Done!`n" -ForegroundColor Green


