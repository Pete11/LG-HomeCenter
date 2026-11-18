param(
    [string]$MovieFolder = (Join-Path $PSScriptRoot 'app\assets\wallpapers\movies')
)

$ErrorActionPreference = 'Stop'
$Generator = Join-Path $PSScriptRoot 'GENERATE_MOVIE_LIBRARY.ps1'

if (-not (Test-Path -LiteralPath $Generator)) {
    throw "Movie library generator not found: $Generator"
}

# The main generator uses .NET System.Drawing to create all 480x270 JPEG
# thumbnails and the JavaScript catalog. No Python or Pillow dependency.
& $Generator -MovieFolder $MovieFolder
if (-not $?) {
    throw 'Wallpaper thumbnail and catalog generation failed.'
}

Write-Host 'Wallpaper thumbnails and movie catalog are ready.' -ForegroundColor Green
