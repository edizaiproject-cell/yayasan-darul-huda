$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
$nodeExecutable = (Get-Command node -ErrorAction Stop).Source
$startupFolder = [Environment]::GetFolderPath('Startup')
$shortcutPath = Join-Path $startupFolder 'Darul Huda - Server Lokal.lnk'
$windowsScriptHost = Join-Path $env:WINDIR 'System32\wscript.exe'
if (-not (Test-Path -LiteralPath $windowsScriptHost)) { throw 'Windows Script Host tidak tersedia.' }
$shell = New-Object -ComObject WScript.Shell
$shortcut = $shell.CreateShortcut($shortcutPath)
$shortcut.TargetPath = $windowsScriptHost
$shortcut.Arguments = '"' + (Join-Path $PSScriptRoot 'start-local.vbs') + '" "' + $nodeExecutable + '"'
$shortcut.WorkingDirectory = $projectRoot
$shortcut.Description = 'Menjalankan website lokal Darul Huda setelah masuk Windows.'
$shortcut.WindowStyle = 7
$shortcut.Save()
Write-Output "Startup terpasang: $shortcutPath"
Start-Process -FilePath $windowsScriptHost -ArgumentList $shortcut.Arguments -WorkingDirectory $projectRoot -WindowStyle Hidden
