param(
  [ValidateRange(1024, 65535)]
  [int]$Port = 4173,
  [switch]$NoBrowser
)

$ErrorActionPreference = 'Stop'
$previewRoot = Split-Path -Parent $PSScriptRoot
$previewUrl = "http://127.0.0.1:$Port/"
$previewPythonBundled = 'C:\Users\PC\.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe'

function Test-MetaminPreview {
  try {
    $previewPage = Invoke-WebRequest -UseBasicParsing -Uri $previewUrl -TimeoutSec 2
    return ($previewPage.StatusCode -eq 200 -and $previewPage.Content -match '<title>Seokmin Kim \| Metamin</title>')
  } catch { return $false }
}

try {
  if (-not (Test-MetaminPreview)) {
    $previewListener = New-Object System.Net.Sockets.TcpListener([System.Net.IPAddress]::Loopback, $Port)
    try { $previewListener.Start() } catch { throw "Port $Port is used by another program. Run this launcher with -Port 4174." } finally { $previewListener.Stop() }
    if (Test-Path -LiteralPath $previewPythonBundled) {
      $previewPython = $previewPythonBundled
    } else {
      $previewCommand = Get-Command python -ErrorAction SilentlyContinue
      if (-not $previewCommand -or $previewCommand.Source -like '*\Microsoft\WindowsApps\*') { throw 'Python 3 was not found.' }
      $previewPython = $previewCommand.Source
    }
    $previewArguments = @('-m', 'http.server', "$Port", '--bind', '127.0.0.1', '--directory', ('"' + $previewRoot + '"'))
    $previewProcess = Start-Process -FilePath $previewPython -ArgumentList $previewArguments -WorkingDirectory $previewRoot -WindowStyle Hidden -PassThru
    $previewReady = $false
    for ($previewAttempt = 0; $previewAttempt -lt 20; $previewAttempt++) {
      if (Test-MetaminPreview) { $previewReady = $true; break }
      if ($previewProcess.HasExited) { break }
      Start-Sleep -Milliseconds 250
    }
    if (-not $previewReady) { throw 'The local preview server could not start.' }
  }
  if (-not $NoBrowser) { Start-Process $previewUrl }
  Write-Output $previewUrl
} catch {
  if (-not $NoBrowser) {
    Add-Type -AssemblyName System.Windows.Forms
    [System.Windows.Forms.MessageBox]::Show($_.Exception.Message, 'Metamin preview') | Out-Null
  }
  throw
}
