# Déploiement de Nengoo sur cPanel

| Partie   | Domaine                      | Technologie                         | Hébergement cPanel                  |
|----------|------------------------------|-------------------------------------|-------------------------------------|
| Backend  | `https://backend.nengoo.com` | FastAPI (Python 3.12), MongoDB Atlas, AWS S3 | « Setup Python App » (Passenger) |
| Frontend | `https://www.nengoo.com`     | React 19 (CRA + craco), build statique | Fichiers statiques dans `public_html` |

> MongoDB reste sur **MongoDB Atlas** : cPanel n'héberge pas MongoDB.
> Les images restent sur **AWS S3**.

---

## 0. Prérequis

- Un hébergement cPanel avec :
  - **Setup Python App** (CloudLinux / Passenger), Python **3.10+** (3.12 conseillé) ;
  - **Accès SSH** (Terminal cPanel ou client SSH) — fortement conseillé ;
  - **SSL/TLS Status** ou **Let's Encrypt** (AutoSSL).
- Le sous-domaine `backend.nengoo.com` créé (fait) et le domaine `nengoo.com` pointant sur l'hébergement.
- Sur votre poste : Node.js 18+ et npm pour construire le frontend.
- Les secrets de production à portée de main : `MONGO_URL`, `JWT_SECRET_KEY`, clés AWS, SMTP, fichier `firebase-service-account.json`.

Dans la suite, `USER` désigne votre nom d'utilisateur cPanel (chemin `/home/USER`).

---

## 1. SSL (à faire en premier)

1. cPanel → **SSL/TLS Status**.
2. Cocher `nengoo.com`, `www.nengoo.com`, `backend.nengoo.com` → **Run AutoSSL**.
3. Attendre que les trois domaines aient un cadenas vert.

---

## 2. Backend — `backend.nengoo.com`

### 2.1 Envoyer le code

Le code de l'application Python doit être **hors** du dossier web public. Structure cible :

```
/home/USER/
├── nengoo-backend/          ← code FastAPI (Application root)
│   ├── server.py
│   ├── firebase_admin_config.py
│   ├── routers/
│   ├── templates/
│   ├── models/
│   ├── requirements.txt
│   ├── requirements-cpanel.txt   ← créé à l'étape 2.3
│   ├── passenger_wsgi.py         ← créé à l'étape 2.4
│   ├── firebase-service-account.json
│   └── .env
└── backend.nengoo.com/      ← document root du sous-domaine (reste vide ou presque)
```

**Option A — Git (recommandée)** : cPanel → **Git™ Version Control** → *Create* → cloner le dépôt dans `/home/USER/nengoo-repo`, puis copier le dossier `backend` :

```bash
cp -r ~/nengoo-repo/backend ~/nengoo-backend
```

**Option B — Upload** : zipper le dossier `backend/` en local (sans `__pycache__`, `.env` et scripts de test), l'envoyer avec le **Gestionnaire de fichiers** dans `/home/USER/`, extraire puis renommer en `nengoo-backend`.

> `firebase-service-account.json` et `.env` ne sont pas dans Git : il faut les envoyer à la main (Gestionnaire de fichiers) dans `/home/USER/nengoo-backend/`.
> Mettre leurs permissions à **600**.

### 2.2 Créer l'application Python

cPanel → **Setup Python App** → **Create Application** :

| Champ                     | Valeur                        |
|---------------------------|-------------------------------|
| Python version            | 3.12 (ou la plus récente ≥ 3.10) |
| Application root          | `nengoo-backend`              |
| Application URL           | `backend.nengoo.com` (chemin vide) |
| Application startup file  | `passenger_wsgi.py`           |
| Application Entry point   | `application`                 |
| Passenger log file        | `/home/USER/nengoo-backend/logs/passenger.log` |

Cliquer **Create**. cPanel crée un virtualenv et affiche en haut une commande du type :

```bash
source /home/USER/virtualenv/nengoo-backend/3.12/bin/activate && cd /home/USER/nengoo-backend
```

Copiez-la, elle sert pour toutes les commandes suivantes.

### 2.3 Installer les dépendances

Le `requirements.txt` du projet contient des paquets inutiles en production et lourds à installer sur un mutualisé (`playwright`, `pandas`, `numpy`, `black`, `mypy`, `pytest`, `flake8`…). Créer un fichier allégé `requirements-cpanel.txt` :

```text
fastapi==0.110.1
starlette==0.37.2
uvicorn==0.25.0
pydantic==2.11.7
email_validator==2.2.0
python-dotenv==1.1.1
python-multipart==0.0.20
motor==3.3.1
pymongo==4.5.0
dnspython==2.7.0
bcrypt==5.0.0
passlib==1.7.4
PyJWT==2.10.1
python-jose==3.5.0
boto3==1.39.4
fastapi-mail==1.4.1
firebase-admin==6.5.0
requests==2.32.4
a2wsgi==1.10.8
```

> `a2wsgi` est **indispensable** : Passenger parle WSGI, FastAPI est ASGI. `a2wsgi` fait le pont.

Puis, en SSH :

```bash
source /home/USER/virtualenv/nengoo-backend/3.12/bin/activate && cd /home/USER/nengoo-backend
pip install --upgrade pip
pip install -r requirements-cpanel.txt
```

Si une erreur `ModuleNotFoundError` apparaît au démarrage (étape 2.7), installer le module manquant avec `pip install <module>` et l'ajouter au fichier.

> Sans SSH : dans *Setup Python App*, champ **Configuration files** → ajouter `requirements-cpanel.txt` → **Run Pip Install**. Il faut quand même avoir créé le fichier avant.

### 2.4 Créer `passenger_wsgi.py`

Dans `/home/USER/nengoo-backend/passenger_wsgi.py` (cPanel en a créé un par défaut : **remplacer tout son contenu**) :

```python
import os
import sys

APP_DIR = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, APP_DIR)
os.chdir(APP_DIR)

_app = None


def application(environ, start_response):
    global _app
    if _app is None:
        from a2wsgi import ASGIMiddleware
        from server import app
        _app = ASGIMiddleware(app)
    return _app(environ, start_response)
```

> **Ne pas** écrire `application = ASGIMiddleware(app)` au niveau du module : les serveurs LiteSpeed chargent ce fichier puis *forkent* les workers. Le thread asyncio d'`a2wsgi` ne survit pas au fork et toutes les requêtes restent bloquées (processus tués par `signal: 15` dans `stderr.log`). L'application doit être créée à la première requête, comme ci-dessus.
>
> Copier le code **sans** les lignes ```` ```python ```` / ```` ``` ```` du guide. Si le collage dans le terminal coupe des lignes, utiliser `nano`. Vérifier avec `python -m py_compile passenger_wsgi.py`.

### 2.5 Configurer le `.env` de production

Fichier `/home/USER/nengoo-backend/.env` (valeurs à adapter, ne jamais les committer) :

```ini
# MongoDB Atlas
MONGO_URL=mongodb+srv://<user>:<password>@<cluster>.mongodb.net/?retryWrites=true&w=majority
DB_NAME=nengoo

# Sécurité (générer avec : openssl rand -hex 32)
JWT_SECRET_KEY=<cle-aleatoire-longue>
ENVIRONMENT=production
# Anciens en-têtes d'identité (X-Seller-Id, X-Admin-Role…) acceptés sans jeton.
# Passer à false une fois le site ET l'app à jour (voir « Bascule JWT » au §5).
LEGACY_AUTH_HEADERS=true

# AWS S3
AWS_ACCESS_KEY_ID=<...>
AWS_SECRET_ACCESS_KEY=<...>
AWS_REGION=<...>
S3_BUCKET_NAME=<...>

# Email
SMTP_HOST=<...>
SMTP_PORT=587
SMTP_SECURE=False
SMTP_USER=<...>
SMTP_PASSWORD=<...>
EMAIL_FROM=<...>
EMAIL_FROM_NAME=Nengoo

# Frontend
FRONTEND_URL=https://www.nengoo.com

# Firebase Admin
FIREBASE_SERVICE_ACCOUNT_PATH=/home/USER/nengoo-backend/firebase-service-account.json
```

> Vous pouvez aussi saisir ces variables dans *Setup Python App* → **Environment variables**. Le `.env` suffit car `server.py` le charge via `load_dotenv`.

### 2.6 Autoriser l'IP du serveur dans MongoDB Atlas

1. Trouver l'IP sortante du serveur : en SSH, `curl -s https://api.ipify.org`.
2. MongoDB Atlas → **Network Access** → **Add IP Address** → coller l'IP.

Sans cette étape, le backend ne démarre pas (timeout de connexion à Mongo).

> Beaucoup d'hébergeurs mutualisés bloquent les ports sortants. MongoDB Atlas utilise le port **27017** : si la connexion échoue malgré l'IP autorisée, demander au support d'ouvrir le port 27017 en sortie. Vérification : `python -c "import socket; socket.create_connection(('<shard>.mongodb.net', 27017), 5); print('OK')"` (nom d'hôte d'un shard visible dans Atlas → *Connect*).

### 2.7 Démarrer et tester

1. *Setup Python App* → **Restart** l'application (à refaire après chaque modification du code ou du `.env`). En SSH, équivalent : `touch /home/USER/nengoo-backend/tmp/restart.txt` (créer le dossier `tmp` s'il n'existe pas).
2. Tester :

```bash
curl -i https://backend.nengoo.com/api/categories
curl -i https://backend.nengoo.com/sitemap.xml
```

Une réponse JSON / XML avec un code 200 veut dire que tout fonctionne.
Test manuel dans un shell (plus lisible en cas d'erreur d'import) :

```bash
source /home/USER/virtualenv/nengoo-backend/3.12/bin/activate && cd /home/USER/nengoo-backend
python -c "from wsgiref.util import setup_testing_defaults as s; import passenger_wsgi as p; e={}; s(e); e['PATH_INFO']='/api/categories'; print(b''.join(p.application(e, lambda st, h, *a: print(st)))[:300])"
```

> Les commandes `pip` / `python` doivent être lancées **dans le virtualenv** : l'invite doit commencer par `((nom-app:3.x))`. Sinon c'est le Python système (ancien) qui est utilisé, et `pip` ne trouve pas `fastapi==0.110.1`.

Logs d'erreurs : `/home/USER/nengoo-backend/logs/passenger.log` et `stderr.log`.

### 2.8 Mettre à jour le CORS

Dans `backend/server.py`, la liste `origins` contient déjà `https://nengoo.com` et `https://www.nengoo.com`, donc rien à changer pour le site. Les domaines Vercel/Render peuvent être retirés une fois la migration terminée.

---

## 3. Frontend — `www.nengoo.com`

### 3.1 Configurer l'URL de l'API

En local, modifier `frontend/.env.production` :

```ini
REACT_APP_API_BASE_URL=https://backend.nengoo.com/api
```

Garder les autres variables `REACT_APP_FIREBASE_*` déjà présentes.

> Les variables `REACT_APP_*` sont intégrées **au moment du build** : si vous changez l'URL de l'API, il faut reconstruire et renvoyer le build.

### 3.2 Construire

```bash
cd frontend
npm install
npm run build
```

> **Important** : `frontend/.env.local` (URL `127.0.0.1`) a **priorité** sur `.env.production` pendant `npm run build`. Pour que le build utilise l'API de production, créer une fois `frontend/.env.production.local` (non versionné, prioritaire sur `.env.local`) :
>
> ```ini
> REACT_APP_API_BASE_URL=https://backend.nengoo.com/api
> ```
>
> `.htaccess` et `og-proxy.php` sont déjà dans `frontend/public/` et se retrouvent donc dans `build/`.

Le résultat est dans `frontend/build/`.

### 3.3 Envoyer sur le serveur

1. cPanel → **Gestionnaire de fichiers** → `public_html/` (document root de `nengoo.com` et `www.nengoo.com`).
2. Sauvegarder puis supprimer l'ancien contenu (sauf `.well-known/` s'il existe et `cgi-bin/`).
3. Zipper **le contenu** de `frontend/build/` (pas le dossier lui-même), l'envoyer dans `public_html/` et l'**extraire**.
4. Vérifier que `public_html/index.html` existe (et pas `public_html/build/index.html`).

### 3.4 Routage React + aperçus réseaux sociaux + sitemap : `.htaccess`

React Router gère les URLs côté client : sans réécriture, `/product/xxx` ou `/catalog` renvoient une erreur 404 au rafraîchissement.
Sur Vercel, `vercel.json` faisait aussi deux choses qu'il faut reproduire :

- envoyer les robots (Facebook, WhatsApp, Google…) de `/product/:slug` vers `/api/og/product/:slug` du backend pour les aperçus Open Graph ;
- servir `/sitemap.xml` (déclaré dans `robots.txt`), généré par le backend.

Les hébergements mutualisés n'autorisent en général pas le proxy Apache (`[P]`). On passe donc par un petit relais PHP.

**a) Créer `public_html/og-proxy.php`**

```php
<?php
// Relais vers le backend FastAPI pour les aperçus Open Graph et le sitemap.
$backend = 'https://backend.nengoo.com';

$type = $_GET['type'] ?? '';
if ($type === 'product') {
    $slug = $_GET['slug'] ?? '';
    if (!preg_match('/^[A-Za-z0-9_-]+$/', $slug)) {
        http_response_code(400);
        exit;
    }
    $url = $backend . '/api/og/product/' . rawurlencode($slug);
    $contentType = 'text/html; charset=utf-8';
} elseif ($type === 'sitemap') {
    $url = $backend . '/sitemap.xml';
    $contentType = 'application/xml; charset=utf-8';
} else {
    http_response_code(404);
    exit;
}

$ch = curl_init($url);
curl_setopt_array($ch, [
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_FOLLOWLOCATION => true,
    CURLOPT_TIMEOUT => 15,
    CURLOPT_USERAGENT => $_SERVER['HTTP_USER_AGENT'] ?? 'nengoo-proxy',
]);
$body = curl_exec($ch);
$code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

if ($body === false) {
    http_response_code(502);
    exit;
}
http_response_code($code ?: 200);
header('Content-Type: ' . $contentType);
echo $body;
```

**b) Créer `public_html/.htaccess`**

```apache
Options -MultiViews
RewriteEngine On

# Forcer HTTPS et le domaine avec www
RewriteCond %{HTTPS} off [OR]
RewriteCond %{HTTP_HOST} !^www\. [NC]
RewriteRule ^(.*)$ https://www.nengoo.com/$1 [L,R=301]

# Sitemap généré par le backend
RewriteRule ^sitemap\.xml$ og-proxy.php?type=sitemap [L,QSA]

# Aperçus réseaux sociaux : robots → HTML Open Graph du backend
RewriteCond %{HTTP_USER_AGENT} (facebookexternalhit|facebot|whatsapp|telegrambot|twitterbot|slackbot|linkedinbot|pinterestbot|discordbot|vkshare|googlebot|bingbot|yandexbot|duckduckbot|applebot|bot|crawler|spider|preview) [NC]
RewriteRule ^product/([A-Za-z0-9_-]+)/?$ og-proxy.php?type=product&slug=$1 [L,QSA]

# Application React (SPA) : tout ce qui n'est pas un fichier réel → index.html
RewriteCond %{REQUEST_FILENAME} !-f
RewriteCond %{REQUEST_FILENAME} !-d
RewriteRule ^ index.html [L]

# Cache : fichiers versionnés longtemps, index.html et service worker jamais
<IfModule mod_headers.c>
  <FilesMatch "\.(js|css|png|jpg|jpeg|webp|svg|woff2?)$">
    Header set Cache-Control "public, max-age=31536000, immutable"
  </FilesMatch>
  <FilesMatch "^(index\.html|sw\.js|manifest\.json)$">
    Header set Cache-Control "no-cache, no-store, must-revalidate"
  </FilesMatch>
</IfModule>

# Compression
<IfModule mod_deflate.c>
  AddOutputFilterByType DEFLATE text/html text/css application/javascript application/json image/svg+xml application/xml
</IfModule>
```

> **Domaine principal : `https://www.nengoo.com`.** `nengoo.com` redirige en 301 vers `www.nengoo.com`. Le code (canonicals, JSON-LD, sitemap, `robots.txt`, liens des emails) utilise déjà `https://www.nengoo.com`. Garder `FRONTEND_URL=https://www.nengoo.com` dans le `.env` du backend.

> Ces deux fichiers ne sont pas dans `build/` : les recréer (ou les garder de côté) à chaque redéploiement, ou mieux, les placer dans `frontend/public/` pour qu'ils soient copiés automatiquement par `npm run build`.

### 3.5 Tester

- Ouvrir `https://www.nengoo.com`, naviguer, **rafraîchir** sur une page produit (pas de 404).
- Console du navigateur (F12) : aucun appel vers `onrender.com` ou `127.0.0.1`, aucune erreur CORS.
- Connexion Google/Firebase : ajouter `nengoo.com` (et `www.nengoo.com`) dans Firebase Console → **Authentication → Settings → Authorized domains**.
- Aperçu social : `curl -A "facebookexternalhit" https://www.nengoo.com/product/<slug>` doit renvoyer du HTML avec des balises `og:`. Puis tester sur <https://developers.facebook.com/tools/debug/>.
- Sitemap : `https://www.nengoo.com/sitemap.xml`.

---

## 4. Réglages externes à mettre à jour

| Service | Action |
|---------|--------|
| **AWS S3 → CORS** | Ajouter `https://nengoo.com` et `https://www.nengoo.com` dans `AllowedOrigins` (voir `docs/AWS_S3_CORS_CONFIGURATION.md`). |
| **Firebase** | Domaines autorisés (cf. 3.5). |
| **Google Search Console** | Ajouter la propriété `https://www.nengoo.com` (ou une propriété de domaine `nengoo.com`) et y soumettre `https://www.nengoo.com/sitemap.xml`. Garder `google48bff329a559a5cd.html` à la racine de `public_html`. |
| **Application Android** | Mettre `REACT_APP_API_BASE_URL=https://backend.nengoo.com/api` avant de refaire l'APK. |

---

## 5. Mises à jour ultérieures

**Backend**

```bash
cd ~/nengoo-repo && git pull
rsync -a --exclude '.env' --exclude 'firebase-service-account.json' --exclude 'passenger_wsgi.py' \
      ~/nengoo-repo/backend/ ~/nengoo-backend/
source /home/USER/virtualenv/nengoo-backend/3.12/bin/activate && cd ~/nengoo-backend
pip install -r requirements-cpanel.txt   # seulement si des dépendances ont changé
mkdir -p tmp && touch tmp/restart.txt
```

**Frontend** : `npm run build` en local → remplacer le contenu de `public_html/` (en conservant `.htaccess`, `og-proxy.php`, `.well-known/`).

**Bascule JWT (une seule fois)**

Les connexions renvoient un jeton (`accessToken`) que le site et l'app envoient dans `Authorization: Bearer`.
Le middleware `backend/auth_tokens.py` vérifie que les en-têtes d'identité correspondent au jeton.

1. Déployer backend, site et app avec `LEGACY_AUTH_HEADERS=true` : rien ne casse, les anciennes sessions restent valides.
2. Attendre que les utilisateurs se soient reconnectés (sessions vendeur/acheteur : 30 jours ; admin : 12 h)
   et que la nouvelle version de l'app soit installée.
3. Mettre `LEGACY_AUTH_HEADERS=false` dans `.env`, puis `touch tmp/restart.txt`.
   Une session sans jeton reçoit alors un 401 et l'utilisateur est renvoyé vers la connexion.

Ne jamais changer `JWT_SECRET_KEY` sans raison : toutes les sessions seraient invalidées.

---

## 6. Dépannage

| Symptôme | Cause probable / solution |
|----------|---------------------------|
| « Incomplete response received from application » / 500 | Erreur au démarrage Python : lire `logs/stderr.log`, lancer `python -c "import passenger_wsgi"` dans le virtualenv. |
| `KeyError: 'MONGO_URL'` | `.env` absent ou mal placé (doit être à côté de `server.py`). |
| `ServerSelectionTimeoutError` | IP non autorisée dans Atlas ou port 27017 bloqué par l'hébergeur (cf. 2.6). |
| `Firebase ... firebase-service-account.json` | Fichier absent ou mauvais chemin dans `FIREBASE_SERVICE_ACCOUNT_PATH`. |
| Erreur CORS dans le navigateur | Domaine appelant absent de `origins` dans `server.py`, ou backend en erreur 500 (une 500 apparaît souvent comme une erreur CORS). |
| 404 en rafraîchissant une page React | `.htaccess` manquant ou `mod_rewrite` désactivé. |
| Le site appelle encore l'ancienne API | Build fait avec l'ancien `.env.production` : reconstruire. Vider aussi le cache / service worker (`sw.js`) du navigateur. |
| Requêtes lentes au premier appel | Passenger arrête l'app après inactivité ; normal sur mutualisé. |

> **Limite à connaître** : sous Passenger + `a2wsgi`, chaque requête est traitée de façon synchrone par un worker ; les `BackgroundTasks` (envoi d'emails) s'exécutent avant la fin de la réponse. Ça fonctionne, mais si le trafic devient important, un VPS avec `uvicorn`/`gunicorn` derrière Nginx sera plus adapté.
