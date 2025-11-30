# Script to remove dead code from FileUploadService.java
# Removes lines 238-250 (return statement and unreachable code)

$filePath = "src\main\java\com\churchapp\service\FileUploadService.java"

Write-Host "Reading file: $filePath" -ForegroundColor Cyan

# Read all lines
$lines = Get-Content $filePath

Write-Host "Total lines: $($lines.Count)" -ForegroundColor Yellow

# Remove lines 238-250 (0-indexed: 237-249)
# We want to keep lines 1-237 and 251-end
$newLines = @()
$newLines += $lines[0..236]  # Lines 1-238 (0-indexed: 0-236)
$newLines += $lines[250..($lines.Count - 1)]  # Lines 251-end (0-indexed: 250 to end)

Write-Host "Removed lines 238-250 (dead code after return statement)" -ForegroundColor Green
Write-Host "New total lines: $($newLines.Count)" -ForegroundColor Yellow

# Write back to file (without BOM)
$utf8NoBom = New-Object System.Text.UTF8Encoding $false
[System.IO.File]::WriteAllLines((Resolve-Path $filePath), $newLines, $utf8NoBom)

Write-Host "`n✅ File updated successfully!" -ForegroundColor Green
Write-Host "Dead code removed. The file should now compile." -ForegroundColor Cyan

