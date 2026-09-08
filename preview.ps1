param(
  [ValidateRange(1024, 65535)]
  [int]$Port = 4173
)

$siteRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$bundledPython = 'C:\Users\PC\.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe'
$pythonCommand = Get-Command python -ErrorAction SilentlyContinue

if (Test-Path -LiteralPath $bundledPython) {
  $pythonExe = $bundledPython
} elseif ($pythonCommand -and $pythonCommand.Source -notlike '*\Microsoft\WindowsApps\*') {
  $pythonExe = $pythonCommand.Source
} else {
  throw 'Python was not found. Install Python 3 or preview index.html directly in a browser.'
}

Set-Location -LiteralPath $siteRoot
Write-Host "Metamin preview: http://127.0.0.1:$Port/"
Write-Host 'Press Ctrl+C to stop the server.'
& $pythonExe -m http.server $Port --bind 127.0.0.1
