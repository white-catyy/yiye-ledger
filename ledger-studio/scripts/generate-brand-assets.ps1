Add-Type -AssemblyName System.Drawing

$assetRoot = Join-Path $PSScriptRoot '..\assets\images'
$paper = [System.Drawing.ColorTranslator]::FromHtml('#EEF7FC')
$ink = [System.Drawing.ColorTranslator]::FromHtml('#1D4962')
$card = [System.Drawing.ColorTranslator]::FromHtml('#FBFDFF')
$frost = [System.Drawing.ColorTranslator]::FromHtml('#CDEAF8')

function New-RoundedPath {
  param(
    [float]$X,
    [float]$Y,
    [float]$Width,
    [float]$Height,
    [float]$Radius
  )

  $path = [System.Drawing.Drawing2D.GraphicsPath]::new()
  $diameter = $Radius * 2
  $path.AddArc($X, $Y, $diameter, $diameter, 180, 90)
  $path.AddArc($X + $Width - $diameter, $Y, $diameter, $diameter, 270, 90)
  $path.AddArc(
    $X + $Width - $diameter,
    $Y + $Height - $diameter,
    $diameter,
    $diameter,
    0,
    90
  )
  $path.AddArc($X, $Y + $Height - $diameter, $diameter, $diameter, 90, 90)
  $path.CloseFigure()
  return $path
}

function New-BrandMark {
  param(
    [int]$Size,
    [string]$OutputPath,
    [bool]$WithBackground
  )

  $bitmap = [System.Drawing.Bitmap]::new($Size, $Size)
  $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
  $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
  $graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
  $graphics.Clear([System.Drawing.Color]::Transparent)

  if ($WithBackground) {
    $graphics.Clear($paper)
    $markSize = $Size * 0.62
    $markX = ($Size - $markSize) / 2
    $markY = ($Size - $markSize) / 2
  } else {
    $markSize = $Size * 0.54
    $markX = ($Size - $markSize) / 2
    $markY = ($Size - $markSize) / 2
  }

  $markPath = New-RoundedPath -X $markX -Y $markY -Width $markSize -Height $markSize -Radius ($markSize * 0.24)
  $markBrush = [System.Drawing.SolidBrush]::new($ink)
  $graphics.FillPath($markBrush, $markPath)

  $pageWidth = $markSize * 0.44
  $pageHeight = $markSize * 0.48
  $pageX = $markX + $markSize * 0.23
  $pageY = $markY + $markSize * 0.18
  $pagePath = New-RoundedPath -X $pageX -Y $pageY -Width $pageWidth -Height $pageHeight -Radius ($markSize * 0.045)
  $cardBrush = [System.Drawing.SolidBrush]::new($card)
  $graphics.FillPath($cardBrush, $pagePath)

  $linePen = [System.Drawing.Pen]::new($ink, [Math]::Max(2, $markSize * 0.022))
  $linePen.StartCap = [System.Drawing.Drawing2D.LineCap]::Round
  $linePen.EndCap = [System.Drawing.Drawing2D.LineCap]::Round
  $graphics.DrawLine(
    $linePen,
    $pageX + $pageWidth * 0.2,
    $pageY + $pageHeight * 0.34,
    $pageX + $pageWidth * 0.8,
    $pageY + $pageHeight * 0.34
  )
  $graphics.DrawLine(
    $linePen,
    $pageX + $pageWidth * 0.2,
    $pageY + $pageHeight * 0.58,
    $pageX + $pageWidth * 0.62,
    $pageY + $pageHeight * 0.58
  )

  $dotSize = $markSize * 0.19
  $dotBrush = [System.Drawing.SolidBrush]::new($frost)
  $graphics.FillEllipse(
    $dotBrush,
    $markX + $markSize * 0.65,
    $markY + $markSize * 0.66,
    $dotSize,
    $dotSize
  )

  $bitmap.Save($OutputPath, [System.Drawing.Imaging.ImageFormat]::Png)

  $dotBrush.Dispose()
  $linePen.Dispose()
  $cardBrush.Dispose()
  $pagePath.Dispose()
  $markBrush.Dispose()
  $markPath.Dispose()
  $graphics.Dispose()
  $bitmap.Dispose()
}

New-BrandMark -Size 1024 -OutputPath (Join-Path $assetRoot 'icon.png') -WithBackground $true
New-BrandMark -Size 1024 -OutputPath (Join-Path $assetRoot 'android-icon-foreground.png') -WithBackground $false
New-BrandMark -Size 512 -OutputPath (Join-Path $assetRoot 'splash-icon.png') -WithBackground $false
New-BrandMark -Size 256 -OutputPath (Join-Path $assetRoot 'favicon.png') -WithBackground $true

Write-Output 'Generated brand icon assets.'
