# ============================================================
# build-apk.ps1 — Build APK release Nengoo
# Usage: .\build-apk.ps1 [-Sign]
# ============================================================
param(
    [switch]$Sign
)

$ErrorActionPreference = "Stop"
$FrontendDir = "$PSScriptRoot\frontend"
$AndroidDir  = "$FrontendDir\android"
$KeystoreFile = "$AndroidDir\keystore.properties"
$KeystorePath = "$AndroidDir\nengoo-release.keystore"

# Java requis par Gradle
if (-not $env:JAVA_HOME) {
    $env:JAVA_HOME = "C:\Program Files\Android\Android Studio\jbr"
    $env:PATH = "$env:JAVA_HOME\bin;$env:PATH"
}

Write-Host "`n=== [1/4] Build React (production) ===" -ForegroundColor Cyan
Set-Location $FrontendDir
# Forcer l'URL du backend distant (.env.local écrase sinon .env.production)
$env:REACT_APP_API_BASE_URL = "https://nengoo-app-web.onrender.com/api"
npm run build:pwa
$env:REACT_APP_API_BASE_URL = $null
if (-not $?) { Write-Error "Echec build React"; exit 1 }

Write-Host "`n=== [2/4] Copie assets vers Android ===" -ForegroundColor Cyan
npx cap copy android
if (-not $?) { Write-Error "Echec cap copy"; exit 1 }

# Génération keystore si --Sign demandé et qu'il n'existe pas
if ($Sign -and -not (Test-Path $KeystorePath)) {
    Write-Host "`n=== Génération keystore de signature ===" -ForegroundColor Yellow
    $alias = "nengoo"
    $pass  = Read-Host "Mot de passe keystore (min 6 car.)" -AsSecureString
    $passPlain = [Runtime.InteropServices.Marshal]::PtrToStringAuto(
        [Runtime.InteropServices.Marshal]::SecureStringToBSTR($pass)
    )
    & keytool -genkeypair `
        -v `
        -keystore $KeystorePath `
        -alias $alias `
        -keyalg RSA `
        -keysize 2048 `
        -validity 10000 `
        -storepass $passPlain `
        -keypass $passPlain `
        -dname "CN=Nengoo, OU=Mobile, O=Nengoo Cameroun, L=Douala, ST=Littoral, C=CM"

    @"
storeFile=nengoo-release.keystore
storePassword=$passPlain
keyAlias=$alias
keyPassword=$passPlain
"@ | Out-File -FilePath $KeystoreFile -Encoding utf8
    Write-Host "Keystore créé : $KeystorePath" -ForegroundColor Green
}

Write-Host "`n=== [3/4] Compilation Gradle (release) ===" -ForegroundColor Cyan
Set-Location $AndroidDir
$GradleCmd = if (Test-Path "gradlew.bat") { ".\gradlew.bat" } else { "gradle" }
& $GradleCmd assembleRelease --no-daemon
if (-not $?) { Write-Error "Echec Gradle"; exit 1 }

Write-Host "`n=== [4/4] Localisation APK ===" -ForegroundColor Cyan
$ApkPath = Get-ChildItem -Path "$AndroidDir\app\build\outputs\apk\release\*.apk" |
           Sort-Object LastWriteTime -Descending |
           Select-Object -First 1 -ExpandProperty FullName

if ($ApkPath) {
    Write-Host "`nAPK pret : $ApkPath" -ForegroundColor Green
    $SizeMB = [Math]::Round((Get-Item $ApkPath).Length / 1MB, 1)
    Write-Host "Taille   : $SizeMB MB" -ForegroundColor Green
} else {
    Write-Error "APK introuvable apres le build."
}
