# 📱 Guide de Build Mobile - Nengoo (Android & iOS)

## 🎯 Vue d'ensemble

Nengoo est disponible en trois versions:
1. **Progressive Web App (PWA)** - Installation directe depuis le navigateur
2. **Application Android (APK)** - Pour Google Play Store
3. **Application iOS (IPA)** - Pour Apple App Store

---

## 📦 Version 1: Progressive Web App (PWA)

### Installation automatique
L'application propose automatiquement l'installation lors de la visite:
- ✅ Bannière d'installation qui apparaît automatiquement
- ✅ Bouton "Installer l'App" visible dans le header
- ✅ Fonctionne sur Android, iOS, et Desktop

### Installation manuelle

#### Sur Android (Chrome/Edge):
1. Ouvrir https://wildnengoo.preview.emergentagent.com
2. Cliquer sur le menu (⋮) en haut à droite
3. Sélectionner "Installer l'application" ou "Ajouter à l'écran d'accueil"
4. Confirmer l'installation

#### Sur iOS (Safari):
1. Ouvrir https://wildnengoo.preview.emergentagent.com
2. Appuyer sur le bouton Partager (□↑)
3. Faire défiler et choisir "Sur l'écran d'accueil"
4. Nommer l'app et confirmer

### Caractéristiques PWA:
- ✅ Installation sans passer par les stores
- ✅ Fonctionne hors ligne (service worker)
- ✅ Icône sur l'écran d'accueil
- ✅ Mode plein écran
- ✅ Mises à jour automatiques
- ✅ Taille: ~500KB (très léger)

---

## 🤖 Version 2: Application Android

### Prérequis
- Node.js 18+
- Yarn
- Android Studio
- JDK 17 ou supérieur
- SDK Android 33+

### Configuration initiale

```bash
# 1. Installer les dépendances
cd /app/frontend
yarn install

# 2. Build de l'application web
yarn build:pwa

# 3. Synchroniser avec Capacitor
npx cap sync android
```

### Option A: Build APK (pour tests)

```bash
# Ouvrir Android Studio
npx cap open android

# Dans Android Studio:
# 1. Menu Build → Generate Signed Bundle / APK
# 2. Choisir APK
# 3. Créer ou sélectionner un keystore
# 4. Sélectionner 'release' variant
# 5. Build APK sera dans: android/app/build/outputs/apk/release/
```

### Option B: Build AAB (pour Play Store)

```bash
# Dans Android Studio:
# 1. Menu Build → Generate Signed Bundle / APK
# 2. Choisir Android App Bundle
# 3. Sélectionner keystore
# 4. Build AAB sera dans: android/app/build/outputs/bundle/release/
```

### Créer un Keystore (première fois)

```bash
keytool -genkey -v -keystore nengoo-release.keystore \
  -alias nengoo \
  -keyalg RSA \
  -keysize 2048 \
  -validity 10000
```

**⚠️ IMPORTANT**: Sauvegardez le keystore et les mots de passe en sécurité!

### Configuration du Keystore dans Capacitor

Éditer `/app/frontend/capacitor.config.json`:

```json
"android": {
  "buildOptions": {
    "keystorePath": "/chemin/vers/nengoo-release.keystore",
    "keystorePassword": "VOTRE_MOT_DE_PASSE",
    "keystoreAlias": "nengoo",
    "keystoreAliasPassword": "VOTRE_MOT_DE_PASSE_ALIAS",
    "releaseType": "AAB",
    "signingType": "apksigner"
  }
}
```

### Tester l'APK

```bash
# Installer sur un appareil connecté
adb install app-release.apk

# Ou utiliser Android Studio:
npx cap run android
```

### Publication sur Google Play Store

1. **Créer un compte Google Play Developer** ($25 one-time)
2. **Créer une nouvelle application**
3. **Remplir les informations**:
   - Nom: Nengoo
   - Description courte et longue
   - Captures d'écran (minimum 2)
   - Icône 512x512px
   - Feature graphic 1024x500px
4. **Uploader l'AAB** dans la section "Production"
5. **Déployer en production**

### Informations requises pour le Store:
- **Package Name**: `com.nengoo.cameroon`
- **Version**: 1.0.0
- **Min SDK**: Android 7.0 (API 24)
- **Target SDK**: Android 14 (API 34)

---

## 🍎 Version 3: Application iOS

### Prérequis
- macOS 12+ (Monterey ou plus récent)
- Xcode 14+
- Compte Apple Developer ($99/an)
- CocoaPods

### Configuration initiale

```bash
# 1. Installer CocoaPods (si pas déjà fait)
sudo gem install cocoapods

# 2. Installer les dépendances
cd /app/frontend
yarn install

# 3. Build de l'application web
yarn build:pwa

# 4. Synchroniser avec Capacitor
npx cap sync ios

# 5. Installer les pods
cd ios/App
pod install
cd ../..
```

### Build pour iOS

```bash
# Ouvrir Xcode
npx cap open ios

# Dans Xcode:
# 1. Sélectionner le projet "App" dans le navigateur
# 2. Aller dans "Signing & Capabilities"
# 3. Sélectionner votre Team (Apple Developer Account)
# 4. Xcode configurera automatiquement le Bundle ID et le provisioning
```

### Créer une Archive (IPA)

```bash
# Dans Xcode:
# 1. Sélectionner "Any iOS Device (arm64)" comme destination
# 2. Menu Product → Archive
# 3. Une fois l'archive créée, cliquer "Distribute App"
# 4. Choisir "App Store Connect"
# 5. Suivre l'assistant d'upload
```

### Tester sur un appareil physique

```bash
# 1. Connecter votre iPhone/iPad
# 2. Sélectionner votre appareil dans Xcode
# 3. Cliquer sur le bouton Play (▶️)
# Xcode installera et lancera l'app
```

### Publication sur Apple App Store

1. **Créer un compte Apple Developer** ($99/an)
2. **Créer un App ID** sur developer.apple.com:
   - Bundle ID: `com.nengoo.cameroon`
   - App Name: Nengoo
3. **Créer l'app dans App Store Connect**:
   - Remplir les métadonnées
   - Ajouter captures d'écran (iPhone 6.7" et iPad Pro 12.9")
   - Icône 1024x1024px
   - Description et mots-clés
4. **Uploader le build** (via Xcode ou Transporter)
5. **Soumettre pour review** (délai: 24-48h généralement)

### Informations requises pour le Store:
- **Bundle ID**: `com.nengoo.cameroon`
- **Version**: 1.0.0
- **Min iOS Version**: iOS 13.0
- **Catégorie**: Shopping
- **Rating**: 4+

---

## 🎨 Assets Requis

### Icônes
- **Android**: 
  - `res/mipmap-*dpi/ic_launcher.png` (48dp to 192dp)
  - `res/drawable/splash.png` (2732x2732px)
  
- **iOS**:
  - `Assets.xcassets/AppIcon.appiconset/*` (multiples tailles)
  - `Assets.xcassets/Splash.imageset/*` (2732x2732px)

### Splash Screen
- **Taille recommandée**: 2732x2732px
- **Format**: PNG avec transparence
- **Contenu**: Logo Nengoo centré
- **Couleur de fond**: #8B5CF6 (violet)

### Captures d'écran

#### Android (Google Play):
- **Téléphone** (1080x1920px minimum): 2-8 captures
- **Tablette 7"** (optionnel): 1-8 captures
- **Tablette 10"** (optionnel): 1-8 captures

#### iOS (App Store):
- **iPhone 6.7"** (1290x2796px): 3-10 captures
- **iPhone 5.5"** (1242x2208px): optionnel
- **iPad Pro 12.9"** (2048x2732px): 1-10 captures

---

## 🔄 Workflow de Mise à Jour

### Mettre à jour l'application

```bash
# 1. Modifier le code source
# 2. Incrémenter la version dans package.json
# 3. Rebuild

cd /app/frontend

# PWA (automatique)
yarn build:pwa

# Android
yarn build:pwa
npx cap sync android
npx cap open android
# Build → Generate Signed Bundle / APK

# iOS
yarn build:pwa
npx cap sync ios
npx cap open ios
# Product → Archive
```

### Gestion des versions

Éditer `/app/frontend/package.json`:
```json
{
  "version": "1.0.1",
  ...
}
```

Éditer `/app/frontend/android/app/build.gradle`:
```gradle
android {
    defaultConfig {
        versionCode 2        // Incrémenter
        versionName "1.0.1"  // Version lisible
    }
}
```

Éditer dans Xcode (projet iOS):
- Version: 1.0.1
- Build: 2

---

## 🧪 Tests avant Publication

### Checklist Android
- [ ] Installer l'APK sur plusieurs appareils Android (7.0+)
- [ ] Tester en mode portrait et paysage
- [ ] Vérifier les permissions (notifications, etc.)
- [ ] Tester la navigation et tous les flux
- [ ] Vérifier le mode hors ligne (PWA)
- [ ] Performance: app doit démarrer en < 3s

### Checklist iOS
- [ ] Tester sur iPhone et iPad
- [ ] Tester sur iOS 13, 14, 15+
- [ ] Vérifier le splash screen
- [ ] Tester tous les liens profonds
- [ ] Vérifier la conformité Apple (pas de liens externes, etc.)
- [ ] Performance et fluidité

---

## 📊 Tailles Approximatives

| Version | Taille | Note |
|---------|--------|------|
| PWA | ~500KB | Très léger |
| Android APK | ~15-25MB | Installation directe |
| Android AAB | ~10-15MB | Play Store optimise |
| iOS IPA | ~20-30MB | App Store |

---

## 🚨 Problèmes Courants

### Android

**Erreur: Keystore not found**
```bash
# Créer un nouveau keystore (voir section Keystore ci-dessus)
```

**Build échoue avec "SDK not found"**
```bash
# Dans Android Studio:
# Tools → SDK Manager → Installer Android SDK 33+
```

**App crash au démarrage**
```bash
# Vérifier les logs:
adb logcat | grep Nengoo
```

### iOS

**Erreur: Signing for "App" requires a development team**
```bash
# Dans Xcode:
# 1. Sélectionner le projet
# 2. Signing & Capabilities
# 3. Ajouter votre Apple Developer Team
```

**CocoaPods error**
```bash
cd ios/App
pod repo update
pod install
```

**Archive invalide**
```bash
# S'assurer que:
# 1. Min iOS version = 13.0
# 2. All architectures built
# 3. Code signing correct
```

---

## 📞 Support

Pour toute question sur le build mobile:
- Documentation Capacitor: https://capacitorjs.com/docs
- Guide Android: https://developer.android.com/
- Guide iOS: https://developer.apple.com/

---

## 🎉 Résumé Rapide

```bash
# Build PWA (le plus simple)
cd /app/frontend && yarn build:pwa

# Build Android APK
yarn build:pwa
npx cap sync android
npx cap open android
# Build → Generate Signed Bundle / APK

# Build iOS IPA
yarn build:pwa
npx cap sync ios
npx cap open ios
# Product → Archive
```

**L'application est maintenant prête pour Android, iOS et le Web!** 🚀
