# Fix: Authentification des favoris avec Bearer Token

## Problème
L'application Flutter envoyait `Authorization: Bearer buyer_73b41c54` mais le backend attendait les headers `X-Buyer-Id` ou `X-Seller-Id`, causant l'erreur :
```
InteractionRepository.postProductInteraction ERROR: {detail: User ID required}
DetailsBloc._onToggleFavorite error: {detail: User ID required}
```

## Solution appliquée

### 1. Nouvelle fonction helper d'authentification ✅

**Fichier:** `backend/server.py` (après ligne 91)

Ajout d'une fonction qui extrait l'ID utilisateur depuis :
- Le header `Authorization: Bearer <user_id>` (standard REST API)
- Les headers legacy `X-Buyer-Id` ou `X-Seller-Id` (rétrocompatibilité)

```python
async def get_user_id_from_request(
    authorization: Optional[str] = Header(None),
    x_buyer_id: Optional[str] = Header(None, alias="X-Buyer-Id"),
    x_seller_id: Optional[str] = Header(None, alias="X-Seller-Id")
) -> Optional[str]:
    """Extract user ID from Authorization Bearer token or X-Buyer-Id/X-Seller-Id headers"""
    # First check custom headers (legacy support)
    if x_buyer_id:
        return x_buyer_id
    if x_seller_id:
        return x_seller_id

    # Extract from Bearer token
    if authorization and authorization.startswith("Bearer "):
        token = authorization.replace("Bearer ", "").strip()
        # Token is the user ID itself (e.g., "buyer_73b41c54")
        return token

    return None
```

### 2. Endpoints modifiés ✅

Trois endpoints d'interaction ont été mis à jour pour utiliser la nouvelle fonction :

#### a) POST /api/interaction/{product_id}
**Avant:**
```python
async def create_product_interaction(
    product_id: str,
    interaction_data: ProductInteractionCreate,
    x_buyer_id: Optional[str] = Header(None, alias="X-Buyer-Id"),
    x_seller_id: Optional[str] = Header(None, alias="X-Seller-Id")
):
    user_id = x_buyer_id or x_seller_id
```

**Après:**
```python
async def create_product_interaction(
    product_id: str,
    interaction_data: ProductInteractionCreate,
    user_id: Optional[str] = Depends(get_user_id_from_request)
):
```

#### b) GET /api/interactions/product/{product_id}
**Avant:**
```python
async def get_product_interactions(
    product_id: str,
    x_buyer_id: Optional[str] = Header(None, alias="X-Buyer-Id"),
    x_seller_id: Optional[str] = Header(None, alias="X-Seller-Id")
):
    user_id = x_buyer_id or x_seller_id
```

**Après:**
```python
async def get_product_interactions(
    product_id: str,
    user_id: Optional[str] = Depends(get_user_id_from_request)
):
```

#### c) GET /api/interactions/user
**Avant:**
```python
async def get_user_interactions(
    x_buyer_id: Optional[str] = Header(None, alias="X-Buyer-Id"),
    x_seller_id: Optional[str] = Header(None, alias="X-Seller-Id"),
    page: int = 0,
    size: int = 8,
    sort: str = "timestamp,desc"
):
    user_id = x_buyer_id or x_seller_id
```

**Après:**
```python
async def get_user_interactions(
    user_id: Optional[str] = Depends(get_user_id_from_request),
    page: int = 0,
    size: int = 8,
    sort: str = "timestamp,desc"
):
```

## Tests effectués ✅

Le script `backend/test_favorites_bearer_token.py` vérifie :

1. ✅ Ajout de favoris avec `Authorization: Bearer`
2. ✅ Récupération des interactions utilisateur avec Bearer
3. ✅ Rétrocompatibilité avec `X-Buyer-Id` header
4. ✅ Rejet des requêtes non authentifiées (401)
5. ✅ Récupération des stats d'interaction produit

**Résultat:** Tous les tests passent avec succès ! 🎉

## Utilisation

### Depuis Flutter (Application mobile)

L'application envoie déjà le bon format :

```dart
// api_client.dart
Map<String, String> headerWithAuth(AuthResponseDTOData auth) => {
  "Accept": "application/json",
  "Content-Type": "application/json",
  'Authorization': 'Bearer ${auth.token}' // ✅ Fonctionne maintenant !
};
```

### Exemple de requête

```bash
# Ajouter aux favoris
curl -X POST "http://localhost:8001/api/interaction/prod_123" \
  -H "Authorization: Bearer buyer_73b41c54" \
  -H "Content-Type: application/json" \
  -d '{
    "isFavourite": true,
    "rating": 5,
    "interaction": "VIEW"
  }'
```

### Rétrocompatibilité

Les anciennes requêtes avec headers custom fonctionnent toujours :

```bash
curl -X POST "http://localhost:8001/api/interaction/prod_123" \
  -H "X-Buyer-Id: buyer_73b41c54" \
  -H "Content-Type: application/json" \
  -d '{...}'
```

## Avantages de la solution

✅ **Standard REST API** - Utilise le header Authorization standard
✅ **Rétrocompatible** - Les anciens headers fonctionnent toujours
✅ **Pas de changement Flutter** - L'app mobile fonctionne directement
✅ **Simplifié** - Un seul paramètre `user_id` au lieu de deux
✅ **Testable** - Script de test complet fourni

## Priorité d'authentification

La fonction `get_user_id_from_request` vérifie dans cet ordre :

1. Header `X-Buyer-Id` (priorité haute pour compatibilité)
2. Header `X-Seller-Id` (priorité haute pour compatibilité)
3. Header `Authorization: Bearer <token>` (nouveau standard)

Cela garantit que les anciennes intégrations continuent de fonctionner.

## Endpoints affectés

| Endpoint | Méthode | Changement |
|----------|---------|------------|
| `/api/interaction/{product_id}` | POST | ✅ Modifié |
| `/api/interactions/product/{product_id}` | GET | ✅ Modifié |
| `/api/interactions/user` | GET | ✅ Modifié |

## Notes pour le futur

### Migration complète vers Bearer token

Pour migrer complètement vers Bearer token à l'avenir :

1. Mettre à jour tous les clients pour utiliser `Authorization: Bearer`
2. Déprécier les headers `X-Buyer-Id` / `X-Seller-Id`
3. Après une période de transition, retirer le support legacy

### Amélioration possible: JWT réels

Actuellement, le "token" est juste l'ID utilisateur. Pour plus de sécurité :

1. Implémenter de vrais tokens JWT signés
2. Inclure l'expiration dans le token
3. Valider la signature du token
4. Stocker les refresh tokens

Exemple de structure JWT :
```json
{
  "user_id": "buyer_73b41c54",
  "user_type": "buyer",
  "exp": 1738368000,
  "iat": 1738281600
}
```

## Commandes de test

```bash
# Tester l'authentification Bearer
cd backend
python test_favorites_bearer_token.py

# Tester la fonctionnalité complète des favoris
python test_favorites_functionality.py
```

## Résolution du problème dans l'app

L'erreur dans l'application Flutter est maintenant **résolue** ! L'utilisateur peut :

1. ✅ Cliquer sur l'icône cœur dans la fiche produit
2. ✅ Le produit est ajouté aux favoris
3. ✅ L'icône devient rouge
4. ✅ Le produit apparaît dans l'onglet Favoris
5. ✅ Re-cliquer retire le produit des favoris

**Aucune modification n'est nécessaire dans l'application Flutter !** 🎉
