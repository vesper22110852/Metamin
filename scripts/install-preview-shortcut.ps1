$ErrorActionPreference = 'Stop'
$shortcutRoot = Split-Path -Parent $PSScriptRoot
$shortcutLauncher = Join-Path $PSScriptRoot 'open-preview.ps1'
$shortcutDesktop = [Environment]::GetFolderPath('Desktop')
$shortcutPath = Join-Path $shortcutDesktop 'Metamin Preview.lnk'
$shortcutIconPath = Join-Path $PSScriptRoot 'metamin-preview.ico'

if (-not (Test-Path -LiteralPath $shortcutLauncher)) { throw 'Preview launcher is missing.' }
if (Test-Path -LiteralPath $shortcutPath) { throw "A shortcut already exists at $shortcutPath. It was left unchanged." }

if (-not (Test-Path -LiteralPath $shortcutIconPath)) {
  Add-Type -AssemblyName System.Drawing
  $shortcutBitmap = New-Object System.Drawing.Bitmap(64, 64)
  $shortcutGraphics = [System.Drawing.Graphics]::FromImage($shortcutBitmap)
  $shortcutFont = New-Object System.Drawing.Font('Segoe UI', 36, [System.Drawing.FontStyle]::Bold, [System.Drawing.GraphicsUnit]::Pixel)
  $shortcutFormat = New-Object System.Drawing.StringFormat
  $shortcutFormat.Alignment = [System.Drawing.StringAlignment]::Center
  $shortcutFormat.LineAlignment = [System.Drawing.StringAlignment]::Center
  try {
    $shortcutGraphics.Clear([System.Drawing.ColorTranslator]::FromHtml('#004C98'))
    $shortcutGraphics.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAliasGridFit
    $shortcutGraphics.DrawString('M', $shortcutFont, [System.Drawing.Brushes]::White, (New-Object System.Drawing.RectangleF(0, 0, 64, 60)), $shortcutFormat)
    $shortcutIcon = [System.Drawing.Icon]::FromHandle($shortcutBitmap.GetHicon())
    $shortcutIconFile = [System.IO.File]::Open($shortcutIconPath, [System.IO.FileMode]::CreateNew)
    try { $shortcutIcon.Save($shortcutIconFile) } finally { $shortcutIconFile.Dispose(); $shortcutIcon.Dispose() }
  } finally { $shortcutFormat.Dispose(); $shortcutFont.Dispose(); $shortcutGraphics.Dispose(); $shortcutBitmap.Dispose() }
}

$shortcutShell = New-Object -ComObject WScript.Shell
$shortcut = $shortcutShell.CreateShortcut($shortcutPath)
$shortcut.TargetPath = Join-Path $env:WINDIR 'System32\WindowsPowerShell\v1.0\powershell.exe'
$shortcut.Arguments = '-NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File "' + $shortcutLauncher + '"'
$shortcut.WorkingDirectory = $shortcutRoot
$shortcut.IconLocation = $shortcutIconPath
$shortcut.Description = 'Open the local Metamin blog preview'
$shortcut.WindowStyle = 7
$shortcut.Save()
Write-Output $shortcutPath
