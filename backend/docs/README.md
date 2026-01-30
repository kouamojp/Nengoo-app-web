# 🐍 Documentation Backend FastAPI - Nengoo

Ce dossier contient la documentation spécifique au backend FastAPI Nengoo.

## 📄 Fichiers disponibles

*(Aucun fichier de documentation spécifique pour le moment)*

## 🚀 Démarrage rapide

```bash
cd backend
python server.py
# OU
uvicorn server:app --reload --port 8001
```

Le serveur sera disponible sur `http://localhost:8001`

## 📚 Architecture

### Structure du projet

```
backend/
├── server.py              # Application FastAPI principale
├── .env                   # Variables d'environnement
├── requirements.txt       # Dépendances Python
├── templates/             # Templates emails
├── check_user.py          # Script de vérification users
└── test_*.py             # Scripts de test
```

## 🔧 Configuration

### Variables d'environnement

Créez un fichier `.env` :

```env
MONGO_URL=mongodb://localhost:27017
DB_NAME=nengoo
AWS_ACCESS_KEY_ID=your_key
AWS_SECRET_ACCESS_KEY=your_secret
AWS_REGION=us-east-1
S3_BUCKET_NAME=nengoo-bucket
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-password
EMAIL_FROM=noreply@nengoo.com
```

### Base de données

Le backend utilise MongoDB. Collections principales :

- `sellers` : Vendeurs
- `users` : Acheteurs (buyers)
- `products` : Produits
- `orders` : Commandes
- `categories` : Catégories
- `admins` : Administrateurs

## 📡 Endpoints API

### Authentification

- `POST /api/sellers/login` - Connexion vendeur
- `POST /api/buyers/login` - Connexion acheteur
- `POST /api/buyers/register` - Inscription acheteur
- `POST /api/sellers` - Créer un vendeur
- `POST /api/admins/login` - Connexion admin

### Produits

- `GET /api/products` - Liste des produits
- `GET /api/products/{id}` - Détails d'un produit
- `POST /api/products` - Créer un produit
- `PUT /api/products/{id}` - Modifier un produit
- `DELETE /api/products/{id}` - Supprimer un produit

### Catégories

- `GET /api/categories` - Liste des catégories
- `POST /api/categories` - Créer une catégorie

### Commandes

- `GET /api/orders` - Liste des commandes
- `POST /api/checkout` - Créer une commande

### Upload

- `POST /api/generate-presigned-url` - Générer URL S3 pour upload

## 🔐 Sécurité

### Authentification

Le backend utilise des headers personnalisés pour l'authentification :

- `X-Seller-Id` : ID du vendeur
- `X-Buyer-Id` : ID de l'acheteur
- `X-Admin-Role` : Rôle de l'admin (super_admin, admin, moderator, support)

### CORS

Origines autorisées (voir `server.py`) :

```python
origins = [
    "https://www.nengoo.com",
    "https://nengoo.com",
    "http://localhost:3000",
    "http://localhost:8080",
    # ...
]
```

## 🧪 Tests et Scripts

### Vérifier les utilisateurs

```bash
python check_user.py
```

### Tester la normalisation des numéros

```bash
python test_phone_normalization.py
```

### Tester les emails

```bash
python test_email.py
```

## 🐛 Dépannage

### Erreur de connexion MongoDB

```bash
# Vérifier que MongoDB est lancé
mongod --version
# Vérifier la connexion
mongosh mongodb://localhost:27017
```

### Erreur AWS S3

Vérifiez les credentials AWS dans `.env` et les permissions du bucket.

### Logs

Les logs sont affichés dans la console. Niveau de log : INFO

```python
logging.info(f"[SELLER LOGIN] Attempting login...")
```

## 📚 Documentation API

Documentation interactive disponible :

- Swagger UI : `http://localhost:8001/docs`
- ReDoc : `http://localhost:8001/redoc`

## 🔧 Maintenance

### Migrations de données

```bash
# Migrer les slugs des produits
curl -X POST http://localhost:8001/api/admin/migrate-slugs
```

---

**Dernière mise à jour** : 2026-01-30
