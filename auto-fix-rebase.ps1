# Automated script to fix git history secrets
# This will automatically handle the rebase process

Write-Host "`n🚀 Starting automated fix...`n" -ForegroundColor Cyan

# Step 1: Ensure we're on deployment branch
$branch = git rev-parse --abbrev-ref HEAD
if ($branch -ne "deployment") {
    Write-Host "Switching to deployment branch..." -ForegroundColor Yellow
    git checkout deployment
}

# Step 2: Verify files are clean
Write-Host "`n[1/5] Verifying files are clean..." -ForegroundColor Yellow
$guide = Get-Content "LOCAL_DEVELOPMENT_GUIDE.md" -Raw -ErrorAction SilentlyContinue
$script = Get-Content "fix-git-secrets.ps1" -Raw -ErrorAction SilentlyContinue

if ($guide -match "AKIA[A-Z0-9]{16}" -or $script -match "AKIA[A-Z0-9]{16}") {
    Write-Host "❌ Files still contain secrets! Aborting." -ForegroundColor Red
    exit 1
}
Write-Host "✅ Files are clean`n" -ForegroundColor Green

# Step 3: Create editor script that will automatically edit the rebase todo
$editorScript = @"
@echo off
REM Auto-edit rebase todo list to mark problematic commits as edit
powershell -Command "(Get-Content '%1') -replace '^pick 6eefd1f', 'edit 6eefd1f' -replace '^pick 5e74e74', 'edit 5e74e74' | Set-Content '%1'"
"@

$editorScript | Out-File -FilePath "rebase-editor.bat" -Encoding ASCII

# Step 4: Start the rebase with our auto-editor
Write-Host "[2/5] Starting interactive rebase..." -ForegroundColor Yellow
$env:GIT_SEQUENCE_EDITOR = "powershell -Command `"(Get-Content '%1') -replace '^pick 6eefd1f', 'edit 6eefd1f' -replace '^pick 5e74e74', 'edit 5e74e74' | Set-Content '%1'`""

Write-Host "Starting rebase from 769f9fd..." -ForegroundColor Cyan
git rebase -i 769f9fd

# Check if rebase is in progress
$rebaseDir = ".git/rebase-merge"
if (Test-Path $rebaseDir) {
    Write-Host "`n[3/5] Rebase in progress - fixing commits..." -ForegroundColor Yellow
    
    # Check which commit we're at
    $currentCommit = git rev-parse HEAD 2>$null
    
    # Fix first commit if needed
    if (Test-Path "LOCAL_DEVELOPMENT_GUIDE.md") {
        Write-Host "Fixing LOCAL_DEVELOPMENT_GUIDE.md..." -ForegroundColor Cyan
        git checkout HEAD -- LOCAL_DEVELOPMENT_GUIDE.md
        git add LOCAL_DEVELOPMENT_GUIDE.md
        git commit --amend --no-edit
    }
    
    # Fix second commit if needed  
    if (Test-Path "fix-git-secrets.ps1") {
        Write-Host "Fixing fix-git-secrets.ps1..." -ForegroundColor Cyan
        git checkout HEAD -- fix-git-secrets.ps1
        git add fix-git-secrets.ps1
        git commit --amend --no-edit
    }
    
    # Continue rebase
    $env:GIT_EDITOR = "true"
    git rebase --continue
}

Write-Host "`n[4/5] Rebase complete!`n" -ForegroundColor Green

Write-Host "[5/5] Ready to push. Run:" -ForegroundColor Yellow
Write-Host "  git push origin deployment --force-with-lease`n" -ForegroundColor Green


