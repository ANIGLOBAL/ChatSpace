# Publish build/client sang branch gh-pages của ANIGLOBAL/ChatSpace.
# Build lại với CHATSPACE_BASE=/ChatSpace/ để asset URLs đúng dưới subpath GitHub Pages.
param([string]$CommitMessage = "Publish ChatSpace SPA")

$ErrorActionPreference = "Stop"
$repoUrl = "https://github.com/ANIGLOBAL/ChatSpace.git"
$workDir = Join-Path $env:TEMP "opencode\chatspace-pages-repo"

# 1) Build artifact với base /ChatSpace/
$env:CHATSPACE_BASE = "/ChatSpace/"
npm run build
if ($LASTEXITCODE -ne 0) { throw "build failed" }
Remove-Item Env:CHATSPACE_BASE

# 2) Clone/refresh gh-pages workdir
New-Item -ItemType Directory -Force -Path (Split-Path $workDir) | Out-Null
if (Test-Path $workDir) {
    Remove-Item -Recurse -Force $workDir
}
git clone --single-branch --branch gh-pages $repoUrl $workDir
if ($LASTEXITCODE -ne 0) {
    git init -b gh-pages $workDir
    Set-Location $workDir
    git remote add origin $repoUrl
}

# 3) Đồng bộ artifact
Set-Location $workDir
Get-ChildItem -Force | Where-Object { $_.Name -notin @(".git") } | Remove-Item -Recurse -Force
Copy-Item -Recurse -Force -Path (Join-Path $PSScriptRoot "..\build\client\*") -Destination $workDir
git add -A
git commit -m $CommitMessage
git push origin gh-pages
if ($LASTEXITCODE -eq 0) {
    Write-Output "PUBLISHED gh-pages OK"
}
