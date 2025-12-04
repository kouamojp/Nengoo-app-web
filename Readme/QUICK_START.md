# ⚡ Guide de Démarrage Rapide - Nengoo

## 🎯 Installation en 5 Minutes

### Option 1: PWA (Le Plus Rapide) ⭐

#### Sur Mobile (Android/iOS):
1. Ouvrir: https://wildnengoo.preview.emergentagent.com
2. Cliquer sur **"Installer l'App"** dans le header
3. Confirmer l'installation
4. ✅ C'est installé! Icône sur votre écran d'accueil

#### Sur Desktop:
1. Ouvrir: https://wildnengoo.preview.emergentagent.com
2. Cliquer sur l'icône ⊕ dans la barre d'adresse (Chrome)
3. Cliquer sur "Installer"
4. ✅ Application installée!

---

### Option 2: Build Android

```bash
cd /app/frontend

# 1. Build
yarn build:pwa

# 2. Synchroniser
npx cap sync android

# 3. Ouvrir Android Studio
npx cap open android

# 4. Dans Android Studio:
# Build → Generate Signed Bundle / APK → APK
# Choisir Release → Build

# 5. APK sera dans:
# android/app/build/outputs/apk/release/app-release.apk
```

---

### Option 3: Build iOS

```bash
cd /app/frontend

# 1. Build
yarn build:pwa

# 2. Installer pods
cd ios/App && pod install && cd ../..

# 3. Synchroniser
npx cap sync ios

# 4. Ouvrir Xcode
npx cap open ios

# 5. Dans Xcode:
# Product → Archive
# Distribute App → App Store Connect
```

---

## 🔐 Accès Admin

```
URL: https://wildnengoo.preview.emergentagent.com/admin/login
WhatsApp: +237600000000
Code: ADMIN2025
```

---

## 📱 Fonctionnalités Disponibles

### ✅ Pour Tous
- Navigation du catalogue
- Recherche produits
- Détails produits
- Panier d'achat
- Contact vendeurs WhatsApp

### ✅ Acheteurs (Inscription)
- Passer commande
- Suivi commandes
- Profil utilisateur
- Adresses de livraison
- Méthodes de paiement

### ✅ Vendeurs (Approbation requise)
- Dashboard vendeur
- Gestion produits
- Suivi commandes
- Analytics

### ✅ Admin
- Approuver vendeurs
- Gérer utilisateurs
- Valider produits
- Voir toutes les commandes

---

## 🛠️ Commandes Utiles

### Développement
```bash
# Frontend
cd /app/frontend
yarn start              # Dev server (http://localhost:3000)

# Backend
cd /app/backend
uvicorn server:app --port 8001 # API (http://localhost:8001)
```

### Production
```bash
# Build PWA
yarn build:pwa

# Redémarrer services
sudo supervisorctl restart all
```

### Mobile
```bash
# Sync changes
npx cap sync

# Run Android
npx cap run android

# Run iOS
npx cap run ios
```

---

## 📂 Fichiers Importants

| Fichier | Description |
|---------|-------------|
| `/app/ADMIN_ACCESS.md` | Guide complet admin |
| `/app/MOBILE_BUILD_GUIDE.md` | Build Android/iOS détaillé |
| `/app/DATABASE_SCHEMA.md` | Structure base de données |
| `/app/README_COMPLETE.md` | Documentation complète |
| `/app/frontend/src/components.js` | Tous les composants React |
| `/app/frontend/src/App.js` | Routes principales |
| `/app/frontend/capacitor.config.json` | Config mobile |

---

## 🎨 Personnalisation

### Changer le thème:
Éditer `/app/frontend/src/App.css` ou TailwindCSS classes

### Changer le logo:
Remplacer `/app/frontend/public/logo512.png`

### Changer les identifiants admin:
Éditer `/app/frontend/src/components.js`:
```javascript
adminCredentials: {
  whatsapp: '+237XXXXXXXXX',
  accessCode: 'NOUVEAU_CODE'
}
```

---

## 🐛 Problèmes Courants

### PWA ne s'installe pas
- Vérifier HTTPS activé
- Vider le cache du navigateur
- Recharger la page

### Android build échoue
```bash
# Nettoyer et rebuild
cd /app/frontend/android
./gradlew clean
cd ..
npx cap sync android
```

### iOS pod install échoue
```bash
cd /app/frontend/ios/App
pod repo update
pod install --repo-update
```

### Backend ne démarre pas
```bash
# Vérifier les logs
tail -f /var/log/supervisor/backend.err.log

# Redémarrer
sudo supervisorctl restart backend
```

---

## 🚀 Déploiement Rapide

### Netlify (PWA):
```bash
cd /app/frontend
yarn build:pwa
# Upload dossier 'build' sur Netlify
```

### Vercel (PWA):
```bash
cd /app/frontend
vercel --prod
```

### Google Play Store:
1. Build AAB (voir ci-dessus)
2. Créer compte Play Console ($25)
3. Upload AAB
4. Remplir infos app
5. Publier

### Apple App Store:
1. Build Archive (voir ci-dessus)
2. Compte Apple Developer ($99/an)
3. Upload via Xcode
4. Remplir infos app
5. Soumettre pour review

---

## 📞 Besoin d'Aide?

### Documentation:
- 📖 Lire `/app/README_COMPLETE.md`
- 📱 Consulter `/app/MOBILE_BUILD_GUIDE.md`
- 🗄️ Voir `/app/DATABASE_SCHEMA.md`

### Ressources Externes:
- Capacitor: https://capacitorjs.com
- React: https://react.dev
- MongoDB: https://docs.mongodb.com

---

## ✅ Checklist de Lancement

### Avant de publier:
- [ ] Changer le code admin
- [ ] Créer un keystore Android
- [ ] Configurer Apple Developer
- [ ] Préparer captures d'écran
- [ ] Créer icône 1024x1024
- [ ] Tester sur plusieurs appareils
- [ ] Vérifier HTTPS
- [ ] Configurer domaine personnalisé
- [ ] Préparer descriptions store
- [ ] Activer analytics

---

## 🎉 C'est Tout!

**3 façons d'utiliser Nengoo:**
1. 🌐 PWA - Installation instantanée
2. 🤖 Android - Play Store ou APK
3. 🍎 iOS - App Store

**Tout est prêt et fonctionnel!** 🚀

---

**Nengoo - Marketplace Camerounaise** 🇨🇲 🛍️
