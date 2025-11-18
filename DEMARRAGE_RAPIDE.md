# 🚀 Démarrage Rapide - Nengoo App

## Méthode Simple (Recommandée)

### 1️⃣ Démarrer le Backend

```bash
cd backend
uvicorn server:app --reload --port 8001
```

Attendez que le serveur démarre et affiche :
```
INFO:     Uvicorn running on http://127.0.0.1:8001
```

### 2️⃣ Créer l'Administrateur (dans un nouveau terminal)

**Option A - Script Python Simple:**
```bash
cd backend
python init_admin_simple.py
```

**Option B - Script Batch (Windows):**
```bash
cd backend
init_admin.bat
```

**Option C - Appel direct (PowerShell/CMD):**
```bash
curl -X POST http://localhost:8001/api/admin/init-default -H "Content-Type: application/json"
```

Cela créera automatiquement un compte admin avec :
- **Username:** `admin`
- **Password:** `admin123`

⚠️ **IMPORTANT:** Changez ce mot de passe après la première connexion !

### 3️⃣ Démarrer le Frontend (nouveau terminal)

```bash
cd frontend
npm start
```

### 4️⃣ Accéder à l'Application

- **Site Principal:** http://localhost:3000
- **Administration:** http://localhost:3000/admin/login

Connectez-vous avec :
- Username: `admin`
- Password: `admin123`

---

## Configuration Avancée

### Variables d'Environnement

#### Backend (.env)
```env
MONGO_URL=mongodb://localhost:27017/
DB_NAME=nengoo
JWT_SECRET_KEY=votre-cle-secrete-changez-moi
```

#### Frontend (.env)
```env
REACT_APP_API_BASE_URL=http://localhost:8001/api
```

### Créer un Admin Personnalisé

Si vous préférez créer un admin avec vos propres identifiants :

```bash
cd backend
python create_admin.py
```

Suivez les instructions interactives.

---

## Utilisation Quotidienne

### Démarrage

1. **Terminal 1 - Backend:**
   ```bash
   cd backend
   uvicorn server:app --reload --port 8001
   ```

2. **Terminal 2 - Frontend:**
   ```bash
   cd frontend
   npm start
   ```

### Accès

- 👥 **Clients:** http://localhost:3000 → S'inscrire/Se connecter
- 🏪 **Vendeurs:** http://localhost:3000 → S'inscrire/Se connecter
- 👨‍💼 **Admin:** http://localhost:3000/admin/login

---

## Vérification de la Configuration

### Tester le Backend

```bash
curl http://localhost:8001/api/
```

Devrait retourner :
```json
{"message":"Nengoo API - Bienvenue!"}
```

### Tester MongoDB

```bash
mongo
> use nengoo
> show collections
```

---

## Résolution de Problèmes

### Le backend ne démarre pas

1. Vérifiez MongoDB :
   ```bash
   # Windows
   net start MongoDB

   # Linux/Mac
   sudo systemctl start mongod
   ```

2. Vérifiez le port 8001 :
   ```bash
   netstat -ano | findstr :8001
   ```

### L'admin par défaut existe déjà

Si vous obtenez une erreur "Des administrateurs existent déjà", c'est normal - vous avez déjà créé un admin !

Pour vous connecter, utilisez les identifiants que vous avez créés précédemment.

Pour réinitialiser (⚠️ supprime tous les admins) :
```javascript
// Dans MongoDB
db.admins.deleteMany({})
// Puis relancez init_admin_simple.py
```

### Erreur CORS

Assurez-vous que :
1. Le backend est sur `http://localhost:8001`
2. Le frontend est sur `http://localhost:3000`
3. La variable `REACT_APP_API_BASE_URL` dans `frontend/.env` est correcte

---

## Prochaines Étapes

1. ✅ Connectez-vous en tant qu'admin
2. ✅ Inscrivez un vendeur de test
3. ✅ Approuvez le vendeur depuis l'admin
4. ✅ Connectez-vous en tant que vendeur
5. ✅ Inscrivez un client de test
6. 🔜 Ajoutez des produits (prochaine fonctionnalité)

---

## Commandes Utiles

### Backend

```bash
# Démarrer le serveur
uvicorn server:app --reload --port 8001

# Installer les dépendances
pip install -r requirements.txt

# Créer un admin
python init_admin_simple.py
```

### Frontend

```bash
# Démarrer l'application
npm start

# Installer les dépendances
npm install

# Build production
npm run build
```

### MongoDB

```bash
# Se connecter
mongo

# Voir les bases de données
show dbs

# Utiliser la base nengoo
use nengoo

# Voir les collections
show collections

# Voir les admins
db.admins.find().pretty()

# Voir les vendeurs
db.sellers.find().pretty()

# Voir les clients
db.buyers.find().pretty()
```

---

## Support

Pour toute question, consultez le fichier `SETUP.md` ou contactez l'équipe de développement.
