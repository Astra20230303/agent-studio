$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
$electron = Join-Path $PSScriptRoot 'node_modules\electron\dist\electron.exe'
if (-not (Test-Path -LiteralPath $electron)) {
    $installer = Join-Path $PSScriptRoot 'node_modules\electron\install.js'
    if (-not (Test-Path -LiteralPath $installer)) {
        throw 'Electron package is missing. Run pnpm install in the desktop directory first.'
    }
    Write-Host 'Installing the missing Electron executable...'
    & node $installer
    if ($LASTEXITCODE -ne 0 -or -not (Test-Path -LiteralPath $electron)) {
        throw 'Electron download failed. Check network access, then run node node_modules/electron/install.js and retry.'
    }
}
if (-not (Test-Path -LiteralPath (Join-Path $PSScriptRoot 'dist\index.html'))) {
    throw 'Desktop build is missing. Build the desktop project first.'
}
$previousCodexHome = $env:CODEX_HOME
$previousRunAsNode = $env:ELECTRON_RUN_AS_NODE
try {
    $env:CODEX_HOME = Join-Path $projectRoot '.project-cache\codex-home'
    $env:ELECTRON_RUN_AS_NODE = $null
    Start-Process -FilePath $electron -ArgumentList ('"' + $PSScriptRoot + '"') -WorkingDirectory $PSScriptRoot
} finally {
    $env:CODEX_HOME = $previousCodexHome
    $env:ELECTRON_RUN_AS_NODE = $previousRunAsNode
}
