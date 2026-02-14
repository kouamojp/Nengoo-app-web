# Changelog - Authentification OAuth Firebase

## [1.1.0] - 2026-02-14

### ✨ Nouvelles fonctionnalités

#### Authentification OAuth
- Ajout de Google Sign-In pour buyers et sellers
- Ajout de Facebook Login pour buyers et sellers
- Ajout de Apple Sign-In pour buyers et sellers (iOS uniquement)
- Support dual platform (Web + Mobile native)
- Auto-registration pour buyers via OAuth
- Linking automatique des comptes par email

#### Composants Frontend
- Nouveau composant `SocialLoginButtons` réutilisable
- Support mode signup/login pour différents contextes
- Messages d'erreur localisés en français
- Loading states individuels par provider
- Design cohérent avec l'UI existante

#### Services Frontend
- Service `authService.js` avec fonctions OAuth complètes
- Support Popup et Redirect pour OAuth web
- Support native flows via Capacitor
- Gestion automatique des redirects OAuth
- Token management et refresh automatique

#### Endpoints Backend
- `POST /api/buyers/oauth-login` - Login/signup buyers via OAuth
- `POST /api/sellers/oauth-login` - Login sellers via OAuth (approval required)
- Vérification tokens Firebase via Admin SDK
- Linking automatique des comptes existants

### 🔧 Modifications

#### Modèles de données
- **Buyer model** :
  - Ajout `oauth_provider` (Optional[str])
  - Ajout `oauth_uid` (Optional[str])
  - Ajout `last_login` (Optional[datetime])
  - `password` devient optionnel (pour OAuth users)

- **Seller model** :
  - Ajout `oauth_provider` (Optional[str])
  - Ajout `oauth_uid` (Optional[str])
  - Ajout `last_login` (Optional[datetime])
  - `password` devient optionnel (pour OAuth users)

#### Pages Auth
- **BuyerSignup.js** : Ajout boutons sociaux (signup + login)
- **SellerSignup.js** : Ajout boutons sociaux (login uniquement)
- Messages explicatifs pour les différents modes

#### Configuration
- Firebase config via variables d'environnement
- Capacitor config pour Firebase Authentication
- Support multi-plateforme (Web, iOS, Android)

### 📦 Dépendances

#### Ajoutées - Frontend
```json
{
  "firebase": "^11.1.0",
  "@capacitor-firebase/authentication": "^6.1.0",
  "@capacitor/browser": "^6.0.0",
  "@capacitor/preferences": "^6.0.0"
}
```

#### Ajoutées - Backend
```
firebase-admin==6.5.0
```

### 📁 Nouveaux fichiers

#### Frontend
- `src/lib/firebaseConfig.js` - Configuration Firebase
- `src/lib/authService.js` - Service d'authentification OAuth
- `src/components/auth/SocialLoginButtons.js` - Composant boutons sociaux
- `.env.local` - Variables d'environnement Firebase (à configurer)
- `android/app/google-services.json.example` - Template Android
- `ios/App/App/GoogleService-Info.plist.example` - Template iOS

#### Backend
- `firebase_admin_config.py` - Configuration Firebase Admin SDK
- `firebase-service-account.json.example` - Template service account
- `.gitignore` - Ignore fichiers sensibles

#### Documentation
- `FIREBASE_SETUP.md` - Guide configuration Firebase complet
- `OAUTH_IMPLEMENTATION_SUMMARY.md` - Résumé technique
- `INSTALLATION_OAUTH.md` - Guide installation rapide
- `CHANGELOG_OAUTH.md` - Ce fichier

### 🔒 Sécurité

#### Implémenté
- Vérification tokens Firebase côté backend
- Validation email required pour OAuth
- Check seller approval status avant OAuth login
- Gestion sécurisée des secrets (gitignore)
- Messages d'erreur sécurisés (pas d'info sensible)
- Token refresh automatique (SDK)

#### Fichiers ignorés
- `backend/firebase-service-account.json`
- `frontend/.env.local`
- `frontend/android/app/google-services.json`
- `frontend/ios/App/App/GoogleService-Info.plist`

### ✅ Compatibilité

#### Rétrocompatibilité
- ✅ Authentification WhatsApp/password conservée
- ✅ Endpoints existants non modifiés
- ✅ Base de données compatible (champs optionnels)
- ✅ Pas de migration forcée
- ✅ Support dual auth indéfini

#### Platforms supportées
- ✅ Web (Chrome, Firefox, Safari, Edge)
- ✅ iOS 11+ (native flows)
- ✅ Android 7+ (native flows)
- ✅ Progressive Web App (PWA)

#### Providers OAuth
| Provider | Web | iOS | Android |
|----------|-----|-----|---------|
| Google   | ✅  | ✅  | ✅      |
| Facebook | ✅  | ✅  | ✅      |
| Apple    | ✅  | ✅  | ❌*     |

*Apple Sign-In non disponible sur Android

### 🐛 Corrections

#### Gestion erreurs
- Gestion popup bloquée → fallback redirect automatique
- Gestion email manquant → message explicite
- Gestion compte existant avec différent provider
- Gestion seller non approuvé → message clair
- Gestion token expiré → refresh automatique

### 📊 Endpoints API

#### Nouveaux
```
POST /api/buyers/oauth-login
  Body: { idToken: string }
  Returns: Buyer

POST /api/sellers/oauth-login
  Body: { idToken: string }
  Returns: Seller (only if approved)
```

#### Inchangés
```
POST /api/buyers/signup
POST /api/buyers/login
POST /api/sellers
POST /api/sellers/login
```

### 🎯 Flows utilisateurs

#### Nouveau buyer via OAuth
```
1. Clic "Continuer avec Google"
2. Authentification Google
3. Compte créé automatiquement
4. Login automatique
5. Redirection homepage
```

#### Buyer existant via OAuth
```
1. Clic "Continuer avec Google"
2. Authentification Google
3. Compte trouvé par email
4. OAuth lié au compte
5. Login automatique
6. Redirection homepage
```

#### Seller login via OAuth
```
1. Clic "Continuer avec Google"
2. Authentification Google
3. Vérification compte approuvé
4. Si approuvé → OAuth lié + login
5. Si non approuvé → Erreur explicite
6. Redirection dashboard seller
```

### 📈 Métriques

#### Nouveaux champs trackés
- `oauth_provider` - Provider utilisé (google.com, facebook.com, apple.com)
- `oauth_uid` - UID Firebase unique
- `last_login` - Dernière connexion

#### Analytics possibles
- Nombre d'utilisateurs par provider
- Taux conversion OAuth vs traditionnel
- Fréquence utilisation par provider
- Taux linking comptes existants

### 🔄 Migration

#### Base de données
**Aucune migration requise** - Les nouveaux champs sont optionnels

Pour les comptes existants :
- `oauth_provider = None` → Pas d'OAuth
- `oauth_uid = None` → Pas d'OAuth
- `last_login = None` → Jamais connecté via OAuth

Lors du premier login OAuth :
- Linking automatique par email
- Champs OAuth remplis automatiquement

#### Code
Aucune modification requise dans le code existant. L'authentification OAuth est additive.

### ⚙️ Configuration requise

#### Firebase Console
- [ ] Créer projet Firebase
- [ ] Activer Authentication
- [ ] Activer Google, Facebook, Apple
- [ ] Enregistrer apps (Web, iOS, Android)
- [ ] Configurer OAuth redirect URIs

#### Google Cloud Console
- [ ] Créer OAuth 2.0 clients (Web, iOS, Android)
- [ ] Configurer origines autorisées
- [ ] Configurer redirects autorisés

#### Facebook Developer
- [ ] Créer application Facebook
- [ ] Activer Facebook Login
- [ ] Configurer OAuth redirect URI
- [ ] Ajouter domaines

#### Apple Developer
- [ ] Créer Services ID
- [ ] Activer Sign In with Apple
- [ ] Configurer return URLs
- [ ] Créer et télécharger Key

📖 **Guide complet** : Voir `FIREBASE_SETUP.md`

### 🚀 Déploiement

#### Prérequis production
1. Configuration Firebase Console complète
2. Fichiers de config en place :
   - `frontend/.env.production`
   - `backend/firebase-service-account.json` (production)
   - `android/app/google-services.json` (production)
   - `ios/App/App/GoogleService-Info.plist` (production)
3. Domaines production autorisés dans Firebase
4. CORS backend configuré pour domaines production
5. OAuth providers configurés pour production

#### Commandes déploiement
```bash
# Frontend
cd frontend
npm run build
npx cap copy

# Backend
cd backend
pip install -r requirements.txt
# Deploy selon votre méthode (Docker, Heroku, etc.)
```

### 📝 Notes de version

#### Breaking Changes
**Aucun** - Version 100% rétrocompatible

#### Deprecations
**Aucune** - Toutes les fonctionnalités existantes conservées

#### Known Issues
- Apple Sign-In pas disponible sur Android (limitation platform)
- Certains comptes Facebook peuvent ne pas avoir d'email public
- Tokens Firebase expirent après 1h (refresh automatique par SDK)

### 🎓 Formation équipe

#### Points clés
1. OAuth est **optionnel** - Les users peuvent toujours utiliser WhatsApp
2. Buyers → auto-registration via OAuth ✅
3. Sellers → login uniquement, pas de signup OAuth ❌
4. Linking automatique par email
5. Tokens vérifiés côté backend (sécurité)

#### Fichiers à connaître
- `authService.js` - Logique OAuth frontend
- `SocialLoginButtons.js` - UI boutons sociaux
- `firebase_admin_config.py` - Vérification tokens backend
- `buyers.py` et `server.py` - Endpoints OAuth

---

## [1.0.0] - Avant OAuth

### Authentification existante
- WhatsApp + password pour buyers
- WhatsApp + password pour sellers
- Système d'approbation sellers
- Reset password via email

---

## Prochaines versions possibles

### [1.2.0] - Améliorations OAuth
- [ ] Support Sign In with Phone (Firebase)
- [ ] Support Email/Password via Firebase (migration)
- [ ] OAuth profile sync (photo, etc.)
- [ ] Multi-device session management

### [1.3.0] - Analytics & Monitoring
- [ ] Dashboard analytics OAuth
- [ ] Tracking conversion rates
- [ ] Monitoring erreurs OAuth
- [ ] A/B testing providers

---

**Version actuelle** : 1.1.0
**Date de release** : 2026-02-14
**Contributeurs** : Nengoo Team + Claude AI
**License** : Propriétaire

---

Pour plus d'informations :
- Installation : `INSTALLATION_OAUTH.md`
- Configuration : `FIREBASE_SETUP.md`
- Documentation technique : `OAUTH_IMPLEMENTATION_SUMMARY.md`
