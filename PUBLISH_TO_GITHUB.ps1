param(
    [string]$ProjectSource = '',
    [string]$RepositoryUrl = 'https://github.com/Pete11/LG-HomeCenter.git',
    [string]$Destination = (Join-Path $env:USERPROFILE 'Desktop\LG-HomeCenter-git')
)
$ErrorActionPreference = 'Stop'
if ([string]::IsNullOrWhiteSpace($ProjectSource)) { $ProjectSource = $PSScriptRoot }
if (-not (Get-Command git -ErrorAction SilentlyContinue)) {
    throw 'Git for Windows is required. Install Git for Windows, then reopen PowerShell.'
}
if (-not (Test-Path (Join-Path $ProjectSource '.github\workflows\release.yml'))) {
    throw 'The archive source does not contain .github/workflows/release.yml. Extract the full ZIP first.'
}
if (Test-Path $Destination) {
    throw "Destination already exists: $Destination. Rename or remove that folder, then run this script again."
}
Write-Host "Cloning $RepositoryUrl ..."
git clone $RepositoryUrl $Destination
if ($LASTEXITCODE -ne 0) { throw 'git clone failed.' }
Get-ChildItem -LiteralPath $Destination -Force | Where-Object { $_.Name -ne '.git' } | Remove-Item -Recurse -Force
Get-ChildItem -LiteralPath $ProjectSource -Force | ForEach-Object {
    Copy-Item -LiteralPath $_.FullName -Destination $Destination -Recurse -Force
}
if (-not (Test-Path (Join-Path $Destination '.github\workflows\release.yml'))) {
    throw 'The hidden GitHub Actions workflow was not copied.'
}
git -C $Destination add --all
if ($LASTEXITCODE -ne 0) { throw 'git add failed.' }
git -C $Destination commit -m 'Replace repository with LG Home Center v0.7.0 full project'
if ($LASTEXITCODE -ne 0) { throw 'git commit failed. Check Git user.name and user.email.' }
git -C $Destination push origin main
if ($LASTEXITCODE -ne 0) { throw 'git push failed. Sign in to GitHub when prompted, then retry.' }
Write-Host 'Repository updated successfully. The .github workflow was included.' -ForegroundColor Green
Write-Host "Local Git working copy: $Destination"
