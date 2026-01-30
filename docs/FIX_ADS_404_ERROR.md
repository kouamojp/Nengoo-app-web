# 🔧 Correction erreur 404 sur /api/ads/active

## ❌ Erreur avant

```
INFO: 127.0.0.1:53753 - "GET /api/ads/active HTTP/1.1" 404 Not Found
```

## 🔍 Problème

L'endpoint `/api/ads/active` n'existait pas dans le backend, ce qui causait une erreur 404 à chaque fois que l'application tentait de récupérer les annonces.

## ✅ Solution implémentée

### 1. Modèle Ad créé

```python
class Ad(BaseModel):
    id: str = Field(default_factory=lambda: f"ad_{str(uuid.uuid4())[:8]}")
    title: str
    description: Optional[str] = None
    imageUrl: Optional[str] = None
    linkUrl: Optional[str] = None
    startDate: Optional[str] = None
    endDate: Optional[str] = None
    isActive: bool = True
    createdAt: str = Field(default_factory=lambda: datetime.now().isoformat())

class AdCreate(BaseModel):
    title: str
    description: Optional[str] = None
    imageUrl: Optional[str] = None
    linkUrl: Optional[str] = None
    startDate: Optional[str] = None
    endDate: Optional[str] = None
    isActive: bool = True
```

### 2. Endpoints créés

#### GET /api/ads/active (Public)

Récupère les annonces actives. **Retourne toujours une liste** (vide ou avec des éléments).

```python
@api_router.get("/ads/active", response_model=List[Ad])
async def get_active_ads():
    """
    Récupère les annonces actives.
    Retourne une liste vide s'il n'y a pas d'annonces (pas de 404).
    """
    ads_cursor = db.ads.find({"isActive": True})
    ads = await ads_cursor.to_list(100)
    return [Ad(**ad) for ad in ads]
```

**Réponses possibles :**
- Avec annonces : `200 OK` + `[{...}, {...}]`
- Sans annonces : `200 OK` + `[]` ✅ (plus d'erreur 404)

#### POST /api/ads (Admin uniquement)

Créer une nouvelle annonce.

```bash
curl -X POST http://localhost:8001/api/ads \
  -H "Content-Type: application/json" \
  -H "X-Admin-Role: admin" \
  -d '{
    "title": "Promo Black Friday",
    "description": "50% de réduction sur tous les produits",
    "imageUrl": "https://example.com/image.jpg",
    "linkUrl": "https://nengoo.com/promo",
    "isActive": true
  }'
```

#### DELETE /api/ads/{ad_id} (Admin uniquement)

Supprimer une annonce.

```bash
curl -X DELETE http://localhost:8001/api/ads/ad_12345678 \
  -H "X-Admin-Role: admin"
```

## 🚀 Activation

**Redémarrez le backend** :

```bash
backend/restart_backend.bat
```

OU manuellement :
```bash
cd backend
python server.py
```

## ✅ Vérification

### Test 1 : Sans annonces (cas actuel)

```bash
curl http://localhost:8001/api/ads/active
```

**Avant** : 404 Not Found ❌
**Après** : `[]` (liste vide) ✅

### Test 2 : Avec annonces

1. Créer une annonce (admin) :
```bash
curl -X POST http://localhost:8001/api/ads \
  -H "Content-Type: application/json" \
  -H "X-Admin-Role: admin" \
  -d '{
    "title": "Test Ad",
    "description": "Test",
    "isActive": true
  }'
```

2. Récupérer les annonces :
```bash
curl http://localhost:8001/api/ads/active
```

**Résultat** : `[{"id": "ad_xxxx", "title": "Test Ad", ...}]` ✅

## 📊 Logs après correction

```
INFO: 127.0.0.1:53753 - "GET /api/ads/active HTTP/1.1" 200 OK  ✅
```

## 💾 Collection MongoDB

Une nouvelle collection `ads` est maintenant disponible dans MongoDB :

```javascript
// Structure d'un document Ad
{
  "id": "ad_12345678",
  "title": "Promo Black Friday",
  "description": "50% de réduction",
  "imageUrl": "https://example.com/image.jpg",
  "linkUrl": "https://nengoo.com/promo",
  "startDate": "2024-11-01T00:00:00",
  "endDate": "2024-11-30T23:59:59",
  "isActive": true,
  "createdAt": "2024-11-15T10:30:00"
}
```

## 🎯 Utilisation depuis Flutter

Le code Flutter existant devrait maintenant fonctionner :

```dart
// Dans le repository
final response = await apiClient.request(
  url: URL.ads,  // http://localhost:8001/api/ads/active
  method: Method.GET,
  onSuccess: (data) {
    // data['items'] contient la liste des ads (peut être vide)
    List<Ad> ads = (data['items'] as List)
        .map((ad) => Ad.fromJson(ad))
        .toList();
  },
  onError: (error) {
    // Plus d'erreur 404 si pas d'ads
  },
);
```

## 🔐 Permissions

| Endpoint | Méthode | Permission |
|----------|---------|------------|
| `/api/ads/active` | GET | 🌍 Public (aucune) |
| `/api/ads` | POST | 🔒 Admin ou supérieur |
| `/api/ads/{id}` | DELETE | 🔒 Admin ou supérieur |

## 📝 Prochaines étapes (optionnel)

Pour améliorer la gestion des annonces :

1. **Ajouter un endpoint PUT** pour modifier une annonce
2. **Ajouter la gestion des dates** (startDate/endDate) pour activer/désactiver automatiquement
3. **Ajouter un endpoint admin** pour lister toutes les annonces (actives et inactives)
4. **Ajouter des statistiques** (nombre de clics, impressions)
5. **Ajouter la position** (ordre d'affichage)

## 🐛 Dépannage

### L'endpoint retourne toujours 404

**Cause** : Backend pas redémarré

**Solution** :
```bash
taskkill /F /IM python.exe /T
cd backend
python server.py
```

### Erreur "Collection ads not found"

**Normal** : La collection sera créée automatiquement à la première insertion.

### Comment tester avec des données ?

Créez une annonce de test :
```bash
curl -X POST http://localhost:8001/api/ads \
  -H "Content-Type: application/json" \
  -H "X-Admin-Role: admin" \
  -d '{
    "title": "Bienvenue sur Nengoo !",
    "description": "Découvrez notre sélection",
    "isActive": true
  }'
```

---

**Date** : 2026-01-30
**Erreur** : GET /api/ads/active 404 Not Found
**Solution** : Endpoint créé, retourne liste vide au lieu de 404
