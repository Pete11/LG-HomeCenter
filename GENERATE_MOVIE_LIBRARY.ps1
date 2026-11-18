param(
    [string]$MovieFolder = (Join-Path $PSScriptRoot 'app\assets\wallpapers\movies')
)
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing
$ThumbFolder = Join-Path $MovieFolder 'thumbs'
New-Item -ItemType Directory -Path $ThumbFolder -Force | Out-Null
$CatalogPath = Join-Path (Split-Path -Parent $MovieFolder) 'movie-library.js'
$TitlesPath = Join-Path $MovieFolder 'movie-titles.json'
$TitleOverrides = @{}
if (Test-Path $TitlesPath) {
    $TitleOverrides = Get-Content $TitlesPath -Raw | ConvertFrom-Json
}
$Files = @(Get-ChildItem -LiteralPath $MovieFolder -File | Where-Object { $_.Extension -match '^\.(jpg|jpeg|png|bmp)$' } | Sort-Object Name)
Get-ChildItem -LiteralPath $ThumbFolder -Filter '*-thumb.jpg' -File -ErrorAction SilentlyContinue | Remove-Item -Force
if ($Files.Count -eq 0) { throw "No supported wallpaper images found in $MovieFolder" }
$Items = New-Object System.Collections.Generic.List[object]
$Index = 0
foreach ($File in $Files) {
    $Index++
    $Image = [System.Drawing.Image]::FromFile($File.FullName)
    try {
        $Width = $Image.Width
        $Height = $Image.Height
        $BaseName = [System.IO.Path]::GetFileNameWithoutExtension($File.Name)
        $Title = $null
        if ($TitleOverrides) {
            $TitleProperty = $TitleOverrides.PSObject.Properties[$File.Name]
            if ($TitleProperty) { $Title = [string]$TitleProperty.Value }
        }
        if ([string]::IsNullOrWhiteSpace($Title)) {
            $Title = $BaseName -replace '^[0-9]+-', ''
            $Title = $Title -replace '^(wp[0-9]+|[A-Za-z0-9]{5,8})-', ''
            $Title = $Title -replace '[-_]+', ' '
            $Title = (Get-Culture).TextInfo.ToTitleCase($Title.ToLowerInvariant())
        }
        $ThumbPath = Join-Path $ThumbFolder ($BaseName + '-thumb.jpg')
        $Bitmap = [System.Drawing.Bitmap]::new(480, 270)
        $Graphics = [System.Drawing.Graphics]::FromImage($Bitmap)
        try {
            $Graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
            $Graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
            $Graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
            $SourceRatio = [double]$Width / [double]$Height
            $TargetRatio = 16.0 / 9.0
            if ($SourceRatio -gt $TargetRatio) {
                $CropWidth = [int][Math]::Round($Height * $TargetRatio)
                $SourceRect = [System.Drawing.Rectangle]::new([int](($Width - $CropWidth) / 2), 0, $CropWidth, $Height)
            } else {
                $CropHeight = [int][Math]::Round($Width / $TargetRatio)
                $SourceRect = [System.Drawing.Rectangle]::new(0, [int](($Height - $CropHeight) / 2), $Width, $CropHeight)
            }
            $DestRect = [System.Drawing.Rectangle]::new(0, 0, 480, 270)
            $Graphics.DrawImage($Image, $DestRect, $SourceRect, [System.Drawing.GraphicsUnit]::Pixel)
            $Bitmap.Save($ThumbPath, [System.Drawing.Imaging.ImageFormat]::Jpeg)
        } finally {
            $Graphics.Dispose()
            $Bitmap.Dispose()
        }
        $Slug = ($Title.ToLowerInvariant() -replace '[^a-z0-9]+', '-').Trim('-')
        $Items.Add([pscustomobject]@{
            id = ('movie-{0:D2}-{1}' -f $Index, $Slug)
            title = $Title
            category = 'movies'
            resolution = ("{0} × {1}" -f $Width, $Height)
            source = 'Your movie collection · included offline'
            url = ('assets/wallpapers/movies/' + $File.Name)
            preview = ('assets/wallpapers/movies/thumbs/' + $BaseName + '-thumb.jpg')
            bundled = $true
        })
    } finally {
        $Image.Dispose()
    }
}
# Windows PowerShell 5.1 can throw 'Argument types do not match' when
# ConvertTo-Json receives a generic List wrapped in @(). Copy to a plain
# System.Object[] first, then serialize that ordinary array.
$ItemsArray = [object[]]$Items.ToArray()
$Json = ConvertTo-Json -InputObject $ItemsArray -Depth 8
$Js = "window.HOME_CENTER_MOVIE_PRESETS = $Json;"
Set-Content -LiteralPath $CatalogPath -Value $Js -Encoding UTF8
Write-Host "Generated catalog with $($Items.Count) wallpapers." -ForegroundColor Green
Write-Host "Catalog: $CatalogPath"
Write-Host "Thumbnails: $ThumbFolder"
