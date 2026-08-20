$ErrorActionPreference = 'Stop'

$projectRoot = Split-Path -Parent $PSScriptRoot
$androidRoot = Join-Path $projectRoot 'android'
$aabSource = Join-Path $androidRoot 'app\build\outputs\bundle\release\app-release.aab'
$releaseDir = Join-Path $projectRoot 'release'
$aabTarget = Join-Path $releaseDir 'xtramys-v1.0.12-build19.aab'

Push-Location $projectRoot
try {
    npm run build
    if ($LASTEXITCODE -ne 0) {
        throw "El build web fallo con codigo $LASTEXITCODE"
    }

    npx cap sync android
    if ($LASTEXITCODE -ne 0) {
        throw "La sincronizacion de Capacitor fallo con codigo $LASTEXITCODE"
    }

    Push-Location $androidRoot
    try {
        .\gradlew.bat bundleRelease
        if ($LASTEXITCODE -ne 0) {
            throw "El build Android fallo con codigo $LASTEXITCODE"
        }
    } finally {
        Pop-Location
    }

    if (-not (Test-Path -LiteralPath $aabSource)) {
        throw "No se encontro el AAB generado: $aabSource"
    }

    New-Item -ItemType Directory -Path $releaseDir -Force | Out-Null
    Copy-Item -LiteralPath $aabSource -Destination $aabTarget -Force
    Write-Host "AAB generado: $aabTarget"
} finally {
    Pop-Location
}
