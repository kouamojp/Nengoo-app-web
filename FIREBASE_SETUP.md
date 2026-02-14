# Configuration Firebase - Authentification OAuth (Google, Facebook, Apple)

Ce guide explique comment configurer Firebase Authentication pour Nengoo.

## 📋 Prérequis

1. **Compte Firebase** : [console.firebase.google.com](https://console.firebase.google.com)
2. **Google Cloud Console** (pour Google Sign-In)
3. **Facebook Developer** (pour Facebook Login)
4. **Apple Developer** (pour Apple Sign-In) - iOS uniquement

---

## 🔥 Phase 1 : Configuration Firebase Console

### 1. Créer un projet Firebase

1. Aller sur [Firebase Console](https://console.firebase.google.com)
2. Cliquer sur "Ajouter un projet"
3. Nom : `Nengoo Marketplace`
4. Activer Google Analytics (optionnel)

### 2. Activer Authentication

1. Dans le menu latéral : **Authentication** → **Get Started**
2. Onglet **Sign-in method**
3. Activer les méthodes suivantes :

#### ✅ Google
- Cliquer sur **Google** → **Activer**
- Email d'assistance : votre email
- Enregistrer

#### ✅ Facebook
- Cliquer sur **Facebook** → **Activer**
- **App ID** : Obtenir depuis [Facebook Developer Console](https://developers.facebook.com)
- **App Secret** : Obtenir depuis Facebook Developer Console
- Copier l'**URL de redirection OAuth** (ex: `https://nengoo-xxxxx.firebaseapp.com/__/auth/handler`)
- Coller cette URL dans Facebook Developer Console → Produits → Facebook Login → Paramètres → URI de redirection OAuth valides
- Enregistrer

#### ✅ Apple
- Cliquer sur **Apple** → **Activer**
- **Services ID** : Créer sur [Apple Developer](https://developer.apple.com)
- **Team ID**, **Key ID**, **Private Key** : Obtenir depuis Apple Developer
- Enregistrer

### 3. Enregistrer les applications

#### 🌐 Application Web

1. Project Overview → **⚙️ Paramètres du projet**
2. Section **Vos applications** → Cliquer sur **</>** (Web)
3. **Nom de l'app** : `Nengoo Web`
4. **Firebase Hosting** : Non (sauf si vous utilisez Firebase Hosting)
5. Copier la configuration Firebase :

```javascript
const firebaseConfig = {
  apiKey: "AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
  authDomain: "nengoo-xxxxx.firebaseapp.com",
  projectId: "nengoo-xxxxx",
  storageBucket: "nengoo-xxxxx.appspot.com",
  messagingSenderId: "123456789012",
  appId: "1:123456789012:web:abcdefghijklmnop"
};
```

6. **Ajouter ces valeurs dans `frontend/.env.local`** :

```env
REACT_APP_FIREBASE_API_KEY=AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
REACT_APP_FIREBASE_AUTH_DOMAIN=nengoo-xxxxx.firebaseapp.com
REACT_APP_FIREBASE_PROJECT_ID=nengoo-xxxxx
REACT_APP_FIREBASE_STORAGE_BUCKET=nengoo-xxxxx.appspot.com
REACT_APP_FIREBASE_MESSAGING_SENDER_ID=123456789012
REACT_APP_FIREBASE_APP_ID=1:123456789012:web:abcdefghijklmnop
```

#### 📱 Application iOS

1. Project Overview → **Ajouter une application** → **iOS**
2. **Bundle ID** : `com.nengoo.cameroon`
3. Télécharger `GoogleService-Info.plist`
4. **Placer le fichier** : `frontend/ios/App/App/GoogleService-Info.plist`
5. Ouvrir Xcode et ajouter le fichier au projet
6. Dans Xcode → Capabilities → **+ Sign in with Apple**

#### 🤖 Application Android

1. Project Overview → **Ajouter une application** → **Android**
2. **Package name** : `com.nengoo.cameroon`
3. **SHA-1** : Obtenir avec `keytool -list -v -keystore ~/.android/debug.keystore -alias androiddebugkey -storepass android -keypass android`
4. Télécharger `google-services.json`
5. **Placer le fichier** : `frontend/android/app/google-services.json`

---

## 🔧 Phase 2 : Configuration Backend

### 1. Télécharger Service Account

1. Firebase Console → **⚙️ Paramètres du projet** → **Comptes de service**
2. Cliquer sur **Générer une nouvelle clé privée**
3. Télécharger le fichier JSON
4. **Renommer** : `firebase-service-account.json`
5. **Placer** : `backend/firebase-service-account.json`

⚠️ **IMPORTANT** : Ne jamais commit ce fichier sur Git !

### 2. Ajouter au .gitignore

Ajouter dans `backend/.gitignore` :
```
firebase-service-account.json
```

### 3. Variables d'environnement (optionnel)

Si vous voulez un chemin personnalisé, ajoutez dans `backend/.env` :
```env
FIREBASE_SERVICE_ACCOUNT_PATH=/chemin/vers/firebase-service-account.json
```

---

## 🌍 Phase 3 : Configuration OAuth Providers

### Google Cloud Console

1. [Google Cloud Console](https://console.cloud.google.com)
2. Sélectionner votre projet Firebase
3. **APIs & Services** → **Credentials**
4. **OAuth 2.0 Client IDs** :

   **Web Client** :
   - Origines JavaScript autorisées :
     - `http://localhost:3000`
     - `https://nengoo.com`
     - `https://www.nengoo.com`
   - URI de redirection autorisés :
     - `http://localhost:3000`
     - `https://nengoo.com`

   **Android Client** :
   - Package name : `com.nengoo.cameroon`
   - SHA-1 : Votre clé SHA-1

   **iOS Client** :
   - Bundle ID : `com.nengoo.cameroon`

### Facebook Developer Console

1. [Facebook Developer](https://developers.facebook.com)
2. Créer une application → **Consumer**
3. Ajouter produit → **Facebook Login**
4. **Paramètres** :
   - URI de redirection OAuth valides :
     - `https://nengoo-xxxxx.firebaseapp.com/__/auth/handler`
   - Domaines d'application :
     - `nengoo.com`
     - `localhost`
5. **Paramètres de base** :
   - Domaines de l'application : `nengoo.com`
6. Copier **App ID** et **App Secret** → Coller dans Firebase Console

### Apple Developer

1. [Apple Developer](https://developer.apple.com)
2. **Certificates, Identifiers & Profiles**
3. **Identifiers** → **+ (Create)**
4. **Services ID** :
   - Description : `Nengoo Marketplace`
   - Identifier : `com.nengoo.cameroon.signin`
   - Activer **Sign In with Apple**
   - Return URLs : `https://nengoo-xxxxx.firebaseapp.com/__/auth/handler`
5. **Keys** → **+ (Create)** :
   - Activer **Sign In with Apple**
   - Télécharger la clé (.p8)
6. Copier **Team ID**, **Key ID**, **Services ID** → Coller dans Firebase Console

---

## 🚀 Phase 4 : Installation des dépendances

### Frontend
```bash
cd frontend
npm install firebase @capacitor-firebase/authentication @capacitor/browser @capacitor/preferences
npx cap sync
```

### Backend
```bash
cd backend
pip install firebase-admin
```

---

## ✅ Phase 5 : Vérification

### Frontend

1. Vérifier que `.env.local` contient les variables Firebase
2. Vérifier que `firebaseConfig.js` charge les variables
3. Tester l'import :
```javascript
import { auth } from './lib/firebaseConfig';
console.log('Firebase Auth:', auth);
```

### Backend

1. Vérifier que `firebase-service-account.json` existe dans `backend/`
2. Démarrer le serveur :
```bash
uvicorn server:app --reload
```
3. Chercher dans les logs : `✅ Firebase Admin SDK initialized successfully`

### Test OAuth Web

1. Démarrer frontend : `npm start`
2. Aller sur `/login/buyer`
3. Cliquer "Continuer avec Google"
4. Se connecter avec un compte Google
5. Vérifier redirection vers homepage
6. Vérifier `localStorage` contient user

---

## 🐛 Dépannage

### ❌ "Firebase service account file not found"
- Vérifier que `backend/firebase-service-account.json` existe
- Redémarrer le serveur backend

### ❌ "OAuth authentication is not available"
- Firebase Admin SDK non initialisé
- Vérifier les logs backend au démarrage

### ❌ "popup-blocked"
- Autoriser les popups dans le navigateur
- Ou utiliser le mode redirect (automatique)

### ❌ "account-exists-with-different-credential"
- Un compte existe déjà avec cet email via une autre méthode
- Utiliser la méthode de connexion originale

### ❌ Token expired
- Les tokens Firebase expirent après 1h
- Le SDK rafraîchit automatiquement
- Si problème persiste, se reconnecter

---

## 📱 Configuration Mobile (iOS/Android)

### iOS

1. Ouvrir Xcode : `npx cap open ios`
2. Vérifier que `GoogleService-Info.plist` est dans le projet
3. **Info.plist** → Ajouter URL Schemes :
```xml
<key>CFBundleURLTypes</key>
<array>
    <dict>
        <key>CFBundleURLSchemes</key>
        <array>
            <string>com.googleusercontent.apps.YOUR-REVERSED-CLIENT-ID</string>
        </array>
    </dict>
</array>
```
4. Podfile → Installer dépendances :
```bash
cd ios/App
pod install
```

### Android

1. Vérifier `google-services.json` dans `android/app/`
2. Sync Gradle
3. Build : `npm run deploy:android`

---

## 🔒 Sécurité

### Production

1. **Domaines autorisés** (Firebase Console → Authentication → Settings) :
   - `nengoo.com`
   - `www.nengoo.com`

2. **CORS Backend** : Ajouter dans `server.py` :
```python
origins = [
    "https://nengoo.com",
    "https://www.nengoo.com",
    "https://nengoo-xxxxx.firebaseapp.com",  # Firebase Hosting
]
```

3. **Variables d'environnement** :
   - `.env.production` pour frontend
   - `.env` pour backend
   - Ne jamais commit les secrets

---

## 📚 Ressources

- [Firebase Docs](https://firebase.google.com/docs/auth)
- [Capacitor Firebase](https://github.com/capawesome-team/capacitor-firebase)
- [Google Sign-In](https://developers.google.com/identity)
- [Facebook Login](https://developers.facebook.com/docs/facebook-login)
- [Apple Sign-In](https://developer.apple.com/sign-in-with-apple/)

---

## ✨ Fichiers créés/modifiés

### Nouveaux fichiers
- ✅ `frontend/src/lib/firebaseConfig.js`
- ✅ `frontend/src/lib/authService.js`
- ✅ `frontend/src/components/auth/SocialLoginButtons.js`
- ✅ `backend/firebase_admin_config.py`
- ✅ `frontend/.env.local`
- ✅ `backend/firebase-service-account.json` (à créer)
- ✅ `frontend/android/app/google-services.json` (à télécharger)
- ✅ `frontend/ios/App/App/GoogleService-Info.plist` (à télécharger)

### Fichiers modifiés
- ✅ `frontend/src/components/auth/BuyerSignup.js`
- ✅ `frontend/src/components/auth/SellerSignup.js`
- ✅ `backend/routers/buyers.py`
- ✅ `backend/server.py`
- ✅ `frontend/package.json`
- ✅ `backend/requirements.txt`
- ✅ `frontend/capacitor.config.json`

---

**Prochaines étapes** : Après avoir configuré Firebase Console et téléchargé les fichiers, exécutez :

```bash
# Frontend
cd frontend
npm install
npx cap sync

# Backend
cd backend
pip install -r requirements.txt
uvicorn server:app --reload

# Frontend
cd frontend
npm start
```

Testez la connexion OAuth sur http://localhost:3000/login/buyer 🎉
