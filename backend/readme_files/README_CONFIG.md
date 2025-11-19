# Configuration Backend Nengoo

## Configuration pour Développement Local et Production

Le backend a été configuré pour fonctionner automatiquement en local et en production avec une gestion intelligente des variables d'environnement.

## 🔧 Configuration Locale

### 1. Créer le fichier .env

Copiez le fichier `.env.example` vers `.env` :

```bash
cp .env.example .env
```

### 2. Configurer MongoDB Local

Si vous utilisez MongoDB localement, le fichier `.env` par défaut fonctionnera :

```env
MONGO_URL="mongodb://localhost:27017/"
DB_NAME="nengoo"
JWT_SECRET_KEY="your-secret-key-change-this-in-production"
```

### 3. Installer les dépendances

```bash
# Créer l'environnement virtuel
python -m venv venv

# Activer l'environnement virtuel
# Windows
venv\Scripts\activate
# Linux/Mac
source venv/bin/activate

# Installer les dépendances
pip install -r requirements.txt
```

### 4. Démarrer le serveur

```bash
uvicorn server:app --reload --port 8001
```

Le serveur sera accessible sur : `http://localhost:8001`

## ☁️ Configuration Production (Render)

### Option 1 : MongoDB Atlas (Recommandé)

1. Créez un cluster sur [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
2. Obtenez votre URL de connexion :
   ```
   mongodb+srv://<username>:<password>@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority
   ```

3. Dans le dashboard Render, configurez la variable d'environnement :
   - `MONGO_URL` = votre URL MongoDB Atlas

### Option 2 : Autre hébergeur MongoDB

Utilisez l'URL de connexion fournie par votre hébergeur MongoDB.

### Variables d'Environnement Render

Dans le dashboard Render, configurez :

```
MONGO_URL=mongodb+srv://username:password@cluster.mongodb.net/
DB_NAME=nengoo
JWT_SECRET_KEY=<généré automatiquement par Render>
ENVIRONMENT=production
```

## 🔐 Sécurité

### Clé JWT

Pour générer une clé JWT sécurisée :

```bash
# Linux/Mac
openssl rand -hex 32

# Python (tous systèmes)
python -c "import secrets; print(secrets.token_hex(32))"
```

### Protection du fichier .env

⚠️ **IMPORTANT** : Le fichier `.env` contient des informations sensibles :
- Ne le commitez JAMAIS dans Git (déjà dans .gitignore)
- Ne le partagez JAMAIS publiquement
- Utilisez des clés différentes pour le développement et la production

## 🚀 Déploiement sur Render

Consultez le fichier `RENDER_DEPLOYMENT.md` pour un guide complet de déploiement.

### Déploiement Rapide

```bash
# 1. Commitez vos changements
git add .
git commit -m "Configure backend for production"
git push

# 2. Render déploiera automatiquement
```

## 🧪 Tester la Configuration

### Test Local

```bash
curl http://localhost:8001/api/
```

Réponse attendue :
```json
{"message": "Nengoo API - Bienvenue!"}
```

### Test Production

```bash
curl https://votre-app.onrender.com/api/
```

## 📊 Monitoring

Le serveur loggue automatiquement :
- Les connexions MongoDB
- Les requêtes HTTP
- Les erreurs

Pour voir les logs en production, consultez le dashboard Render.

## 🔄 Comment ça Marche ?

Le fichier `server.py` utilise maintenant :

```python
# Utilise MONGO_URL depuis l'environnement,
# ou mongodb://localhost:27017/ par défaut
mongo_url = os.environ.get('MONGO_URL', 'mongodb://localhost:27017/')
db_name = os.environ.get('DB_NAME', 'nengoo')
```

Cela permet :
- ✅ Fonctionnement automatique en local sans configuration
- ✅ Utilisation des variables d'environnement Render en production
- ✅ Pas besoin de modifier le code pour changer d'environnement

## 🐛 Dépannage

### Erreur : "No module named 'dotenv'"

```bash
pip install python-dotenv
```

### Erreur : "Connection refused to MongoDB"

- Vérifiez que MongoDB est démarré localement
- Vérifiez l'URL de connexion dans `.env`

### Erreur sur Render : "Application failed to respond"

- Vérifiez les logs Render
- Assurez-vous que `MONGO_URL` est configuré
- Vérifiez que l'IP de Render est autorisée dans MongoDB Atlas

## 📚 Documentation Complète

- [Guide de Déploiement Render](./RENDER_DEPLOYMENT.md)
- [Documentation FastAPI](https://fastapi.tiangolo.com/)
- [Documentation MongoDB](https://docs.mongodb.com/)
