# Nengoo - Marketplace Camerounaise

Application de marketplace multi-plateforme (Web, iOS, Android) permettant la mise en relation entre acheteurs et vendeurs au Cameroun.

## Table des matières

- [Technologies utilisées](#technologies-utilisées)
- [Prérequis](#prérequis)
- [Installation](#installation)
  - [1. Cloner le projet](#1-cloner-le-projet)
  - [2. Configuration du Backend](#2-configuration-du-backend)
  - [3. Configuration du Frontend](#3-configuration-du-frontend)
- [Lancement de l'application](#lancement-de-lapplication)
  - [Démarrer le Backend](#démarrer-le-backend)
  - [Démarrer le Frontend](#démarrer-le-frontend)
- [Accès aux interfaces](#accès-aux-interfaces)
- [Initialisation de l'administrateur](#initialisation-de-ladministrateur)
- [Structure du projet](#structure-du-projet)
- [Documentation supplémentaire](#documentation-supplémentaire)

---

## Technologies utilisées

### Frontend
- **React** 19.0.0 - Framework JavaScript
- **Tailwind CSS** 3.4.17 - Framework CSS
- **React Router DOM** 7.5.1 - Gestion des routes
- **Axios** 1.8.4 - Client HTTP
- **Capacitor** 6.0.0 - Déploiement mobile (iOS/Android)
- **PWA** - Support des Progressive Web Apps

### Backend
- **FastAPI** 0.110.1 - Framework Python
- **Uvicorn** 0.25.0 - Serveur ASGI
- **MongoDB** 4.5.0 - Base de données NoSQL
- **Motor** 3.3.1 - Driver MongoDB asynchrone
- **PyJWT** 2.10.1 - Authentification JWT
- **BCrypt** 4.0.1 - Hachage des mots de passe

---

## Prérequis

Avant de commencer, assurez-vous d'avoir installé :

### Pour le Backend
- **Python** 3.8 ou supérieur ([Télécharger Python](https://www.python.org/downloads/))
- **MongoDB** ([Télécharger MongoDB](https://www.mongodb.com/try/download/community))
  - MongoDB doit être en cours d'exécution sur `mongodb://localhost:27017/`
  - Ou utilisez MongoDB Atlas (cloud)

### Pour le Frontend
- **Node.js** 14.x ou supérieur ([Télécharger Node.js](https://nodejs.org/))
- **npm** ou **Yarn** (inclus avec Node.js)

### Outils recommandés
- **Git** pour le contrôle de version
- **Un éditeur de code** (VS Code, WebStorm, etc.)

---

## Installation

### 1. Cloner le projet

```bash
git clone <url-du-repo>
cd Nengoo-app-web
```

### 2. Configuration du Backend

#### a) Naviguer vers le dossier backend
```bash
cd backend
```

#### b) Créer un environnement virtuel Python
```bash
# Windows
python -m venv venv
venv\Scripts\activate

# macOS/Linux
python3 -m venv venv
source venv/bin/activate
```

#### c) Installer les dépendances
```bash
pip install -r requirements.txt
```

#### d) Configuration des variables d'environnement
Le fichier `.env` existe déjà dans le dossier backend avec la configuration suivante :

```env
MONGO_URL=mongodb://localhost:27017/
DB_NAME=nengoo
JWT_SECRET_KEY=your-secret-key-here
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=43200
```

**Note:** Pour la production, modifiez le `JWT_SECRET_KEY` avec une valeur sécurisée.

#### e) Démarrer MongoDB
Assurez-vous que MongoDB est en cours d'exécution :

```bash
# Windows (si MongoDB est installé en tant que service)
net start MongoDB

# macOS/Linux
mongod

# Ou utilisez MongoDB Compass pour démarrer MongoDB
```

---

### 3. Configuration du Frontend

#### a) Naviguer vers le dossier frontend
```bash
cd ../frontend
```

#### b) Installer les dépendances
```bash
# Avec npm
npm install

# Ou avec Yarn (recommandé)
yarn install
```

#### c) Vérifier la configuration
Le fichier `.env` existe déjà dans le dossier frontend :

```env
REACT_APP_API_BASE_URL=http://localhost:8001/api
```

Cette configuration permet au frontend de communiquer avec le backend.

---

## Lancement de l'application

### Démarrer le Backend

1. Ouvrez un terminal
2. Activez l'environnement virtuel (si ce n'est pas déjà fait)
3. Démarrez le serveur FastAPI :

```bash
cd backend
# Activer l'environnement virtuel
# Windows: venv\Scripts\activate
# macOS/Linux: source venv/bin/activate

# Démarrer le serveur
uvicorn server:app --reload --port 8001
```

Le backend sera accessible sur : **http://localhost:8001**

**Swagger API Documentation** : http://localhost:8001/docs

---

### Démarrer le Frontend

1. Ouvrez un **nouveau terminal** (gardez le backend en cours d'exécution)
2. Démarrez l'application React :

```bash
cd frontend

# Avec npm
npm start

# Ou avec Yarn
yarn start
```

Le frontend sera accessible sur : **http://localhost:3000**

L'application s'ouvrira automatiquement dans votre navigateur par défaut.

---

## Accès aux interfaces

### Interface Acheteur
- **URL** : http://localhost:3000/
- **Fonctionnalités** :
  - Navigation du catalogue de produits
  - Recherche et filtrage
  - Ajout au panier
  - Processus de commande
  - Création de compte acheteur

### Interface Vendeur
- **URL** : http://localhost:3000/seller/login
- **Inscription** : http://localhost:3000/seller/signup
- **Fonctionnalités** :
  - Gestion des produits
  - Suivi des commandes
  - Tableau de bord des ventes
  - Messagerie
  - Profil vendeur
- **Note** : Les vendeurs doivent être approuvés par un administrateur

### Interface Administrateur
- **URL** : http://localhost:3000/admin/login
- **Fonctionnalités** :
  - Gestion des acheteurs
  - Approbation/gestion des vendeurs
  - Gestion des produits et catégories
  - Suivi des commandes
  - Statistiques globales

---

## Initialisation de l'administrateur

Pour créer le compte administrateur par défaut :

```bash
cd backend
python init_admin_simple.py
```

**Identifiants par défaut** :
- **Nom d'utilisateur** : `admin`
- **Mot de passe** : `admin123`

**Important** : Changez ces identifiants en production !

---

## Structure du projet

```
Nengoo-app-web/
├── backend/                    # API Backend (FastAPI + MongoDB)
│   ├── server.py              # Application principale FastAPI
│   ├── requirements.txt       # Dépendances Python
│   ├── .env                   # Variables d'environnement
│   ├── uploads/               # Fichiers uploadés (images produits)
│   ├── venv/                  # Environnement virtuel Python
│   └── init_admin_simple.py   # Script d'initialisation admin
│
├── frontend/                   # Application React
│   ├── src/
│   │   ├── components/        # Composants React (37+ composants)
│   │   ├── services/
│   │   │   └── api.js        # Service d'API REST
│   │   ├── App.js            # Composant racine
│   │   └── index.js          # Point d'entrée
│   │
│   ├── public/                # Ressources statiques
│   │   ├── index.html        # HTML principal
│   │   ├── manifest.json     # Configuration PWA
│   │   └── sw.js             # Service Worker
│   │
│   ├── build/                 # Build de production
│   ├── package.json          # Dépendances Node.js
│   ├── .env                  # Variables d'environnement
│   ├── capacitor.config.json # Configuration mobile
│   └── tailwind.config.js    # Configuration Tailwind CSS
│
└── Documentation/             # Guides et documentation
```

---

## Base de données MongoDB

### Collections principales

- **admins** - Comptes administrateurs
- **buyers** - Comptes acheteurs
- **sellers** - Comptes vendeurs
- **products** - Catalogue de produits
- **categories** - Catégories de produits
- **orders** - Commandes

### Connexion

Par défaut, l'application se connecte à MongoDB en local :
```
mongodb://localhost:27017/
Base de données : nengoo
```

Pour utiliser MongoDB Atlas (cloud), modifiez `MONGO_URL` dans `backend/.env`.

---

## Déploiement Mobile

L'application utilise **Capacitor** pour le déploiement iOS et Android.

### Build pour mobile
```bash
cd frontend

# Build de production
npm run build:mobile

# Déployer sur iOS
npm run deploy:ios

# Déployer sur Android
npm run deploy:android
```

### Configuration Capacitor
Voir le fichier `frontend/capacitor.config.json` pour personnaliser :
- App ID : `com.nengoo.cameroon`
- Nom de l'application
- URL du serveur

---

## Scripts utiles

### Backend
```bash
# Démarrer le serveur en mode développement
uvicorn server:app --reload --port 8001

# Créer un administrateur
python init_admin_simple.py

# Exécuter les tests
pytest

# Formater le code
black .

# Vérifier le code
flake8
mypy .
```

### Frontend
```bash
# Démarrer en développement
npm start

# Build de production
npm run build

# Exécuter les tests
npm test

# Éjecter la configuration CRA (non recommandé)
npm run eject
```

---

## Résolution de problèmes

### Le backend ne démarre pas
- Vérifiez que MongoDB est en cours d'exécution
- Vérifiez que le port 8001 n'est pas déjà utilisé
- Assurez-vous que l'environnement virtuel est activé
- Vérifiez les logs d'erreur dans le terminal

### Le frontend ne peut pas se connecter au backend
- Vérifiez que le backend est en cours d'exécution sur le port 8001
- Vérifiez la variable `REACT_APP_API_BASE_URL` dans `frontend/.env`
- Vérifiez la console du navigateur pour les erreurs CORS

### Problèmes de dépendances
```bash
# Backend - Réinstaller les dépendances
cd backend
pip install --upgrade -r requirements.txt

# Frontend - Nettoyer et réinstaller
cd frontend
rm -rf node_modules
npm install
# ou
yarn install
```

---

## Documentation supplémentaire

Pour plus d'informations, consultez les guides suivants :

- `DEMARRAGE_RAPIDE.md` - Guide de démarrage rapide
- `SETUP.md` - Configuration détaillée
- `README_ADMIN.md` - Guide administrateur
- `API_PUBLIQUES_GUIDE.md` - Documentation des API publiques
- `CHANGEMENTS.md` - Liste des modifications

---

## Support et Contact

Pour toute question ou problème, consultez la documentation ou contactez l'équipe de développement.

---

## Licence

[Spécifiez votre licence ici]

---

**Dernière mise à jour** : Janvier 2025
**Version** : 1.0.0
