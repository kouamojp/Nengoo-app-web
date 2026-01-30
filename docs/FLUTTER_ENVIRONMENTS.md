# 🔧 Gestion des environnements Flutter - Dev / Staging / Prod

## 📋 Problème actuel

Actuellement, l'URL de l'API est codée en dur dans `lib/helper/url.dart` :
- Pour développer en local : Vous devez changer manuellement vers `localhost:8001`
- Pour déployer en prod : Vous devez changer vers `https://nengoo-app-web.onrender.com`

**C'est pénible** et source d'erreurs (oublier de changer avant un build prod).

## ✅ Solution : Gestion d'environnement

J'ai créé une configuration d'environnement qui permet de basculer facilement entre dev et prod.

### 📁 Fichiers créés

```
nengoo-front/lib/
├── config/
│   ├── environment.dart          # Configuration des environnements
│   ├── environment_web.dart      # Config spécifique Web
│   └── environment_mobile.dart   # Config spécifique Mobile
├── helper/
│   └── url_with_env.dart.example # Exemple d'utilisation
├── main_dev.dart.example         # Point d'entrée DEV
└── main_prod.dart.example        # Point d'entrée PROD
```

## 🚀 Comment utiliser

### Méthode 1 : Points d'entrée multiples (Recommandé)

#### 1. Renommer les exemples

```bash
cd nengoo-front/lib
mv main_dev.dart.example main_dev.dart
mv main_prod.dart.example main_prod.dart
```

#### 2. Lancer l'app selon l'environnement

**Développement** (localhost) :
```bash
flutter run -t lib/main_dev.dart
```

**Production** (Render.com) :
```bash
flutter run -t lib/main_prod.dart
```

**Build production** :
```bash
flutter build web -t lib/main_prod.dart
flutter build apk -t lib/main_prod.dart
flutter build ipa -t lib/main_prod.dart
```

### Méthode 2 : Variables d'environnement Dart

#### 1. Modifier main.dart

```dart
import 'config/environment.dart';

void main() {
  // Lire l'environnement depuis les dart-defines
  const envString = String.fromEnvironment('ENV', defaultValue: 'development');

  final env = envString == 'production'
      ? EnvironmentType.production
      : EnvironmentType.development;

  Environment.init(env);

  runApp(MyApp());
}
```

#### 2. Lancer avec --dart-define

**Développement** :
```bash
flutter run --dart-define=ENV=development
```

**Production** :
```bash
flutter run --dart-define=ENV=production
flutter build web --dart-define=ENV=production
```

### Méthode 3 : Flavors (Avancé)

Pour Android et iOS, vous pouvez utiliser les flavors :

```bash
flutter run --flavor dev
flutter run --flavor prod
flutter build apk --flavor prod
```

Nécessite configuration dans `android/app/build.gradle` et `ios/Runner.xcodeproj`.

## 📝 Configuration des URLs

### Dans environment.dart

```dart
static String get _devUrl {
  if (kIsWeb) {
    return "http://localhost:8001";
  }
  if (Platform.isAndroid) {
    return "http://10.0.2.2:8001";
  }
  return "http://localhost:8001";
}

static const String _stagingUrl = "https://nengoo-app-staging.onrender.com";
static const String _prodUrl = "https://nengoo-app-web.onrender.com";
```

### Utilisation dans url.dart

```dart
import '../config/environment.dart';

class URL {
  static String get baseUrl => Environment.apiUrl;

  // Les endpoints restent identiques
  static String get products => "$baseUrl/api/products";
  // ...
}
```

## 🎯 Avantages

### ✅ Simplicité
- Une commande pour dev : `flutter run -t lib/main_dev.dart`
- Une commande pour prod : `flutter build web -t lib/main_prod.dart`

### ✅ Sécurité
- Impossible d'oublier de changer l'URL avant le build prod
- Configuration centralisée

### ✅ Flexibilité
- Facile d'ajouter un environnement staging
- Configuration d'autres paramètres (timeouts, logs, etc.)

### ✅ Maintenance
- Un seul endroit à modifier pour changer les URLs
- Code plus propre et professionnel

## 🔧 Migration depuis la config actuelle

### Étape 1 : Sauvegarder url.dart actuel

```bash
cd nengoo-front/lib/helper
cp url.dart url.dart.backup
```

### Étape 2 : Remplacer par la version avec Environment

```bash
cp url_with_env.dart.example url.dart
```

### Étape 3 : Créer les points d'entrée

```bash
cd ../
mv main_dev.dart.example main_dev.dart
mv main_prod.dart.example main_prod.dart
```

### Étape 4 : Tester

```bash
# Dev
flutter run -t lib/main_dev.dart

# Prod
flutter run -t lib/main_prod.dart
```

## 📊 Comparaison

| Approche | Avant | Après |
|----------|-------|-------|
| **Changement dev→prod** | Modifier manuellement url.dart | `flutter run -t lib/main_prod.dart` |
| **Build production** | Vérifier que l'URL est prod | Toujours correct avec `-t lib/main_prod.dart` |
| **Ajout staging** | Dupliquer le code | Ajouter dans environment.dart |
| **Risque d'erreur** | ⚠️ Élevé | ✅ Minimal |

## 🧪 Test des environnements

### Script de test

```bash
# Test dev
flutter run -t lib/main_dev.dart -d chrome
# Vérifier console : URL utilisée = http://localhost:8001

# Test prod
flutter run -t lib/main_prod.dart -d chrome
# Vérifier console : URL utilisée = https://nengoo-app-web.onrender.com
```

### Ajouter un log dans main.dart

```dart
void main() {
  Environment.init(EnvironmentType.production);

  print('🚀 Environment: ${Environment.isProduction ? "PROD" : "DEV"}');
  print('🌐 API URL: ${Environment.apiUrl}');

  runApp(MyApp());
}
```

## ⚠️ Important pour la production

### 1. Ne pas commit les secrets

Si vous ajoutez des clés API, utilisez :
- Variables d'environnement
- Fichiers de configuration exclus par .gitignore
- Gestionnaire de secrets (comme dotenv)

### 2. CORS sur le backend

Assurez-vous que le backend autorise l'origine prod :

```python
# backend/server.py
origins = [
    "https://nengoo-app-web.onrender.com",  # ✅
    # ...
]
```

### 3. Builds séparés

```bash
# Build dev (pour tests)
flutter build web -t lib/main_dev.dart -o build/web_dev

# Build prod (pour déploiement)
flutter build web -t lib/main_prod.dart -o build/web
```

## 🔗 Ressources

- [Flutter Flavors](https://flutter.dev/docs/deployment/flavors)
- [Dart Define](https://dart.dev/guides/language/language-tour#built-in-types)
- [Environment Variables](https://docs.flutter.dev/deployment/flavors#android)

---

**Date** : 2026-01-30
**Status** : ✅ Configuration créée
**Migration** : Optionnelle (gardez votre config actuelle si elle vous convient)
