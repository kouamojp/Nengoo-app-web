# 🚀 Quick Start - OAuth Firebase

Guide ultra-rapide pour démarrer avec OAuth en 10 minutes.

---

## ⚡ Installation rapide (10 minutes)

### 1️⃣ Installer dépendances (2 min)

```bash
# Terminal 1
cd frontend && npm install

# Terminal 2
cd backend && pip install -r requirements.txt
```

### 2️⃣ Configuration Firebase (5 min)

1. **Créer projet** : [console.firebase.google.com](https://console.firebase.google.com)
2. **Activer Auth** : Authentication → Google/Facebook/Apple → Enable
3. **Web app** : Project Settings → Add app (Web) → Copy config

### 3️⃣ Variables d'environnement (1 min)

Créer `frontend/.env.local` :
```env
REACT_APP_FIREBASE_API_KEY=votre-key
REACT_APP_FIREBASE_AUTH_DOMAIN=votre-project.firebaseapp.com
REACT_APP_FIREBASE_PROJECT_ID=votre-project
REACT_APP_FIREBASE_STORAGE_BUCKET=votre-project.appspot.com
REACT_APP_FIREBASE_MESSAGING_SENDER_ID=123456789
REACT_APP_FIREBASE_APP_ID=1:123:web:abc
REACT_APP_API_BASE_URL=http://127.0.0.1:8001/api
```

### 4️⃣ Service Account (2 min)

Firebase Console → ⚙️ Settings → Service Accounts → Generate Key

```bash
# Placer le fichier téléchargé
mv ~/Downloads/fichier-firebase.json backend/firebase-service-account.json
```

### 5️⃣ Démarrer (30 sec)

```bash
# Terminal 1 - Backend
cd backend && uvicorn server:app --reload

# Terminal 2 - Frontend
cd frontend && npm start
```

### 6️⃣ Tester (30 sec)

1. Ouvrir http://localhost:3000/login/buyer
2. Cliquer "Continuer avec Google"
3. Se connecter
4. ✅ Redirection vers homepage

---

## 🎯 C'est tout !

**Si ça marche** : OAuth est opérationnel ! 🎉

**Si erreur** : Voir `FIREBASE_SETUP.md` section Dépannage

---

## 📖 Documentation complète

- **Guide complet** : `FIREBASE_SETUP.md`
- **Installation détaillée** : `INSTALLATION_OAUTH.md`
- **Documentation technique** : `OAUTH_IMPLEMENTATION_SUMMARY.md`
- **Prochaines étapes** : `NEXT_STEPS.md`

---

## 🐛 Problèmes fréquents

| Erreur | Solution rapide |
|--------|----------------|
| "Firebase service account not found" | Vérifier `backend/firebase-service-account.json` existe |
| Variables env non chargées | Redémarrer `npm start` |
| Popup bloquée | Autoriser popups (ou fallback redirect auto) |
| CORS error | Ajouter `localhost` dans Firebase Authorized domains |

---

## ✅ Checklist minimale

- [ ] `npm install` OK
- [ ] `pip install` OK
- [ ] `.env.local` créé
- [ ] `firebase-service-account.json` créé
- [ ] Backend démarre sans erreur Firebase
- [ ] Frontend démarre
- [ ] Google Sign-In fonctionne

---

**Temps total** : 10 minutes ⚡

**Prochaine étape** : Tests complets → `NEXT_STEPS.md`

Bon dev ! 🚀
