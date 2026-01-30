# 🛍️ Nengoo - Plateforme E-commerce Multi-Canal

Nengoo est une plateforme e-commerce complète avec application web React, application mobile Flutter et backend FastAPI.

## 📁 Structure du projet

```
Nengoo-app-web/
├── backend/              # API Backend (FastAPI + MongoDB)
│   ├── server.py        # Application principale
│   ├── docs/            # 📚 Documentation backend
│   └── ...
│
├── frontend/            # Application Web (React)
│   ├── src/            # Code source React
│   ├── docs/           # 📚 Documentation frontend
│   └── ...
│
├── nengoo-front/        # Application Mobile (Flutter)
│   ├── lib/            # Code source Flutter
│   ├── docs/           # 📚 Documentation Flutter
│   └── ...
│
└── docs/               # 📚 Documentation globale du projet
    ├── AWS_S3_CORS_CONFIGURATION.md
    ├── FIX_LOGIN_PROBLEM.md
    ├── SEO_CHECKLIST.md
    ├── SEO_GUIDE.md
    └── ...
```

## 🚀 Démarrage rapide

### Prérequis

- **Backend** : Python 3.9+, MongoDB
- **Frontend** : Node.js 16+, npm
- **Mobile** : Flutter 3.0+, Dart 3.0+

### 1. Backend (FastAPI)

```bash
cd backend
pip install -r requirements.txt
python server.py
```

➡️ Serveur disponible sur `http://localhost:8001`
📖 [Documentation backend](./backend/docs/)

### 2. Frontend Web (React)

```bash
cd frontend
npm install
npm start
```

➡️ Application disponible sur `http://localhost:3000`
📖 [Documentation frontend](./frontend/docs/)

### 3. Application Mobile (Flutter)

```bash
cd nengoo-front
flutter pub get
flutter run
```

📖 [Documentation Flutter](./nengoo-front/docs/)

## 📚 Documentation

### Documentation globale

Toute la documentation du projet se trouve dans le dossier **[`/docs`](./docs/)**

- **Configuration** : AWS S3, CORS, Variables d'environnement
- **SEO** : Guides et checklists d'optimisation
- **Fixes** : Solutions aux problèmes courants
- **Logs** : Historique de développement

### Documentation par sous-projet

| Projet | Documentation |
|--------|---------------|
| **Backend FastAPI** | [`/backend/docs`](./backend/docs/) |
| **Frontend React** | [`/frontend/docs`](./frontend/docs/) |
| **App Flutter** | [`/nengoo-front/docs`](./nengoo-front/docs/) |

## 🔧 Configuration

### Variables d'environnement

#### Backend (`backend/.env`)

```env
MONGO_URL=mongodb://localhost:27017
DB_NAME=nengoo
AWS_ACCESS_KEY_ID=your_key
AWS_SECRET_ACCESS_KEY=your_secret
AWS_REGION=us-east-1
S3_BUCKET_NAME=nengoo-bucket
```

#### Frontend (`frontend/.env`)

```env
REACT_APP_API_URL=http://localhost:8001
```

#### Flutter

Configuration automatique selon la plateforme dans `lib/helper/url.dart`

## 🏗️ Architecture

```
┌─────────────────┐
│  Mobile Flutter │
│  (Android/iOS)  │
└────────┬────────┘
         │
         │ HTTP
         │
┌────────▼────────┐       ┌──────────────┐
│   Web React     │◄──────┤   Backend    │
│  (localhost:3000│       │   FastAPI    │
└─────────────────┘       │ (port 8001)  │
                          └──────┬───────┘
                                 │
                          ┌──────▼───────┐
                          │   MongoDB    │
                          │  + AWS S3    │
                          └──────────────┘
```

## 📡 Endpoints API principaux

### Authentification

- `POST /api/sellers/login` - Connexion vendeur
- `POST /api/buyers/login` - Connexion acheteur
- `POST /api/buyers/register` - Inscription acheteur

### Produits

- `GET /api/products` - Liste des produits
- `GET /api/products/{id}` - Détails d'un produit
- `POST /api/products` - Créer un produit (seller/admin)

### Catégories

- `GET /api/categories` - Liste des catégories

### Commandes

- `POST /api/checkout` - Créer une commande

Documentation API complète : `http://localhost:8001/docs`

## 🧪 Tests

### Backend

```bash
cd backend
python test_phone_normalization.py
python check_user.py
```

### Flutter

```bash
cd nengoo-front
dart test_connection.dart
flutter test
```

### Frontend

```bash
cd frontend
npm test
```

## 🐛 Dépannage

### Backend ne démarre pas

1. Vérifiez MongoDB : `mongosh mongodb://localhost:27017`
2. Vérifiez les variables d'environnement dans `.env`
3. Vérifiez les dépendances : `pip install -r requirements.txt`

### Frontend ne se connecte pas

1. Vérifiez que le backend est lancé : `curl http://localhost:8001/api/`
2. Vérifiez la configuration CORS dans `backend/server.py`
3. Vérifiez l'URL dans les variables d'environnement

### Flutter ne se connecte pas

Consultez : [nengoo-front/docs/CONNEXION_BACKEND.md](./nengoo-front/docs/CONNEXION_BACKEND.md)

## 📝 Guides et tutoriels

- **[Connexion Backend Flutter](./nengoo-front/docs/CONNEXION_BACKEND.md)** - Configuration réseau par plateforme
- **[Fix Login Problem](./docs/FIX_LOGIN_PROBLEM.md)** - Correction normalisation WhatsApp
- **[SEO Guide](./docs/SEO_GUIDE.md)** - Optimisation du référencement
- **[AWS S3 Configuration](./docs/AWS_S3_CORS_CONFIGURATION.md)** - Setup upload d'images

## 🤝 Contribution

*(En cours de rédaction)*

## 📄 Licence

*(À définir)*

## 👥 Équipe

- **Kouamo** - Développeur principal

## 🔗 Liens

- Site web : [www.nengoo.com](https://www.nengoo.com)
- Backend API : `http://localhost:8001`
- Frontend Web : `http://localhost:3000`

---

**Dernière mise à jour** : 2026-01-30
