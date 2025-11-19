# Guide de Déploiement sur Render

Ce guide vous explique comment déployer le backend Nengoo sur Render.

## Prérequis

1. Un compte [Render](https://render.com) (gratuit pour commencer)
2. Une base de données MongoDB (MongoDB Atlas recommandé)
3. Un repository Git avec votre code

## Étapes de Déploiement

### 1. Préparer MongoDB Atlas (Recommandé)

1. Créez un compte sur [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
2. Créez un nouveau cluster (le tier gratuit M0 convient pour débuter)
3. Créez un utilisateur de base de données :
   - Database Access → Add New Database User
   - Notez le nom d'utilisateur et le mot de passe
4. Autorisez les connexions depuis n'importe où :
   - Network Access → Add IP Address → Allow Access from Anywhere (0.0.0.0/0)
5. Obtenez votre chaîne de connexion :
   - Clusters → Connect → Connect your application
   - Copiez la chaîne de connexion qui ressemble à :
   ```
   mongodb+srv://<username>:<password>@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority
   ```
   - Remplacez `<username>` et `<password>` par vos identifiants

### 2. Déployer sur Render

#### Option A : Déploiement automatique avec render.yaml

1. Connectez-vous à [Render](https://dashboard.render.com/)
2. Cliquez sur "New +" → "Blueprint"
3. Connectez votre repository GitHub/GitLab
4. Render détectera automatiquement le fichier `render.yaml`
5. Configurez les variables d'environnement dans le dashboard :
   - `MONGO_URL` : Votre chaîne de connexion MongoDB Atlas
   - `DB_NAME` : `nengoo` (ou le nom de votre choix)
   - `JWT_SECRET_KEY` : Sera généré automatiquement
6. Cliquez sur "Apply" pour déployer

#### Option B : Déploiement manuel

1. Connectez-vous à [Render](https://dashboard.render.com/)
2. Cliquez sur "New +" → "Web Service"
3. Connectez votre repository GitHub/GitLab
4. Sélectionnez le repository et la branche
5. Configurez le service :
   - **Name** : `nengoo-backend`
   - **Region** : Choisissez la région la plus proche
   - **Branch** : `main` (ou votre branche principale)
   - **Root Directory** : `backend`
   - **Runtime** : `Python 3`
   - **Build Command** : `pip install -r requirements.txt`
   - **Start Command** : `uvicorn server:app --host 0.0.0.0 --port $PORT`
6. Ajoutez les variables d'environnement :
   - `MONGO_URL` : Votre chaîne de connexion MongoDB Atlas
   - `DB_NAME` : `nengoo`
   - `JWT_SECRET_KEY` : Générez une clé aléatoire (ex: `openssl rand -hex 32`)
   - `ENVIRONMENT` : `production`
7. Choisissez le plan (Free tier disponible)
8. Cliquez sur "Create Web Service"

### 3. Configuration Post-Déploiement

Une fois le déploiement terminé :

1. Render vous fournira une URL pour votre API (ex: `https://nengoo-backend.onrender.com`)
2. Testez l'API en visitant : `https://votre-url.onrender.com/api/`
3. Vous devriez voir : `{"message": "Nengoo API - Bienvenue!"}`

### 4. Initialiser l'Administrateur

Pour créer l'administrateur par défaut :

```bash
curl -X POST https://votre-url.onrender.com/api/admin/init-default
```

Cela créera un admin avec :
- Username : `admin`
- Password : `admin123`

**⚠️ IMPORTANT : Changez ce mot de passe immédiatement après la première connexion !**

### 5. Mettre à Jour le Frontend

Modifiez la configuration de votre frontend pour pointer vers la nouvelle URL de l'API :

```javascript
// Dans votre fichier de configuration frontend
const API_URL = 'https://votre-url.onrender.com/api';
```

## Variables d'Environnement Requises

| Variable | Description | Exemple |
|----------|-------------|---------|
| `MONGO_URL` | URL de connexion MongoDB | `mongodb+srv://user:pass@cluster.mongodb.net/` |
| `DB_NAME` | Nom de la base de données | `nengoo` |
| `JWT_SECRET_KEY` | Clé secrète pour les tokens JWT | Généré automatiquement ou via `openssl rand -hex 32` |
| `ENVIRONMENT` | Environnement d'exécution | `production` |

## Dépannage

### Le service ne démarre pas
- Vérifiez les logs dans le dashboard Render
- Assurez-vous que `MONGO_URL` est correctement configuré
- Vérifiez que votre IP est autorisée dans MongoDB Atlas

### Erreur de connexion à MongoDB
- Vérifiez que la chaîne de connexion est correcte
- Assurez-vous que l'utilisateur MongoDB a les permissions nécessaires
- Vérifiez les règles de Network Access dans MongoDB Atlas

### Problèmes CORS
- Le backend est déjà configuré pour accepter toutes les origines
- Si nécessaire, modifiez les paramètres CORS dans `server.py`

## Mise à Jour du Déploiement

Render redéploie automatiquement à chaque push sur la branche configurée :

```bash
git add .
git commit -m "Update backend"
git push origin main
```

## Surveillance et Logs

- Accédez aux logs en temps réel via le dashboard Render
- Les logs incluent les requêtes HTTP, les erreurs et les informations de connexion

## Support

Pour plus d'informations :
- [Documentation Render](https://render.com/docs)
- [Documentation FastAPI](https://fastapi.tiangolo.com/)
- [Documentation MongoDB Atlas](https://docs.atlas.mongodb.com/)
