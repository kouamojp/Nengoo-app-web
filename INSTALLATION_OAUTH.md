# Installation OAuth - Guide rapide

## 🚀 Étapes d'installation

### 1. Installer les dépendances

#### Frontend
```bash
cd frontend
npm install
```

Cela installera automatiquement :
- `firebase` (^11.1.0)
- `@capacitor-firebase/authentication` (^6.1.0)
- `@capacitor/browser` (^6.0.0)
- `@capacitor/preferences` (^6.0.0)

#### Backend
```bash
cd backend
pip install -r requirements.txt
```

Cela installera automatiquement :
- `firebase-admin` (6.5.0)

---

### 2. Configuration Firebase Console

📖 **Suivre le guide détaillé** : `FIREBASE_SETUP.md`

**Résumé rapide** :

1. Créer projet Firebase : [console.firebase.google.com](https://console.firebase.google.com)
2. Activer Authentication → Google, Facebook, Apple
3. Enregistrer applications (Web, iOS, Android)
4. Télécharger fichiers de config :
   - Web : Config object → `.env.local`
   - iOS : `GoogleService-Info.plist`
   - Android : `google-services.json`
   - Backend : Service Account JSON

---

### 3. Placer les fichiers de configuration

#### Frontend - Variables d'environnement
Créer `frontend/.env.local` :
```env
REACT_APP_FIREBASE_API_KEY=AIzaSy...
REACT_APP_FIREBASE_AUTH_DOMAIN=nengoo-xxxxx.firebaseapp.com
REACT_APP_FIREBASE_PROJECT_ID=nengoo-xxxxx
REACT_APP_FIREBASE_STORAGE_BUCKET=nengoo-xxxxx.appspot.com
REACT_APP_FIREBASE_MESSAGING_SENDER_ID=123456789012
REACT_APP_FIREBASE_APP_ID=1:123456789012:web:abcdef...
REACT_APP_API_BASE_URL=http://127.0.0.1:8001/api
```

#### Android
```bash
# Placer google-services.json téléchargé depuis Firebase
cp ~/Downloads/google-services.json frontend/android/app/
```

#### iOS
```bash
# Placer GoogleService-Info.plist téléchargé depuis Firebase
cp ~/Downloads/GoogleService-Info.plist frontend/ios/App/App/
```

#### Backend - Service Account
```bash
# Télécharger depuis Firebase Console → Settings → Service Accounts
# Renommer et placer
cp ~/Downloads/your-project-firebase-adminsdk.json backend/firebase-service-account.json
```

⚠️ **Important** : Ne jamais commit `firebase-service-account.json` sur Git !

---

### 4. Synchroniser Capacitor (mobile)

```bash
cd frontend
npx cap sync
```

Cela synchronise les fichiers web avec les projets iOS/Android.

---

### 5. Démarrer l'application

#### Terminal 1 - Backend
```bash
cd backend
uvicorn server:app --reload
```

Vérifier dans les logs :
```
✅ Firebase Admin SDK initialized successfully
```

Si vous voyez un warning, c'est que `firebase-service-account.json` n'est pas trouvé.

#### Terminal 2 - Frontend
```bash
cd frontend
npm start
```

L'application démarre sur http://localhost:3000

---

### 6. Tester OAuth

1. Ouvrir http://localhost:3000/login/buyer
2. Cliquer sur **"Continuer avec Google"**
3. Sélectionner un compte Google
4. Vérifier :
   - ✅ Redirection vers homepage
   - ✅ `localStorage` contient user
   - ✅ Backend a créé le buyer dans MongoDB

**Logs backend à vérifier** :
```
✅ Token verified for user: abc123...
```

---

## 🐛 Résolution des problèmes courants

### ❌ "Firebase service account file not found"

**Cause** : Fichier `backend/firebase-service-account.json` manquant

**Solution** :
1. Firebase Console → ⚙️ Paramètres → Comptes de service
2. Générer nouvelle clé privée
3. Télécharger et renommer : `firebase-service-account.json`
4. Placer dans `backend/`
5. Redémarrer backend

---

### ❌ "Firebase is not defined" ou erreur import

**Cause** : Dépendances frontend non installées

**Solution** :
```bash
cd frontend
rm -rf node_modules package-lock.json
npm install
```

---

### ❌ Popup bloquée lors du sign-in

**Cause** : Navigateur bloque les popups

**Solution** :
1. Autoriser popups pour localhost
2. Ou utiliser mode redirect (automatique si popup échoue)

---

### ❌ "OAuth authentication is not available"

**Cause** : Firebase Admin SDK non initialisé

**Solution** :
1. Vérifier logs backend au démarrage
2. Vérifier présence de `firebase-service-account.json`
3. Vérifier que le fichier est valide JSON

---

### ❌ Variables d'environnement non chargées

**Cause** : Fichier `.env.local` mal placé ou mal nommé

**Solution** :
```bash
# Vérifier l'emplacement
ls -la frontend/.env.local

# Doit être exactement ".env.local" (pas .env.local.txt)
```

Ensuite, redémarrer le serveur frontend (Ctrl+C puis `npm start`)

---

### ❌ Erreur CORS

**Cause** : Domaine non autorisé

**Solution** :
1. Firebase Console → Authentication → Settings → Authorized domains
2. Ajouter : `localhost`, `127.0.0.1`
3. Pour production : Ajouter `nengoo.com`, `www.nengoo.com`

---

## 📱 Build Mobile

### iOS

```bash
cd frontend
npm run build
npx cap copy ios
npx cap open ios
```

Dans Xcode :
1. Vérifier que `GoogleService-Info.plist` est présent
2. Ajouter capability : **Sign in with Apple**
3. Build et tester sur simulateur/device

### Android

```bash
cd frontend
npm run build
npx cap copy android
npx cap open android
```

Dans Android Studio :
1. Vérifier que `google-services.json` est présent
2. Sync Gradle
3. Build et tester sur émulateur/device

---

## ✅ Checklist de vérification

Avant de tester en production, vérifier :

### Configuration Firebase
- [ ] Projet Firebase créé
- [ ] Authentication activée (Google, Facebook, Apple)
- [ ] Applications enregistrées (Web, iOS, Android)
- [ ] Domaines autorisés configurés

### Fichiers de configuration
- [ ] `frontend/.env.local` existe et contient les bonnes valeurs
- [ ] `backend/firebase-service-account.json` existe
- [ ] `frontend/android/app/google-services.json` existe (pour mobile)
- [ ] `frontend/ios/App/App/GoogleService-Info.plist` existe (pour mobile)

### Installation
- [ ] `npm install` exécuté dans frontend (sans erreurs)
- [ ] `pip install -r requirements.txt` exécuté dans backend
- [ ] `npx cap sync` exécuté (pour mobile)

### Tests fonctionnels
- [ ] Backend démarre sans erreurs Firebase
- [ ] Frontend démarre sur localhost:3000
- [ ] Boutons sociaux visibles sur /login/buyer
- [ ] Google Sign-In fonctionne
- [ ] Facebook Login fonctionne
- [ ] Apple Sign-In fonctionne
- [ ] User créé dans MongoDB après OAuth
- [ ] Redirection après login fonctionne

---

## 🎯 Prochaines étapes

Après installation locale réussie :

1. **Tests complets** : Tous les providers, buyer et seller
2. **Mobile testing** : Build iOS et Android
3. **Configuration production** :
   - Domaines production dans Firebase
   - Variables `.env.production`
   - CORS backend pour domaines prod
4. **OAuth Providers configuration** :
   - Google Cloud Console (OAuth clients)
   - Facebook Developer (app setup)
   - Apple Developer (Services ID)

📖 **Guide complet** : `FIREBASE_SETUP.md`

---

## 📚 Documentation complète

- **Installation** : Ce fichier
- **Configuration Firebase** : `FIREBASE_SETUP.md`
- **Résumé technique** : `OAUTH_IMPLEMENTATION_SUMMARY.md`

---

## 💡 Astuces

### Développement
```bash
# Redémarrer rapide (backend)
cd backend && uvicorn server:app --reload

# Redémarrer rapide (frontend)
cd frontend && npm start

# Vérifier Firebase init
curl http://localhost:8001/api/health  # Si endpoint existe
```

### Debug
```bash
# Voir logs Firebase Admin (backend)
tail -f backend/logs/app.log  # Si logs configurés

# Console navigateur (frontend)
# Ouvrir DevTools → Console
# Chercher : "Firebase initialized" ou erreurs
```

### Reset
```bash
# Reset complet si problèmes
cd frontend
rm -rf node_modules package-lock.json .env.local
npm install

cd backend
rm -rf __pycache__ firebase-service-account.json
pip install -r requirements.txt
```

---

**Temps d'installation estimé** : 30-60 minutes (incluant configuration Firebase)

**Support** : Consulter `FIREBASE_SETUP.md` section Dépannage

Bonne installation ! 🚀
