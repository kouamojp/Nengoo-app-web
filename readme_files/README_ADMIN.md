# 🎯 Nengoo - Accès Admin Simplifié

## ⚡ Démarrage Ultra-Rapide (3 étapes)

### 1. Démarrer le Backend
```bash
cd backend
uvicorn server:app --reload --port 8001
```

### 2. Créer l'Admin (nouveau terminal)
```bash
cd backend
python init_admin_simple.py
```

### 3. Démarrer le Frontend (nouveau terminal)
```bash
cd frontend
npm start
```

## 🔐 Accès Admin

**URL:** http://localhost:3000/admin/login

**Identifiants par défaut:**
- Username: `admin`
- Password: `admin123`

⚠️ **Changez ce mot de passe après la première connexion !**

---

## 📡 Communication Frontend-Backend

Le frontend communique avec le backend via la variable d'environnement :

**Fichier:** `frontend/.env`
```env
REACT_APP_API_BASE_URL=http://localhost:8001/api
```

Cette variable est utilisée automatiquement par le service API (`frontend/src/services/api.js`).

### Tester la connexion

Vous pouvez ajouter le composant `<TestConnection />` dans n'importe quelle page pour vérifier la connexion :

```javascript
import TestConnection from './components/TestConnection';

// Dans votre composant
<TestConnection />
```

---

## 🎯 Fonctionnalités Admin

### Dashboard
- Statistiques en temps réel
- Nombre de clients
- Nombre de vendeurs
- Vendeurs en attente d'approbation

### Gestion des Clients
- Liste complète
- Recherche
- Suppression

### Gestion des Vendeurs
- Approbation/Rejet des demandes
- Liste complète avec filtres
- Recherche avancée
- Suppression

### À venir
- Gestion des produits (avec images locales)
- Gestion des catégories
- Gestion des commandes

---

## 🔧 Configuration Avancée

### Changer l'URL du Backend

1. Modifiez `frontend/.env` :
   ```env
   REACT_APP_API_BASE_URL=http://votre-serveur:port/api
   ```

2. Redémarrez le frontend :
   ```bash
   npm start
   ```

### Créer un Admin Personnalisé

Pour créer un admin avec vos propres identifiants :

```bash
cd backend
python create_admin.py
```

### Configuration MongoDB

Modifiez `backend/.env` :
```env
MONGO_URL=mongodb://localhost:27017/
DB_NAME=nengoo
JWT_SECRET_KEY=votre-cle-secrete-tres-securisee
```

---

## 📚 Documentation Complète

- **Démarrage détaillé:** `DEMARRAGE_RAPIDE.md`
- **Configuration complète:** `SETUP.md`

---

## 🆘 Aide Rapide

### Backend ne démarre pas
```bash
# Vérifiez MongoDB
net start MongoDB  # Windows
sudo systemctl start mongod  # Linux

# Vérifiez le port 8001
netstat -ano | findstr :8001
```

### Frontend ne se connecte pas au backend
1. Vérifiez que le backend est démarré sur http://localhost:8001
2. Vérifiez `frontend/.env` : `REACT_APP_API_BASE_URL=http://localhost:8001/api`
3. Testez l'API : `curl http://localhost:8001/api/`

### Admin par défaut ne fonctionne pas
- L'admin existe déjà ? Utilisez vos identifiants créés précédemment
- Erreur de connexion ? Vérifiez que le backend est démarré
- Mot de passe oublié ? Utilisez `create_admin.py` pour créer un nouvel admin

---

## 📞 Support

Pour toute question, consultez les fichiers de documentation ou contactez l'équipe de développement.
