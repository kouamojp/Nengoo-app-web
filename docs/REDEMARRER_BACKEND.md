# 🔄 Comment redémarrer le Backend pour activer le fix

## ⚠️ IMPORTANT

Les modifications pour corriger le problème de connexion ont été faites dans le code, mais **le backend doit être redémarré** pour qu'elles prennent effet.

## 🚀 Méthode rapide (Windows)

### Option 1 : Utiliser le script automatique

1. Ouvrez l'Explorateur Windows
2. Allez dans le dossier `backend`
3. **Double-cliquez** sur `restart_backend.bat`

✅ Le backend va redémarrer automatiquement avec les nouvelles modifications

### Option 2 : Manuellement

#### Étape 1 : Arrêter le serveur actuel

Si un terminal est ouvert avec le backend qui tourne :
- Appuyez sur **Ctrl + C** dans ce terminal

OU

Ouvrez un nouveau terminal et tapez :
```bash
taskkill /F /IM python.exe /T
```

#### Étape 2 : Redémarrer le serveur

```bash
cd backend
python server.py
```

**Attendez de voir** :
```
INFO:     Uvicorn running on http://127.0.0.1:8001
INFO:     Application startup complete.
```

## ✅ Vérifier que ça fonctionne

### Test automatique

Double-cliquez sur `backend/test_login_after_restart.bat`

**Résultat attendu :**
```json
{
  "id": "seller_c3a11f1f",
  "whatsapp": "+237 690703689",
  "name": "Kouamo",
  "businessName": "MINDCODE",
  ...
}
```

### Test manuel avec curl

```bash
curl -X POST http://localhost:8001/api/sellers/login ^
  -H "Content-Type: application/json" ^
  -d "{\"whatsapp\":\"+237690703689\",\"password\":\"Kouamo@1992\"}"
```

✅ **Devrait retourner vos données** (id, name, businessName, etc.)

## 🧪 Test depuis l'app Flutter

Une fois le backend redémarré :

```bash
cd nengoo-front
flutter run -d chrome
```

Dans l'app :
1. Sélectionnez **"Vendeur"**
2. Numéro : `+237690703689` (avec ou sans espace)
3. Mot de passe : `Kouamo@1992`
4. Cliquez sur "Continuer"

✅ **Devrait vous connecter avec succès**

## 🐛 Si ça ne fonctionne toujours pas

### Problème 1 : "Numéro WhatsApp ou mot de passe incorrect"

**Cause** : Le backend n'a pas été redémarré correctement

**Solution** :
```bash
# Tuer TOUS les processus Python
taskkill /F /IM python.exe /T

# Attendre 3 secondes
timeout /t 3

# Relancer
cd backend
python server.py
```

### Problème 2 : Le backend ne démarre pas

**Cause** : Erreur dans le code ou dépendances manquantes

**Solution** :
```bash
cd backend
pip install -r requirements.txt
python server.py
```

Consultez les erreurs affichées dans le terminal.

### Problème 3 : Le mot de passe est incorrect

Si le backend démarre mais le login échoue toujours avec les deux formats de numéro :

**Vérifier le mot de passe dans la base de données** :
```bash
cd backend
python check_user.py
```

Cherchez votre numéro et vérifiez qu'il existe.

## 📝 Ce qui a été modifié

### Dans `server.py`

```python
# Nouvelle fonction ajoutée (ligne ~71)
def normalize_whatsapp(whatsapp: str) -> str:
    """Normalise le numéro en supprimant espaces et tirets"""
    if not whatsapp:
        return ""
    return whatsapp.replace(" ", "").replace("-", "").strip()

# Endpoint modifié (ligne ~1868)
@api_router.post("/sellers/login", response_model=Seller)
async def seller_login(login_data: SellerLoginRequest):
    normalized_whatsapp = normalize_whatsapp(login_data.whatsapp)

    seller = await db.sellers.find_one({
        "$or": [
            {"whatsapp": normalized_whatsapp},
            {"whatsapp": login_data.whatsapp}
        ]
    })
    # ...
```

## 📊 Logs à surveiller

Après le redémarrage, dans les logs du backend vous devriez voir :

```
[SELLER LOGIN] Attempting login with WhatsApp: +237 690703689 -> normalized: +237690703689
[SELLER LOGIN] Login successful for +237 690703689
```

## 🔗 Liens utiles

- [Guide complet du fix](./docs/FIX_LOGIN_PROBLEM.md)
- [Vérifier les utilisateurs](./backend/check_user.py)
- [Test de normalisation](./backend/test_phone_normalization.py)

---

## 📋 Checklist avant de tester

- [ ] Backend arrêté (Ctrl+C ou taskkill)
- [ ] Backend redémarré (`python server.py`)
- [ ] Message "Uvicorn running" visible
- [ ] Test curl réussi (retourne vos données)
- [ ] Prêt à tester depuis l'app Flutter

---

**Date de création** : 2026-01-30
**Problème** : Normalisation des numéros WhatsApp
**Solution** : Redémarrage du backend obligatoire
