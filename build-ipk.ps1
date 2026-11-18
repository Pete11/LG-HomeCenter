$ErrorActionPreference = 'Stop'

$ProjectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$AppPath = Join-Path $ProjectRoot 'app'
$LibraryDir = Join-Path $AppPath 'webOSTVjs-1.2.13'
$LibraryPath = Join-Path $LibraryDir 'webOSTV.js'
$ZipPath = Join-Path $env:TEMP 'webOSTVjs-1.2.13.zip'
$ExtractPath = Join-Path $env:TEMP 'webOSTVjs-1.2.13'
$DistPath = Join-Path $ProjectRoot 'dist'

$Generator = Join-Path $ProjectRoot 'GENERATE_MOVIE_LIBRARY.ps1'
& $Generator
if (-not $?) { throw 'Movie library generation failed.' }
if (-not (Get-Command ares-package -ErrorAction SilentlyContinue)) {
    throw 'webOS CLI is missing. Install it with: npm install -g @webos-tools/cli@3.2.6'
}
if (-not (Test-Path $LibraryPath)) {
    Write-Host 'Downloading the official LG webOSTV.js library...'
    Invoke-WebRequest -Uri 'https://webostv.developer.lge.com/assets/library/webOSTVjs-1.2.13.zip' -OutFile $ZipPath
    if (Test-Path $ExtractPath) { Remove-Item $ExtractPath -Recurse -Force }
    Expand-Archive -Path $ZipPath -DestinationPath $ExtractPath -Force
    $Found = Get-ChildItem $ExtractPath -Recurse -File | Where-Object { $_.Name -ieq 'webOSTV.js' } | Select-Object -First 1
    if (-not $Found) { throw 'webOSTV.js was not found in the official LG archive.' }
    New-Item -ItemType Directory -Path $LibraryDir -Force | Out-Null
    Copy-Item $Found.FullName $LibraryPath -Force
}

node --check (Join-Path $AppPath 'app.js')
$null = Get-Content (Join-Path $AppPath 'appinfo.json') -Raw | ConvertFrom-Json
if (-not (Test-Path (Join-Path $AppPath 'assets/wallpapers/alpine-lake-4k.jpg'))) { throw 'Bundled Alpine Lake wallpaper is missing.' }
if (-not (Test-Path (Join-Path $AppPath 'assets/wallpapers/otherworld-desert-4k.jpg'))) { throw 'Bundled Otherworld Desert wallpaper is missing.' }
$AppInfo = Get-Content (Join-Path $AppPath 'appinfo.json') -Raw | ConvertFrom-Json
if ([string]$AppInfo.version -notmatch '^\d+\.\d+\.\d+$') { throw "Invalid appinfo version '$($AppInfo.version)'. Use semantic versioning such as 1.0.0." }
$MovieFiles = @(Get-ChildItem (Join-Path $AppPath 'assets/wallpapers/movies') -File | Where-Object { $_.Extension -match '^\.(jpg|jpeg|png|bmp)$' })
$MovieCount = $MovieFiles.Count
$ThumbCount = (Get-ChildItem (Join-Path $AppPath 'assets/wallpapers/movies/thumbs') -Filter '*-thumb.jpg' -File | Measure-Object).Count
if ($MovieCount -lt 37 -or $ThumbCount -ne $MovieCount) { throw "Expected at least 37 movie wallpapers and one thumbnail per image; found $MovieCount and $ThumbCount." }
if (-not ($AppInfo.appCategory -contains 'home')) { throw 'appCategory home is required for Home Chooser.' }
if (-not ($AppInfo.requiredPermissions -contains 'org.webosbrew.homechooser.applications')) { throw 'Home Chooser application permission is required.' }
New-Item -ItemType Directory -Path $DistPath -Force | Out-Null
ares-package $AppPath -o $DistPath
Write-Host "IPK package created in: $DistPath" -ForegroundColor Green
Get-ChildItem $DistPath -Filter '*.ipk'
