param(
    [string]$ProjectSource = '',
    [string]$RepositoryUrl = 'https://github.com/Pete11/LG-HomeCenter.git',
    [string]$Destination = (Join-Path $env:USERPROFILE 'Desktop\LG-HomeCenter-git')
)
$ErrorActionPreference = 'Stop'
if ([string]::IsNullOrWhiteSpace($ProjectSource)) { $ProjectSource = $PSScriptRoot }
if (-not (Get-Command git -ErrorAction SilentlyContinue)) {
    throw 'Git for Windows is required. Install Git for Windows, then reopen this window.'
}
if (-not (Test-Path (Join-Path $ProjectSource '.github\workflows\release.yml'))) {
    throw 'The archive is incomplete: .github\workflows\release.yml is missing.'
}
if (-not (Test-Path (Join-Path $ProjectSource 'app\appinfo.json'))) {
    throw 'The archive is incomplete: app\appinfo.json is missing.'
}
$Info = Get-Content (Join-Path $ProjectSource 'app\appinfo.json') -Raw | ConvertFrom-Json
if ($Info.version -ne '0.8.0') { throw "Expected version 0.8.0, found $($Info.version)." }

if (-not (Test-Path $Destination)) {
    Write-Host "Cloning $RepositoryUrl ..." -ForegroundColor Cyan
    git clone $RepositoryUrl $Destination
    if ($LASTEXITCODE -ne 0) { throw 'git clone failed. Complete GitHub authentication and retry.' }
} elseif (-not (Test-Path (Join-Path $Destination '.git'))) {
    throw "Destination exists but is not a Git repository: $Destination. Rename that folder or pass -Destination to a new path."
} else {
    Write-Host 'Updating existing local Git working copy...' -ForegroundColor Cyan
    git -C $Destination fetch origin
    if ($LASTEXITCODE -ne 0) { throw 'git fetch failed.' }
    git -C $Destination checkout main
    if ($LASTEXITCODE -ne 0) { throw 'Could not switch to main branch.' }
    git -C $Destination pull --ff-only origin main
    if ($LASTEXITCODE -ne 0) { throw 'Could not fast-forward local main. Check for local changes before continuing.' }
}

# Keep .git, replace everything else with the complete archive contents.
Get-ChildItem -LiteralPath $Destination -Force | Where-Object { $_.Name -ne '.git' } | Remove-Item -Recurse -Force
Get-ChildItem -LiteralPath $ProjectSource -Force | Where-Object { $_.Name -ne '.git' } | ForEach-Object {
    Copy-Item -LiteralPath $_.FullName -Destination $Destination -Recurse -Force
}
if (-not (Test-Path (Join-Path $Destination '.github\workflows\release.yml'))) {
    throw 'The GitHub Actions workflow was not copied. Check hidden files in the archive.'
}

$GitName = git -C $Destination config user.name
$GitEmail = git -C $Destination config user.email
if ([string]::IsNullOrWhiteSpace($GitName)) {
    $GitName = Read-Host 'Git author name (for example, Pete11)'
    git -C $Destination config user.name $GitName
}
if ([string]::IsNullOrWhiteSpace($GitEmail)) {
    $GitEmail = Read-Host 'Git author email (use your GitHub noreply address if preferred)'
    git -C $Destination config user.email $GitEmail
}

git -C $Destination add --all
if ($LASTEXITCODE -ne 0) { throw 'git add failed.' }
$Changes = git -C $Destination status --porcelain
if ([string]::IsNullOrWhiteSpace(($Changes -join ''))) {
    Write-Host 'The repository already matches this v0.8.0 archive. No commit is needed.' -ForegroundColor Yellow
    exit 0
}
git -C $Destination commit -m 'Replace repository with LG Home Center v0.8.0 full project'
if ($LASTEXITCODE -ne 0) { throw 'git commit failed. Check Git user.name and user.email.' }
git -C $Destination push origin main
if ($LASTEXITCODE -ne 0) { throw 'git push failed. Complete GitHub authentication in your browser, then retry the push.' }
Write-Host 'Repository updated successfully. The complete v0.8.0 project and hidden workflow were published.' -ForegroundColor Green
Write-Host "Local Git working copy: $Destination"
Write-Host 'Next: open GitHub Actions and run Build and publish Homebrew IPK.' -ForegroundColor Cyan
