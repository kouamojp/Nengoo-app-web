# Configuration des variables d'environnement sur Render

## Variables d'environnement nécessaires

Voici toutes les variables d'environnement à configurer sur Render pour le bon fonctionnement de l'application:

### 🌐 URLs et Domaines

| Variable | Valeur Production | Description |
|----------|-------------------|-------------|
| `FRONTEND_URL` | `https://www.nengoo.com` | URL du frontend (utilisé pour sitemap, emails, Open Graph) |

### 🗄️ Base de données

| Variable | Valeur | Description |
|----------|--------|-------------|
| `MONGODB_URI` | `mongodb+srv://...` | URI de connexion MongoDB Atlas |

### 📧 Email (SendGrid)

| Variable | Valeur | Description |
|----------|--------|-------------|
| `SENDGRID_API_KEY` | `SG.xxxxx` | Clé API SendGrid |
| `EMAIL_FROM` | `noreply@nengoo.com` | Adresse email d'envoi |

### ☁️ AWS S3

| Variable | Valeur | Description |
|----------|--------|-------------|
| `AWS_ACCESS_KEY_ID` | `AKIA...` | Clé d'accès AWS |
| `AWS_SECRET_ACCESS_KEY` | `xxxxx` | Clé secrète AWS |
| `AWS_REGION` | `eu-west-3` | Région AWS (Paris) |
| `S3_BUCKET_NAME` | `nengoo-products` | Nom du bucket S3 |

### 🔐 Sécurité

| Variable | Valeur | Description |
|----------|--------|-------------|
| `JWT_SECRET_KEY` | `votre_secret_key` | Clé secrète pour JWT |
| `SUPER_ADMIN_SECRET` | `votre_admin_secret` | Secret pour super admin |

### 🌍 Autres

| Variable | Valeur | Description |
|----------|--------|-------------|
| `ENVIRONMENT` | `production` | Environnement d'exécution |
| `PORT` | `8001` | Port du serveur (Render gère automatiquement) |

## 📝 Comment configurer sur Render

### Méthode 1: Interface Web (Recommandé)

1. Allez sur https://dashboard.render.com
2. Sélectionnez votre service `nengoo-app-web`
3. Cliquez sur l'onglet **"Environment"** dans le menu de gauche
4. Cliquez sur **"Add Environment Variable"**
5. Entrez la **clé** et la **valeur**
6. Cliquez sur **"Save Changes"**
7. Le service redémarrera automatiquement

### Méthode 2: Via fichier `.env` (Non recommandé pour la prod)

⚠️ **Ne jamais commiter le fichier `.env` dans Git !**

Le fichier `.env` doit rester local et être ajouté au `.gitignore`.

## ✅ Vérification de la configuration

### 1. Vérifier que les variables sont bien configurées

Dans l'onglet "Environment" de Render, vous devriez voir toutes les variables listées ci-dessus.

### 2. Tester l'application

Après configuration et redémarrage:

```bash
# Tester la sitemap
curl https://nengoo-app-web.onrender.com/sitemap.xml | grep "nengoo.com"

# Tester le health check
curl https://nengoo-app-web.onrender.com/health

# Tester les produits
curl https://nengoo-app-web.onrender.com/api/products
```

### 3. Vérifier les logs

Dans Render, onglet **"Logs"**, vérifiez qu'il n'y a pas d'erreurs au démarrage.

## 🚨 Erreurs courantes

### "MONGODB_URI not found"
**Solution:** Configurez la variable `MONGODB_URI` avec votre URI MongoDB Atlas.

### "AWS credentials not found"
**Solution:** Configurez `AWS_ACCESS_KEY_ID` et `AWS_SECRET_ACCESS_KEY`.

### "SENDGRID_API_KEY not configured"
**Solution:** Configurez `SENDGRID_API_KEY` pour l'envoi d'emails.

### Sitemap génère de mauvaises URLs
**Solution:** Configurez `FRONTEND_URL` avec `https://www.nengoo.com`.

## 📋 Checklist de déploiement

Avant de déployer en production, vérifiez que:

- [ ] `MONGODB_URI` est configuré
- [ ] `FRONTEND_URL` est configuré avec le bon domaine
- [ ] `AWS_ACCESS_KEY_ID` et `AWS_SECRET_ACCESS_KEY` sont configurés
- [ ] `S3_BUCKET_NAME` est configuré
- [ ] `SENDGRID_API_KEY` et `EMAIL_FROM` sont configurés
- [ ] `JWT_SECRET_KEY` est configuré (générer un secret fort)
- [ ] `SUPER_ADMIN_SECRET` est configuré
- [ ] Le fichier `.env` n'est PAS commité dans Git
- [ ] Les logs ne montrent pas d'erreurs au démarrage
- [ ] La sitemap génère les bonnes URLs
- [ ] L'upload d'images fonctionne (AWS S3)
- [ ] Les emails sont envoyés correctement

## 🔄 Rotation des secrets

Il est recommandé de changer régulièrement:

- `JWT_SECRET_KEY` tous les 6 mois
- `SUPER_ADMIN_SECRET` tous les 6 mois
- `AWS_SECRET_ACCESS_KEY` tous les 12 mois
- `SENDGRID_API_KEY` si compromis

## 📚 Ressources

- [Documentation Render](https://render.com/docs)
- [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
- [AWS S3](https://aws.amazon.com/s3/)
- [SendGrid](https://sendgrid.com/)
