$ErrorActionPreference = 'Stop'
$ProjectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$AppDir = Join-Path $ProjectRoot 'app'
$DistDir = Join-Path $ProjectRoot 'dist'

if (-not (Get-Command ares-package -ErrorAction SilentlyContinue)) {
    Write-Error 'ares-package was not found. Install webOS TV CLI and reopen PowerShell.'
}
if (-not (Test-Path (Join-Path $AppDir 'appinfo.json'))) {
    Write-Error "appinfo.json is missing from $AppDir"
}
New-Item -ItemType Directory -Force -Path $DistDir | Out-Null
Push-Location $ProjectRoot
try {
    ares-package $AppDir -o $DistDir
    if ($LASTEXITCODE -ne 0) { throw "ares-package failed with exit code $LASTEXITCODE" }
    Write-Host "IPK package created at: $DistDir" -ForegroundColor Green
}
finally { Pop-Location }
