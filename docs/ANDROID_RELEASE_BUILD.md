# 📱 Build Android Release - Guide complet

## 🚀 Commandes rapides

### APK standard
```bash
flutter build apk --release
```
📦 Sortie : `build/app/outputs/flutter-apk/app-release.apk`

### APK optimisé (recommandé)
```bash
flutter build apk --split-per-abi
```
📦 Sortie : `build/app/outputs/flutter-apk/`
- `app-arm64-v8a-release.apk` (64-bit, à utiliser pour la plupart)
- `app-armeabi-v7a-release.apk` (32-bit)
- `app-x86_64-release.apk` (émulateurs)

### App Bundle pour Play Store
```bash
flutter build appbundle --release
```
📦 Sortie : `build/app/outputs/bundle/release/app-release.aab`

## 🔐 Configuration de la signature (Play Store)

### Étape 1 : Générer une clé de signature

```bash
keytool -genkey -v -keystore ~/upload-keystore.jks -keyalg RSA -keysize 2048 -validity 10000 -alias upload
```

**Questions posées** :
- Mot de passe du keystore : `[CHOISIR UN MOT DE PASSE]`
- Nom et prénom : `Nengoo`
- Organisation : `Nengoo`
- Ville, État, Code pays : Remplir selon vos infos

**Sauvegardez** :
- Le fichier `upload-keystore.jks`
- Le mot de passe (TRÈS IMPORTANT)
- L'alias (par défaut: `upload`)

### Étape 2 : Créer key.properties

Créez `android/key.properties` :

```properties
storePassword=VOTRE_MOT_DE_PASSE
keyPassword=VOTRE_MOT_DE_PASSE
keyAlias=upload
storeFile=C:/chemin/vers/upload-keystore.jks
```

⚠️ **NE JAMAIS COMMITTER ce fichier** (ajoutez-le à `.gitignore`)

### Étape 3 : Configurer build.gradle

Modifiez `android/app/build.gradle` :

```gradle
// Avant android {
def keystoreProperties = new Properties()
def keystorePropertiesFile = rootProject.file('key.properties')
if (keystorePropertiesFile.exists()) {
    keystoreProperties.load(new FileInputStream(keystorePropertiesFile))
}

android {
    // ...

    signingConfigs {
        release {
            keyAlias keystoreProperties['keyAlias']
            keyPassword keystoreProperties['keyPassword']
            storeFile keystoreProperties['storeFile'] ? file(keystoreProperties['storeFile']) : null
            storePassword keystoreProperties['storePassword']
        }
    }

    buildTypes {
        release {
            signingConfig signingConfigs.release
            // Activer ProGuard (obfuscation)
            minifyEnabled true
            shrinkResources true
        }
    }
}
```

### Étape 4 : Build signé

```bash
flutter build apk --release
# OU
flutter build appbundle --release
```

## 📋 Configuration de l'app

### android/app/build.gradle

```gradle
android {
    compileSdkVersion 33

    defaultConfig {
        applicationId "com.nengoo.app"  // ← Votre package unique
        minSdkVersion 21               // Android 5.0+
        targetSdkVersion 33            // Android 13
        versionCode 1                  // ← Incrémenter à chaque release
        versionName "1.0.0"           // ← Version visible
    }
}
```

### android/app/src/main/AndroidManifest.xml

```xml
<manifest xmlns:android="http://schemas.android.com/apk/res/android"
    package="com.nengoo.app">

    <application
        android:label="Nengoo"              <!-- Nom de l'app -->
        android:icon="@mipmap/ic_launcher"  <!-- Icône -->
        android:usesCleartextTraffic="true"> <!-- Pour HTTP en dev -->

        <!-- Permissions -->
        <uses-permission android:name="android.permission.INTERNET"/>
        <uses-permission android:name="android.permission.ACCESS_NETWORK_STATE"/>
    </application>
</manifest>
```

## 🎨 Icône de l'app

### Générer automatiquement

1. Installez le package :
```bash
flutter pub add flutter_launcher_icons --dev
```

2. Créez `flutter_launcher_icons.yaml` :
```yaml
flutter_launcher_icons:
  android: true
  ios: false
  image_path: "assets/icon/app_icon.png"  # 1024x1024px
```

3. Générez :
```bash
flutter pub run flutter_launcher_icons
```

## 🧪 Test avant publication

### Test sur appareil physique

```bash
flutter build apk --release
adb install build/app/outputs/flutter-apk/app-release.apk
```

### Test en local

```bash
flutter run --release
```

### Checklist avant publication

- [ ] URL backend en production (`https://nengoo-app-web.onrender.com`)
- [ ] Version incrémentée dans `build.gradle`
- [ ] Icône de l'app configurée
- [ ] Permissions Android vérifiées
- [ ] APK signé avec keystore
- [ ] Testé sur appareil physique
- [ ] Pas de logs de debug dans le code
- [ ] Conditions d'utilisation et politique de confidentialité

## 📤 Publication sur Google Play Store

### Prérequis

1. **Compte développeur** : $25 (paiement unique)
   - Inscription : https://play.google.com/console

2. **App Bundle signé** :
```bash
flutter build appbundle --release
```

3. **Assets requis** :
   - Icône haute résolution (512x512px)
   - Screenshots (téléphone, tablette)
   - Description de l'app
   - Politique de confidentialité (URL)

### Étapes de publication

1. **Créer une app** dans Play Console
2. **Télécharger l'App Bundle** (.aab)
3. **Remplir les infos** :
   - Titre, description
   - Catégorie
   - Screenshots
   - Classification du contenu
4. **Soumettre pour révision**

⏱️ Délai de révision : 1-7 jours

## 🔧 Commandes utiles

### Nettoyer avant build
```bash
flutter clean
flutter pub get
flutter build apk --release
```

### Analyser la taille de l'APK
```bash
flutter build apk --analyze-size
```

### Vérifier les problèmes
```bash
flutter doctor
flutter analyze
```

### Voir les logs d'une app release
```bash
adb logcat | grep flutter
```

## 📊 Tailles typiques

| Type | Taille |
|------|--------|
| APK standard | ~20-30 MB |
| APK arm64-v8a | ~15-20 MB |
| App Bundle | ~18-25 MB (Play Store optimise) |

## ⚠️ Problèmes courants

### Erreur "Signing key not found"

**Solution** : Vérifiez `key.properties` et que le fichier `.jks` existe

### Erreur "minSdkVersion too low"

**Solution** : Augmentez `minSdkVersion` dans `build.gradle` (recommandé: 21)

### App se ferme immédiatement après installation

**Causes** :
- Erreur de signature
- Permissions manquantes
- Problème de ProGuard

**Debug** :
```bash
adb logcat | grep -E "AndroidRuntime|flutter"
```

## 🔗 Ressources

- [Build et release Android](https://docs.flutter.dev/deployment/android)
- [Play Store Guidelines](https://play.google.com/console/about/guides/)
- [App Signing by Google Play](https://support.google.com/googleplay/android-developer/answer/9842756)

---

**Dernière mise à jour** : 2026-01-30
**Pour** : Nengoo Flutter App
