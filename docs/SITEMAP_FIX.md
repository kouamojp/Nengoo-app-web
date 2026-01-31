# Fix Sitemap URL en Production

## Problème
La sitemap en production (`https://nengoo-app-web.onrender.com/sitemap.xml`) génère des URLs pointant vers `nengoo-app-web.onrender.com` au lieu de `www.nengoo.com`.

## Solution appliquée

### 1. Code Backend corrigé ✅
**Fichier:** `backend/server.py` ligne 1194

**Avant:**
```python
frontend_url = os.getenv("FRONTEND_URL", "https://nengoo-app-web.onrender.com")
```

**Après:**
```python
frontend_url = os.getenv("FRONTEND_URL", "https://www.nengoo.com")
```

### 2. Configuration de la variable d'environnement en production

Pour que la correction fonctionne sur Render, vous devez configurer la variable d'environnement `FRONTEND_URL`.

#### Sur Render.com:

1. **Connectez-vous à Render:** https://dashboard.render.com
2. **Sélectionnez votre service** `nengoo-app-web`
3. **Allez dans l'onglet "Environment"**
4. **Ajoutez la variable d'environnement:**
   - **Clé:** `FRONTEND_URL`
   - **Valeur:** `https://www.nengoo.com` (ou `https://nengoo.com` selon votre domaine principal)
5. **Cliquez sur "Save Changes"**
6. **Le service redémarrera automatiquement**

#### Schéma de configuration:
```
Environment Variables
┌─────────────────────────────────────┐
│ Key: FRONTEND_URL                   │
│ Value: https://www.nengoo.com       │
│ [Save Changes]                      │
└─────────────────────────────────────┘
```

### 3. Vérification

Après le redémarrage, vérifiez la sitemap:

**URL:** https://nengoo-app-web.onrender.com/sitemap.xml

**Vous devriez voir:**
```xml
<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://www.nengoo.com/</loc>
    <lastmod>2026-01-30</lastmod>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>https://www.nengoo.com/catalog</loc>
    ...
  </url>
  <!-- Plus d'URLs avec www.nengoo.com -->
</urlset>
```

### 4. Test local

Le script `backend/test_sitemap.py` permet de tester localement:

```bash
cd backend
python test_sitemap.py
```

**Résultat attendu:**
```
✓ Correct URLs (nengoo.com): 13
✓ All URLs use the correct domain!
```

## Autres endroits utilisant FRONTEND_URL

La variable `FRONTEND_URL` est également utilisée dans:

1. **Ligne 714:** Génération de liens dans les emails
2. **Ligne 1316:** Open Graph tags pour produits
3. **Ligne 1409:** Meta tags pour SEO

Tous ces endroits utiliseront automatiquement la bonne URL une fois `FRONTEND_URL` configurée.

## Configuration du .env local

Dans votre fichier `backend/.env`, assurez-vous d'avoir:

```bash
FRONTEND_URL="https://www.nengoo.com"
```

Ou pour le développement local:

```bash
FRONTEND_URL="http://localhost:3000"
```

## Notes importantes

1. **Domaine principal:** Décidez si vous utilisez `www.nengoo.com` ou `nengoo.com` comme domaine principal
2. **Redirection:** Configurez une redirection de l'un vers l'autre pour éviter les contenus dupliqués
3. **SSL:** Assurez-vous que votre domaine `nengoo.com` pointe bien vers le service Render
4. **Cache:** Après modification, Google peut mettre quelques jours à réindexer la sitemap

## Commande pour vérifier en production

```bash
curl https://nengoo-app-web.onrender.com/sitemap.xml | grep -o "https://[^<]*" | head -5
```

Cela devrait afficher:
```
https://www.nengoo.com/
https://www.nengoo.com/catalog
https://www.nengoo.com/about
https://www.nengoo.com/privacy-policy
https://www.nengoo.com/pickup-points
```
