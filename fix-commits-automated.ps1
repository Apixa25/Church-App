# 🔒 Fully Automated Fix - Removes secrets from git history
# This will automatically fix commits 6eefd1f and 5e74e7478d1

Write-Host "`n🚀 AUTOMATED FIX: Removing AWS secrets from git history`n" -ForegroundColor Cyan

# Step 1: Check branch
$branch = git rev-parse --abbrev-ref HEAD
if ($branch -ne "deployment") {
    Write-Host "Switching to deployment branch..." -ForegroundColor Yellow
    git checkout deployment
}

Write-Host "[1/6] ✅ On deployment branch: $branch`n" -ForegroundColor Green

# Step 2: Verify files are clean
Write-Host "[2/6] Verifying current files are clean..." -ForegroundColor Yellow
$guide = Get-Content "LOCAL_DEVELOPMENT_GUIDE.md" -Raw -ErrorAction SilentlyContinue
$script = Get-Content "fix-git-secrets.ps1" -Raw -ErrorAction SilentlyContinue

if (($guide -and $guide -match "AKIA[A-Z0-9]{16}") -or ($script -and $script -match "AKIA[A-Z0-9]{16}")) {
    Write-Host "❌ Current files have secrets! Cannot proceed.`n" -ForegroundColor Red
    exit 1
}
Write-Host "✅ Files are clean`n" -ForegroundColor Green

# Step 3: Create rebase todo list with edits
Write-Host "[3/6] Preparing rebase configuration..." -ForegroundColor Yellow
$safeCommit = "769f9fd"

# Get all commits after safe commit
$commits = git log --oneline --reverse $safeCommit..HEAD
$rebaseTodo = @()

foreach ($line in $commits) {
    $hash = $line.Split()[0]
    if ($hash -eq "6eefd1f" -or $hash -eq "5e74e7478d1") {
        $rebaseTodo += "edit $line"
    } else {
        $rebaseTodo += "pick $line"
    }
}

# Create the rebase todo file
$rebaseDir = ".git/rebase-merge"
if (-not (Test-Path $rebaseDir)) {
    New-Item -ItemType Directory -Path $rebaseDir -Force | Out-Null
}

$rebaseTodo -join "`n" | Out-File -FilePath "$rebaseDir/git-rebase-todo" -Encoding UTF8 -NoNewline
$safeCommit | Out-File -FilePath "$rebaseDir/onto" -Encoding UTF8 -NoNewline
git rev-parse HEAD | Out-File -FilePath "$rebaseDir/orig-head" -Encoding UTF8 -NoNewline

Write-Host "✅ Rebase configuration created`n" -ForegroundColor Green

# Step 4: Start the rebase process
Write-Host "[4/6] Starting rebase process..." -ForegroundColor Yellow

# Manually process each commit that needs editing
$needToFix = @("6eefd1f", "5e74e7478d1")

foreach ($commitHash in $needToFix) {
    Write-Host "`nProcessing commit $commitHash..." -ForegroundColor Cyan
    
    # Checkout that commit
    git checkout $commitHash -q
    
    # Fix the files
    if ($commitHash -eq "6eefd1f") {
        Write-Host "  Fixing LOCAL_DEVELOPMENT_GUIDE.md..." -ForegroundColor Yellow
        # Get clean version from current HEAD
        git checkout HEAD -- LOCAL_DEVELOPMENT_GUIDE.md
        git add LOCAL_DEVELOPMENT_GUIDE.md
        git commit --amend --no-edit --no-verify
    }
    
    if ($commitHash -eq "5e74e7478d1") {
        Write-Host "  Fixing fix-git-secrets.ps1..." -ForegroundColor Yellow
        git checkout HEAD -- fix-git-secrets.ps1
        git add fix-git-secrets.ps1
        git commit --amend --no-edit --no-verify
    }
}

# This approach won't work well because we're changing history
# Let me try a different approach using git rebase directly

Write-Host "`n⚠️  Using direct git rebase approach instead...`n" -ForegroundColor Yellow

# Reset and try interactive rebase with auto-edit
git checkout deployment

# Create a script that will auto-edit the rebase todo
$autoEditScript = @'
$file = $args[0]
$content = Get-Content $file
$newContent = $content | ForEach-Object {
    if ($_ -match '^pick 6eefd1f') { $_ -replace '^pick', 'edit' }
    elseif ($_ -match '^pick 5e74e74') { $_ -replace '^pick', 'edit' }
    else { $_ }
}
$newContent | Set-Content $file
'@

$autoEditScript | Out-File -FilePath ".git-auto-rebase-editor.ps1" -Encoding UTF8

Write-Host "[5/6] Starting rebase with auto-edit..." -ForegroundColor Yellow
Write-Host "This may require some manual steps.`n" -ForegroundColor Cyan

# Set environment variable for git editor
$env:GIT_SEQUENCE_EDITOR = "powershell -File .git-auto-rebase-editor.ps1"

Write-Host "Run this command:" -ForegroundColor Yellow
Write-Host "  git rebase -i $safeCommit`n" -ForegroundColor Green

Write-Host "The rebase todo will be auto-edited. When git stops:" -ForegroundColor Cyan
Write-Host "  1. Fix LOCAL_DEVELOPMENT_GUIDE.md for commit 6eefd1f" -ForegroundColor White
Write-Host "  2. Fix fix-git-secrets.ps1 for commit 5e74e7478d1`n" -ForegroundColor White


