# 🔧 Correction erreur CORS - OPTIONS 400 Bad Request

## ❌ Erreur

```
INFO: 127.0.0.1:63935 - "OPTIONS /api/buyers/login HTTP/1.1" 400 Bad Request
```

## 🔍 Cause

L'origine de votre application (Flutter Web, React, etc.) n'était pas autorisée dans la configuration CORS du backend.

Quand le navigateur envoie une requête depuis `http://localhost:XXXX`, il fait d'abord une requête OPTIONS (preflight) pour vérifier les permissions CORS. Si l'origine n'est pas dans la liste, elle est rejetée avec un 400.

## ✅ Solution appliquée

### 1. Ajout de ports localhost supplémentaires

```python
origins = [
    # ... origines existantes
    "http://localhost:8001",  # Backend
    "http://localhost:5000",  # Flutter Web
    "http://localhost:5001",
    "http://localhost:5500",
    "http://localhost:8888",
    "http://localhost:9000",
]
```

### 2. Regex pour tous les ports localhost (développement)

```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_origin_regex=r"http://localhost:\d+",  # ✨ NOUVEAU
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

Cette regex permet **TOUS les ports localhost** pendant le développement :
- `http://localhost:3000` ✅
- `http://localhost:5000` ✅
- `http://localhost:8080` ✅
- `http://localhost:XXXXX` ✅

## 🚀 Activation

**Redémarrez le backend** :

```bash
# Arrêter
Ctrl+C

# Redémarrer
cd backend
python server.py
```

OU double-cliquez sur `backend/restart_backend.bat`

## ✅ Vérification

Relancez votre application et la requête devrait passer :

```
INFO: 127.0.0.1:63935 - "OPTIONS /api/buyers/login HTTP/1.1" 200 OK
INFO: 127.0.0.1:63936 - "POST /api/buyers/login HTTP/1.1" 200 OK
```

## 🧪 Test manuel

```bash
# Test depuis Chrome/Firefox
curl -X OPTIONS http://localhost:8001/api/buyers/login \
  -H "Origin: http://localhost:5000" \
  -H "Access-Control-Request-Method: POST" \
  -v
```

Vous devriez voir :
```
< HTTP/1.1 200 OK
< access-control-allow-origin: http://localhost:5000
< access-control-allow-credentials: true
```

## 📝 Détails techniques

### Qu'est-ce qu'une requête OPTIONS ?

Avant chaque requête POST/PUT/DELETE depuis un navigateur, le navigateur envoie automatiquement une requête OPTIONS pour :
1. Vérifier que l'origine est autorisée
2. Vérifier que la méthode HTTP est autorisée
3. Vérifier que les headers sont autorisés

C'est le **mécanisme de preflight CORS**.

### Pourquoi 400 Bad Request ?

Le backend FastAPI rejette la requête OPTIONS car :
- L'origine n'est pas dans `allow_origins`
- Et elle ne match pas `allow_origin_regex` (qui n'existait pas avant)

### Différence allow_origins vs allow_origin_regex

| Paramètre | Usage | Sécurité |
|-----------|-------|----------|
| `allow_origins` | Liste exacte d'URLs | ✅ Sécurisé |
| `allow_origin_regex` | Pattern regex | ⚠️ À utiliser prudemment |

**En production**, utilisez UNIQUEMENT `allow_origins` avec les domaines exacts.

**En développement**, `allow_origin_regex` est pratique pour localhost avec ports dynamiques.

## ⚠️ Sécurité en production

En production, **retirez** le `allow_origin_regex` et ne gardez que les domaines exacts :

```python
origins = [
    "https://www.nengoo.com",
    "https://nengoo.com",
    "https://nengoo-app-web.vercel.app",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,  # Seulement les domaines exacts
    # allow_origin_regex=r"...",  # ❌ À RETIRER en production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

## 🔗 Ressources

- [Documentation FastAPI CORS](https://fastapi.tiangolo.com/tutorial/cors/)
- [MDN Web Docs - CORS](https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS)
- [CORS Preflight](https://developer.mozilla.org/en-US/docs/Glossary/Preflight_request)

---

**Date** : 2026-01-30
**Erreur** : OPTIONS 400 Bad Request
**Solution** : allow_origin_regex pour localhost
