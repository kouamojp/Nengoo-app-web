# Debug: "Session expired or unauthorized" lors de la mise en favoris

## Problème
Quand vous cliquez sur le bouton favori (❤️), vous recevez l'erreur :
```
session expired or unauthorized
```

## Causes possibles

### 1. Token non sauvegardé après login
Le token d'authentification n'est pas sauvegardé dans le LocalStorage après la connexion.

### 2. Token vide ou null
Le token existe mais est vide ou null.

### 3. Backend non redémarré
Les modifications du backend pour accepter le Bearer token n'ont pas été appliquées.

### 4. Mauvais format de token
Le token n'a pas le bon format (doit être `buyer_xxx` ou `seller_xxx`).

## Étapes de diagnostic

### Étape 1: Vérifier les logs Flutter

Après avoir ajouté le logging, lancez l'app et regardez les logs dans la console :

```
flutter run
```

Quand vous cliquez sur le bouton favori, vous devriez voir:

```
DetailsBloc._onToggleFavorite: Starting for product prod_xxx
  Current favorite status: false
  New favorite status: true
  Payload: isFavourite=true, rating=0
  Calling postProductInteraction...

InteractionRepository.postProductInteraction:
  Product ID: prod_xxx
  Auth token: buyer_73b41c54  ← VÉRIFIER ICI
  Token length: 16
  URL: https://.../api/interaction/prod_xxx
  Body: {isFavourite: true, rating: 0, interaction: VIEW}

{Accept: application/json, Content-Type: application/json, Authorization: Bearer buyer_73b41c54}
```

**⚠️ SI LE TOKEN EST NULL/EMPTY:**
```
Auth token: NULL/EMPTY  ← PROBLÈME!
```
→ Le token n'a pas été sauvegardé après la connexion.

### Étape 2: Vérifier le login

1. **Déconnectez-vous** de l'application
2. **Reconnectez-vous**
3. Vérifiez les logs après login:

```
SignInBloc: Login successful
Token saved: buyer_73b41c54  ← Devrait apparaître
```

Si le token n'apparaît pas, le problème est au niveau du login.

### Étape 3: Vérifier le backend

Le backend doit avoir été redémarré avec les modifications pour accepter Bearer token.

**Vérifiez que le fichier `backend/server.py` contient:**

```python
async def get_user_id_from_request(
    authorization: Optional[str] = Header(None),
    x_buyer_id: Optional[str] = Header(None, alias="X-Buyer-Id"),
    x_seller_id: Optional[str] = Header(None, alias="X-Seller-Id")
) -> Optional[str]:
    """Extract user ID from Authorization Bearer token"""
    ...
```

**Puis redémarrez le backend:**

```bash
cd backend
# Arrêtez le serveur (Ctrl+C)
# Redémarrez-le
python server.py
```

### Étape 4: Tester l'endpoint directement

Testez l'endpoint avec curl pour vérifier qu'il accepte le Bearer token:

```bash
# Remplacez buyer_test_123 par votre ID utilisateur réel
# Remplacez prod_xxx par un vrai ID de produit

curl -X POST "http://localhost:8001/api/interaction/prod_b785a656" \
  -H "Authorization: Bearer buyer_test_123" \
  -H "Content-Type: application/json" \
  -d '{
    "isFavourite": true,
    "rating": 5,
    "interaction": "VIEW"
  }'
```

**Réponse attendue (succès):**
```json
{
  "status": "OK",
  "statusCode": 200,
  "data": {
    "id": "int_xxx",
    "userId": "buyer_test_123",
    "productId": "prod_b785a656",
    "isFavourite": true,
    "rating": 5,
    "interaction": "VIEW"
  }
}
```

**Réponse d'erreur (401):**
```json
{
  "detail": "User ID required"
}
```

→ Le backend ne reconnaît pas le token Bearer.

## Solutions selon le diagnostic

### Solution 1: Token NULL/EMPTY

**Problème:** Le token n'est pas sauvegardé après login.

**Vérifiez dans `sign_in_bloc.dart`:**

```dart
await LocalCacheManager.setToken(
    key: "auth_token",
    value: loginData.data.token
);
```

Cette ligne doit être exécutée après un login réussi.

**Test rapide:**
1. Ajoutez un `print("Token saved: ${loginData.data.token}")` après le `setToken`
2. Relancez l'app et reconnectez-vous
3. Vérifiez que le token s'affiche

### Solution 2: Backend pas redémarré

**Problème:** Le backend utilise encore l'ancienne logique.

**Solution:**
1. Stoppez le serveur backend (Ctrl+C)
2. Vérifiez que `server.py` contient la fonction `get_user_id_from_request`
3. Redémarrez: `python server.py`
4. Vérifiez les logs du backend au démarrage

### Solution 3: Mauvais format de token

**Problème:** Le token ne commence pas par `buyer_` ou `seller_`.

**Vérifiez dans les logs:**
```
Auth token: some_weird_format  ← PROBLÈME
```

Le token devrait ressembler à:
- `buyer_73b41c54` (pour un acheteur)
- `seller_a1b2c3d4` (pour un vendeur)

**Solution:** Vérifiez comment le backend génère le token lors du login.

### Solution 4: Problème de réseau/CORS

**Problème:** L'app mobile ne peut pas atteindre le backend.

**Vérifiez:**
1. L'URL du backend dans `url.dart`
2. Le backend est bien en cours d'exécution
3. Les CORS sont configurés (déjà fait normalement)

## Test complet

Script de test backend pour vérifier l'authentification:

```bash
cd backend
python test_favorites_bearer_token.py
```

Tous les tests devraient passer:
```
✓ Bearer token authentication works
✓ Legacy X-Buyer-Id header still works
✓ Unauthorized requests are properly rejected
```

## Logs à fournir pour le debug

Si le problème persiste, fournissez ces logs:

1. **Logs de login:**
```
[Copier les logs après la connexion]
```

2. **Logs de favoris:**
```
[Copier les logs quand vous cliquez sur le cœur]
```

3. **Token actuel:**
```dart
// Ajoutez ce code temporaire dans l'app
String? token = await LocalCacheManager.getToken("auth_token");
print("Current token: $token");
```

## Vérification rapide

**Checklist:**
- [ ] Le backend est démarré
- [ ] Le backend contient `get_user_id_from_request()`
- [ ] L'app est connectée (login réussi)
- [ ] Le token est sauvegardé (visible dans les logs)
- [ ] Le token a le bon format (`buyer_xxx` ou `seller_xxx`)
- [ ] Le test curl fonctionne
- [ ] Les logs montrent le token dans la requête

Si tous les points sont ✓ mais que ça ne fonctionne toujours pas, il y a peut-être un problème de cache ou de session Flutter.

**Solution de dernier recours:**
1. Arrêter complètement l'app
2. Faire `flutter clean`
3. Faire `flutter pub get`
4. Redémarrer l'app
5. Se reconnecter
