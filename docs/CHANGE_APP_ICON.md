# 🎨 Changer l'icône de l'application - Guide complet

## 📍 Emplacements des icônes

### Web (Favicon)

```
nengoo-front/web/
├── favicon.png                    # 192x192px (navigateur)
└── icons/
    ├── Icon-192.png              # 192x192px (PWA)
    ├── Icon-512.png              # 512x512px (PWA)
    ├── Icon-maskable-192.png     # 192x192px (Android maskable)
    └── Icon-maskable-512.png     # 512x512px (Android maskable)
```

### Android

```
nengoo-front/android/app/src/main/res/
├── mipmap-hdpi/ic_launcher.png      # 72x72px
├── mipmap-mdpi/ic_launcher.png      # 48x48px
├── mipmap-xhdpi/ic_launcher.png     # 96x96px
├── mipmap-xxhdpi/ic_launcher.png    # 144x144px
└── mipmap-xxxhdpi/ic_launcher.png   # 192x192px
```

### iOS

```
nengoo-front/ios/Runner/Assets.xcassets/AppIcon.appiconset/
├── Icon-App-20x20@1x.png
├── Icon-App-20x20@2x.png
├── Icon-App-29x29@1x.png
├── ... (plusieurs tailles)
└── Icon-App-1024x1024@1x.png
```

## 🚀 Méthode automatique (Recommandée)

### Étape 1 : Installer le package

```bash
cd nengoo-front
flutter pub add flutter_launcher_icons --dev
```

### Étape 2 : Créer la configuration

Créez `flutter_launcher_icons.yaml` à la racine du projet :

```yaml
flutter_launcher_icons:
  android: true
  ios: true
  web:
    generate: true
    image_path: "assets/icon/app_icon.png"
  image_path: "assets/icon/app_icon.png"
  adaptive_icon_background: "#FFFFFF"  # Couleur de fond Android
  adaptive_icon_foreground: "assets/icon/app_icon_foreground.png"
```

### Étape 3 : Préparer votre logo

1. **Créez le dossier** :
```bash
mkdir -p assets/icon
```

2. **Ajoutez votre logo** :
   - `assets/icon/app_icon.png` - **1024x1024px**, PNG, fond transparent ou blanc
   - `assets/icon/app_icon_foreground.png` - **1024x1024px**, PNG, fond transparent (optionnel pour Android adaptive icon)

3. **Déclarez dans pubspec.yaml** :
```yaml
flutter:
  assets:
    - assets/icon/
```

### Étape 4 : Générer toutes les icônes

```bash
flutter pub get
flutter pub run flutter_launcher_icons
```

✅ **Génère automatiquement** toutes les tailles pour Android, iOS et Web !

### Étape 5 : Vérifier

```bash
# Web
ls web/icons/

# Android
ls android/app/src/main/res/mipmap-*/

# iOS
ls ios/Runner/Assets.xcassets/AppIcon.appiconset/
```

## 🔧 Méthode manuelle

### Web uniquement

1. Créez les icônes aux bonnes tailles :
   - `favicon.png` : 192x192px
   - `Icon-192.png` : 192x192px
   - `Icon-512.png` : 512x512px

2. Remplacez dans `nengoo-front/web/` :
```bash
cp votre-icon-192.png nengoo-front/web/favicon.png
cp votre-icon-192.png nengoo-front/web/icons/Icon-192.png
cp votre-icon-512.png nengoo-front/web/icons/Icon-512.png
```

3. Rebuild :
```bash
flutter build web
```

### Android uniquement

1. Générez toutes les tailles :
   - mdpi: 48x48px
   - hdpi: 72x72px
   - xhdpi: 96x96px
   - xxhdpi: 144x144px
   - xxxhdpi: 192x192px

2. Remplacez dans les dossiers `mipmap-*`

3. Rebuild :
```bash
flutter build apk
```

## 🎨 Bonnes pratiques

### Dimensions recommandées

| Plateforme | Taille source | Format |
|------------|---------------|--------|
| **Toutes** | 1024x1024px | PNG |
| Android | 512x512px minimum | PNG avec transparence |
| iOS | 1024x1024px | PNG sans transparence |
| Web | 512x512px | PNG ou SVG |

### Design

- ✅ **Simple et reconnaissable** à petite taille
- ✅ **Fond transparent** (sauf iOS)
- ✅ **Couleurs contrastées**
- ✅ **Pas de texte** (trop petit à lire)
- ✅ **Centré** avec marges
- ❌ Éviter les détails fins
- ❌ Éviter les dégradés complexes

### Icône adaptive Android

Pour Android 8+ (API 26+), utilisez les **adaptive icons** :

- **Foreground** : Logo principal (transparent)
- **Background** : Couleur unie ou image simple
- **Safe zone** : Gardez le contenu dans un cercle de 66% du total

## 🧪 Tester l'icône

### Web

1. Build :
```bash
flutter build web
```

2. Servir localement :
```bash
cd build/web
python -m http.server 8000
```

3. Ouvrir `http://localhost:8000` et vérifier :
   - Onglet du navigateur (favicon)
   - Favoris
   - Ajout à l'écran d'accueil (mobile)

### Android

1. Build :
```bash
flutter build apk
```

2. Installer :
```bash
adb install build/app/outputs/flutter-apk/app-release.apk
```

3. Vérifier l'icône sur l'écran d'accueil

### iOS

1. Build :
```bash
flutter build ios
```

2. Ouvrir Xcode et lancer sur simulateur

3. Vérifier l'icône sur l'écran d'accueil

## 🛠️ Outils utiles

### Générateurs en ligne

- [favicon.io](https://favicon.io/) - Générateur de favicon
- [realfavicongenerator.net](https://realfavicongenerator.net/) - Tous formats
- [appicon.co](https://appicon.co/) - iOS App Icon Generator

### Logiciels

- **Figma** - Design d'icône
- **Adobe Illustrator** - Icônes vectorielles
- **GIMP** - Gratuit, export PNG
- **ImageMagick** - Ligne de commande pour redimensionner

### Commande ImageMagick

```bash
# Générer toutes les tailles depuis un fichier source
convert logo-1024.png -resize 192x192 Icon-192.png
convert logo-1024.png -resize 512x512 Icon-512.png
convert logo-1024.png -resize 48x48 ic_launcher-mdpi.png
convert logo-1024.png -resize 72x72 ic_launcher-hdpi.png
convert logo-1024.png -resize 96x96 ic_launcher-xhdpi.png
convert logo-1024.png -resize 144x144 ic_launcher-xxhdpi.png
convert logo-1024.png -resize 192x192 ic_launcher-xxxhdpi.png
```

## 📋 Checklist

- [ ] Logo source 1024x1024px préparé
- [ ] Package `flutter_launcher_icons` installé
- [ ] Configuration `flutter_launcher_icons.yaml` créée
- [ ] Logo placé dans `assets/icon/`
- [ ] Commande `flutter pub run flutter_launcher_icons` exécutée
- [ ] Vérification des fichiers générés
- [ ] Build Web testé
- [ ] Build Android testé
- [ ] Build iOS testé (si applicable)

## ⚠️ Problèmes courants

### L'icône ne change pas après rebuild

**Solution** :
```bash
flutter clean
flutter pub get
flutter pub run flutter_launcher_icons
flutter build web  # ou apk, ou ios
```

### Icône floue sur Android

**Cause** : Mauvaise résolution source

**Solution** : Utilisez une image source d'au moins 1024x1024px

### Icône coupée sur certains appareils Android

**Cause** : Pas d'adaptive icon

**Solution** : Configurez `adaptive_icon_foreground` et `adaptive_icon_background`

## 🔗 Ressources

- [Flutter Launcher Icons](https://pub.dev/packages/flutter_launcher_icons)
- [Android Adaptive Icons](https://developer.android.com/guide/practices/ui_guidelines/icon_design_adaptive)
- [iOS Human Interface Guidelines - App Icon](https://developer.apple.com/design/human-interface-guidelines/app-icons)
- [Web App Manifest](https://developer.mozilla.org/en-US/docs/Web/Manifest)

---

**Dernière mise à jour** : 2026-01-30
