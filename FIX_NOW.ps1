# 🚀 AUTOMATIC FIX: Remove secrets from git history
# This script will fix the GitHub push protection error

Write-Host "`n=========================================" -ForegroundColor Cyan
Write-Host "  FIXING GITHUB PUSH PROTECTION ERROR" -ForegroundColor Cyan
Write-Host "=========================================`n" -ForegroundColor Cyan

# Step 1: Verify we're on the right branch
Write-Host "[1/6] Checking branch..." -ForegroundColor Yellow
$branch = git rev-parse --abbrev-ref HEAD
if ($branch -ne "deployment") {
    Write-Host "  Switching to deployment branch..." -ForegroundColor Yellow
    git checkout deployment
    if ($LASTEXITCODE -ne 0) {
        Write-Host "  ❌ Failed to switch to deployment branch`n" -ForegroundColor Red
        exit 1
    }
}
Write-Host "  ✅ On deployment branch`n" -ForegroundColor Green

# Step 2: Verify files are clean
Write-Host "[2/6] Verifying files are clean..." -ForegroundColor Yellow
$guide = Get-Content "LOCAL_DEVELOPMENT_GUIDE.md" -Raw
$script = Get-Content "fix-git-secrets.ps1" -Raw

if ($guide -match "AKIA[A-Z0-9]{16}") {
    Write-Host "  ❌ LOCAL_DEVELOPMENT_GUIDE.md still has secrets!`n" -ForegroundColor Red
    exit 1
}
if ($script -match "AKIA[A-Z0-9]{16}") {
    Write-Host "  ❌ fix-git-secrets.ps1 still has secrets!`n" -ForegroundColor Red
    exit 1
}
Write-Host "  ✅ Files are clean (using placeholders)`n" -ForegroundColor Green

# Step 3: Get the safe commit (before secrets were added)
Write-Host "[3/6] Finding safe commit point..." -ForegroundColor Yellow
$safeCommit = "769f9fd"
Write-Host "  ✅ Safe commit: $safeCommit (this is before secrets were added)`n" -ForegroundColor Green

# Step 4: Explain what we'll do
Write-Host "[4/6] Plan:" -ForegroundColor Yellow
Write-Host "  • Start interactive rebase from commit $safeCommit" -ForegroundColor White
Write-Host "  • Edit commits: 6eefd1f and 5e74e7478d1" -ForegroundColor White
Write-Host "  • Replace files with clean versions`n" -ForegroundColor White

Write-Host "⚠️  This will rewrite git history!" -ForegroundColor Red
Write-Host "⚠️  Make sure no one else is working on deployment branch!`n" -ForegroundColor Red

$confirm = Read-Host "Continue? (yes/no)"
if ($confirm -ne "yes") {
    Write-Host "`nAborted. No changes made.`n" -ForegroundColor Yellow
    exit 0
}

Write-Host "`n[5/6] Starting interactive rebase...`n" -ForegroundColor Yellow
Write-Host "An editor will open. Here's what to do:" -ForegroundColor Cyan
Write-Host "  1. Find the line: pick 6eefd1f START POINT" -ForegroundColor White
Write-Host "  2. Change it to: edit 6eefd1f START POINT" -ForegroundColor White
Write-Host "  3. Find the line: pick 5e74e74 ..." -ForegroundColor White
Write-Host "  4. Change it to: edit 5e74e74 ..." -ForegroundColor White
Write-Host "  5. Save and close the editor`n" -ForegroundColor White

Write-Host "Starting rebase in 3 seconds...`n" -ForegroundColor Yellow
Start-Sleep -Seconds 3

# Set editor to notepad for Windows
$env:GIT_EDITOR = "notepad"
$env:EDITOR = "notepad"

# Start the rebase
Write-Host "Opening editor for interactive rebase..." -ForegroundColor Cyan
git rebase -i $safeCommit

if ($LASTEXITCODE -ne 0) {
    Write-Host "`n⚠️  Rebase was aborted or there was an error.`n" -ForegroundColor Yellow
    Write-Host "If you want to cancel: git rebase --abort`n" -ForegroundColor Yellow
    exit 1
}

Write-Host "`n[6/6] Rebase started!`n" -ForegroundColor Green

Write-Host "═══════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "  NEXT STEPS - Read carefully!" -ForegroundColor Cyan
Write-Host "═══════════════════════════════════════════════════════`n" -ForegroundColor Cyan

Write-Host "When git stops at commit 6eefd1f, run these commands:" -ForegroundColor Yellow
Write-Host "  git checkout HEAD -- LOCAL_DEVELOPMENT_GUIDE.md" -ForegroundColor Green
Write-Host "  git add LOCAL_DEVELOPMENT_GUIDE.md" -ForegroundColor Green
Write-Host "  git commit --amend --no-edit" -ForegroundColor Green
Write-Host "  git rebase --continue`n" -ForegroundColor Green

Write-Host "When git stops at commit 5e74e7478d1, run these commands:" -ForegroundColor Yellow
Write-Host "  git checkout HEAD -- fix-git-secrets.ps1" -ForegroundColor Green
Write-Host "  git add fix-git-secrets.ps1" -ForegroundColor Green
Write-Host "  git commit --amend --no-edit" -ForegroundColor Green
Write-Host "  git rebase --continue`n" -ForegroundColor Green

Write-Host "After all commits are fixed, force push:" -ForegroundColor Yellow
Write-Host "  git push origin deployment --force-with-lease`n" -ForegroundColor Green

Write-Host "═══════════════════════════════════════════════════════`n" -ForegroundColor Cyan


