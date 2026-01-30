# 🧹 Suppression du cache lors de la désinstallation Android

## ✅ Configuration appliquée

Le fichier `AndroidManifest.xml` a été modifié pour garantir que toutes les données et le cache sont supprimés lors de la désinstallation de l'app.

## 📋 Modifications dans AndroidManifest.xml

```xml
<application
    android:label="nengoo"
    android:name="${applicationName}"
    android:icon="@mipmap/launcher_icon"
    android:usesCleartextTraffic="true"
    android:allowBackup="false"              <!-- ✨ AJOUTÉ -->
    android:hasFragileUserData="true">       <!-- ✨ AJOUTÉ -->
```

## 🔍 Explication des attributs

### 1. `android:allowBackup="false"`

**Fonction** : Désactive la sauvegarde automatique des données de l'app dans Google Drive.

**Pourquoi ?**
- Par défaut, Android sauvegarde les données de l'app dans le cloud
- Ces données peuvent être restaurées lors d'une réinstallation
- En mettant `false`, on empêche cette sauvegarde
- Les données sont complètement supprimées à la désinstallation

**Impact** :
- ❌ Les utilisateurs ne pourront PAS restaurer leurs données en réinstallant l'app
- ✅ Les données sont définitivement supprimées à la désinstallation

### 2. `android:hasFragileUserData="true"`

**Fonction** : Demande à l'utilisateur s'il souhaite conserver les données lors de la désinstallation.

**Comportement** :
- Lors de la désinstallation, Android affiche une dialog :
  ```
  ╔═══════════════════════════════════╗
  ║  Conserver les données de l'app ? ║
  ║                                   ║
  ║  [ ] Conserver les données        ║
  ║                                   ║
  ║  [Annuler]  [OK]                  ║
  ╚═══════════════════════════════════╝
  ```

- Si l'utilisateur **NE coche PAS** la case : Les données sont supprimées ✅
- Si l'utilisateur **coche** la case : Les données sont conservées ⚠️

**Impact** :
- ✅ Donne le choix à l'utilisateur
- ✅ Par défaut (case non cochée), tout est supprimé

## 📦 Quelles données sont concernées ?

### ✅ Toujours supprimées lors de la désinstallation

1. **SharedPreferences** (LocalCacheManager)
   - Tokens d'authentification
   - Préférences utilisateur
   - Flags et paramètres

2. **Cache interne** (Application Cache Directory)
   - Images téléchargées
   - Fichiers temporaires
   - Cache HTTP

3. **Stockage interne** (Application Documents Directory)
   - Base de données locales (si utilisées)
   - Fichiers de l'application

4. **Code de l'application**
   - APK et fichiers exécutables

### ⚠️ Peuvent persister si mal configurées

1. **Fichiers dans le stockage externe** (External Storage)
   - Photos, vidéos, téléchargements
   - Si l'app utilise `getExternalStorageDirectory()`

2. **Données sauvegardées dans Google Drive** (si `allowBackup="true"`)
   - Peuvent être restaurées lors d'une réinstallation

3. **Bases de données SQLite externes**
   - Si stockées hors du répertoire de l'app

## 🧪 Comment vérifier

### Test 1 : Vérifier le cache après désinstallation

1. **Installer l'app** :
```bash
flutter build apk --release
adb install build/app/outputs/flutter-apk/app-arm64-v8a-release.apk
```

2. **Utiliser l'app** (se connecter, naviguer, charger des images)

3. **Vérifier les données avant désinstallation** :
```bash
# Voir le répertoire de l'app
adb shell ls -la /data/data/com.nengoo.app/

# Voir le cache
adb shell du -sh /data/data/com.nengoo.app/cache/
```

4. **Désinstaller** :
```bash
adb uninstall com.nengoo.app
```

5. **Vérifier que les données sont supprimées** :
```bash
# Ce dossier ne devrait plus exister
adb shell ls -la /data/data/com.nengoo.app/
# Résultat attendu : "No such file or directory" ✅
```

### Test 2 : Vérifier avec Storage Analyzer

1. Installer l'app
2. Utiliser l'app (télécharger des images, se connecter)
3. Aller dans **Paramètres Android** → **Apps** → **Nengoo**
4. Regarder **Stockage** :
   - Données de l'app : XX MB
   - Cache : XX MB
5. Désinstaller l'app
6. Réinstaller et vérifier que tout est à 0

## 📱 Comportement utilisateur

### Scénario 1 : Désinstallation classique (Play Store ou Paramètres)

1. L'utilisateur désinstalle l'app
2. Android affiche : "Conserver les données de l'app ?" avec une case à cocher
3. **Par défaut, la case n'est PAS cochée**
4. L'utilisateur clique sur "OK"
5. ✅ **Toutes les données sont supprimées**

### Scénario 2 : L'utilisateur veut garder ses données

1. L'utilisateur désinstalle l'app
2. Android affiche : "Conserver les données de l'app ?"
3. L'utilisateur **coche la case**
4. L'utilisateur clique sur "OK"
5. ⚠️ **Les données sont conservées**
6. À la réinstallation, l'utilisateur retrouve ses données

## 🔐 Sécurité et confidentialité

### ✅ Avantages

1. **Respect de la vie privée**
   - Les données sensibles ne restent pas sur l'appareil
   - Pas de traces après désinstallation

2. **Conformité RGPD**
   - Droit à l'effacement respecté
   - Pas de données résiduelles

3. **Sécurité**
   - Tokens d'authentification supprimés
   - Pas de données personnelles accessibles

### ⚠️ Inconvénients

1. **Pas de restauration automatique**
   - L'utilisateur doit se reconnecter
   - Préférences perdues

2. **Pas de sauvegarde cloud**
   - `allowBackup="false"` désactive la sauvegarde Google

## 🔄 Alternative : Permettre la sauvegarde cloud

Si vous voulez permettre la restauration des données :

```xml
<application
    android:allowBackup="true"               <!-- ✨ true au lieu de false -->
    android:hasFragileUserData="true"
    android:fullBackupContent="@xml/backup_rules">  <!-- ✨ Règles de sauvegarde -->
```

Créez `android/app/src/main/res/xml/backup_rules.xml` :

```xml
<?xml version="1.0" encoding="utf-8"?>
<full-backup-content>
    <!-- Inclure SharedPreferences -->
    <include domain="sharedpref" path="." />

    <!-- Exclure les tokens sensibles -->
    <exclude domain="sharedpref" path="auth_token" />
    <exclude domain="sharedpref" path="user_id" />

    <!-- Exclure le cache -->
    <exclude domain="cache" path="." />
</full-backup-content>
```

## 📊 Comparaison

| Configuration | Sauvegarde Cloud | Suppression à la désinstallation | Restauration |
|---------------|------------------|----------------------------------|--------------|
| **Actuelle** (`allowBackup="false"`) | ❌ Non | ✅ Oui (complète) | ❌ Non |
| `allowBackup="true"` sans règles | ✅ Oui | ⚠️ Partielle | ✅ Oui |
| `allowBackup="true"` avec règles | ✅ Oui (filtré) | ⚠️ Partielle | ✅ Oui (filtré) |

## 🛠️ Pour tester maintenant

1. **Rebuild l'APK** avec les nouvelles configurations :
```bash
cd nengoo-front
flutter build apk --release
```

2. **Installer sur un téléphone** :
```bash
adb install build/app/outputs/flutter-apk/app-arm64-v8a-release.apk
```

3. **Utiliser l'app** (se connecter, naviguer)

4. **Désinstaller** et vérifier que le dialogue "Conserver les données ?" apparaît

5. **Ne PAS cocher** la case et confirmer

6. **Vérifier** que les données sont bien supprimées (réinstaller et voir que vous devez vous reconnecter)

## 📝 Recommandations

### Pour la production

✅ **Configuration actuelle recommandée** pour :
- Applications e-commerce avec données sensibles
- Respect de la vie privée
- Conformité RGPD

### Si vous voulez ajouter la restauration

- Utilisez `allowBackup="true"` avec des règles strictes
- Excluez les tokens et données sensibles
- Testez la restauration sur plusieurs appareils

## 🔗 Ressources

- [Android Data Backup](https://developer.android.com/guide/topics/data/autobackup)
- [hasFragileUserData](https://developer.android.com/guide/topics/manifest/application-element#fragileuserdata)
- [Data and file storage overview](https://developer.android.com/training/data-storage)

---

**Date** : 2026-01-30
**Fichier modifié** : `android/app/src/main/AndroidManifest.xml`
**Configuration** : Cache supprimé automatiquement à la désinstallation ✅
