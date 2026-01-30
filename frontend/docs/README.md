# ⚛️ Documentation Frontend React - Nengoo Web

Ce dossier contient la documentation spécifique à l'application web React Nengoo.

## 📄 Fichiers disponibles

*(Aucun fichier de documentation spécifique pour le moment)*

## 🚀 Démarrage rapide

```bash
cd frontend
npm install
npm start
```

L'application sera disponible sur `http://localhost:3000`

## 📚 Architecture

### Structure du projet

```
frontend/
├── public/          # Fichiers statiques
├── src/
│   ├── components/  # Composants réutilisables
│   ├── pages/       # Pages de l'application
│   ├── services/    # Services API
│   ├── utils/       # Utilitaires
│   └── App.js       # Composant principal
└── package.json
```

## 🔧 Configuration

### Variables d'environnement

Créez un fichier `.env` à la racine du projet frontend :

```env
REACT_APP_API_URL=http://localhost:8001
REACT_APP_ENV=development
```

### Backend API

L'application frontend communique avec le backend FastAPI sur `http://localhost:8001/api/`

## 📝 Composants principaux

### Pages

- **Home** : Page d'accueil
- **Products** : Liste des produits
- **ProductDetails** : Détails d'un produit
- **About** : Page À propos
- **Admin** : Dashboard administrateur

### Services

- **API Client** : Gestion des appels API
- **Auth Service** : Authentification
- **Product Service** : Gestion des produits

## 🐛 Dépannage

### Problème de connexion au backend

Si l'application ne peut pas se connecter au backend :

1. Vérifiez que le backend est lancé : `curl http://localhost:8001/api/`
2. Vérifiez la configuration CORS dans `backend/server.py`
3. Vérifiez l'URL dans `.env` ou les constantes

### Erreurs de build

```bash
# Nettoyer et réinstaller les dépendances
rm -rf node_modules package-lock.json
npm install
```

## 📚 Documentation externe

- [React Documentation](https://react.dev/)
- [Create React App](https://create-react-app.dev/)
- [Backend API](../../backend/docs/)

---

**Dernière mise à jour** : 2026-01-30
