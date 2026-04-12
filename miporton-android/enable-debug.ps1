# Desactiva la verificación Digital Asset Links en Chrome del emulador/dispositivo
# (solo desarrollo). Sin esto, builds DEBUG suelen quedarse en el splash porque
# el SHA-256 del debug.keystore no está en https://mivisita.app/.well-known/assetlinks.json
#
# Uso (PowerShell, emulador encendido):
#   .\enable-debug.ps1
#   .\enable-debug.ps1 -Origin "https://mivisita.app"

param(
    [string]$Origin = "https://mivisita.app"
)

$adbCandidates = @(
    "$env:LOCALAPPDATA\Android\Sdk\platform-tools\adb.exe",
    "$env:ANDROID_HOME\platform-tools\adb.exe",
    "$env:ANDROID_SDK_ROOT\platform-tools\adb.exe"
)
$adb = $adbCandidates | Where-Object { Test-Path $_ } | Select-Object -First 1
if (-not $adb) {
    Write-Error "No se encontró adb.exe. Instala Android SDK Platform-Tools o ajusta la ruta."
    exit 1
}

# Mismo contenido que enable-debug.sh de Google (Chrome lee este archivo al arrancar)
$shellCmd = "echo '_ --disable-digital-asset-link-verification-for-url=`"$Origin`"' > /data/local/tmp/chrome-command-line"
& $adb shell $shellCmd
& $adb shell "am force-stop com.android.chrome"
Write-Host "Hecho. Vuelve a abrir MiVisita en el emulador (o pulsa Run de nuevo)."
