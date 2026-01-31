# Corrections de la fonctionnalité de favoris

## Problèmes identifiés et corrigés

### 1. Incohérence de nommage Backend/Frontend
**Problème:** Le backend utilise `isFavourite` (avec 'u') tandis que certains modèles Flutter utilisaient `isFavorite` ou `favorite`.

**Solution:**
- ✅ `user_product_interaction_data.dart` : Ajout du support pour `isFavourite` en fallback
- ✅ `post_product_interaction_response_dto.dart` : Ajout du support pour `isFavourite` en fallback

### 2. Logique de pagination incorrecte
**Problème:** Dans `favourite_bloc.dart`, le flag `hasReachedMax` se basait sur `data.content.length` au lieu de `filteredFavourites.length`, ce qui causait des problèmes de pagination.

**Solution:**
- ✅ `favourite_bloc.dart` : Correction de la logique dans `_onFetchFavourites` et `_onLoadMoreFavourites`

### 3. Erreur de sérialisation dans le backend
**Problème:** Le champ `_id` de MongoDB n'était pas retiré avant la sérialisation JSON, causant une erreur 500.

**Solution:**
- ✅ `backend/server.py` : Suppression du champ `_id` avant de renvoyer les produits enrichis

## Test Backend

Le test `backend/test_favorites_functionality.py` vérifie:
1. ✅ Ajout d'un produit aux favoris
2. ✅ Récupération des interactions utilisateur
3. ✅ Filtrage des favoris
4. ✅ Retrait d'un produit des favoris
5. ✅ Cohérence du champ `isFavourite`

**Résultat:** Tous les tests passent avec succès ✅

## Fonctionnement dans l'application Flutter

### Page des détails du produit
**Fichier:** `nengoo-front/lib/screens/details/view/components/product_description.dart`

Le bouton cœur (lignes 71-101):
- Affiche un cœur rouge quand `state.isFavorite` est `true`
- Affiche un cœur gris quand `state.isFavorite` est `false`
- Déclenche `ToggleFavoriteEvent` lors du clic

### Bloc de détails
**Fichier:** `nengoo-front/lib/screens/details/bloc/details_bloc.dart`

L'événement `ToggleFavoriteEvent`:
1. Fait une mise à jour optimiste de l'UI
2. Appelle `interactionRepository.postProductInteraction()` avec le `productId`
3. Envoie `isFavourite`, `rating` et `interaction` au backend
4. Met à jour l'état avec la réponse du serveur
5. Revient en arrière en cas d'erreur

### Page des favoris
**Fichier:** `nengoo-front/lib/screens/favourite/bloc/favourite_bloc.dart`

La page des favoris:
1. Charge les interactions de l'utilisateur avec pagination
2. Filtre uniquement les produits avec `favorite: true`
3. Affiche les produits favoris dans une liste scrollable
4. Supporte le pull-to-refresh

## Endpoints Backend

### POST /api/interaction/{product_id}
Crée ou met à jour une interaction produit.

**Headers:**
- `X-Buyer-Id` ou `X-Seller-Id`

**Body:**
```json
{
  "isFavourite": true,
  "rating": 5,
  "interaction": "VIEW"
}
```

**Réponse:**
```json
{
  "status": "OK",
  "statusCode": 200,
  "data": {
    "id": "int_xxx",
    "userId": "buyer_xxx",
    "productId": "prod_xxx",
    "isFavourite": true,
    "rating": 5,
    "interaction": "VIEW",
    "timestamp": "2026-01-30T23:56:03.462284"
  }
}
```

### GET /api/interactions/user
Récupère toutes les interactions d'un utilisateur.

**Headers:**
- `X-Buyer-Id` ou `X-Seller-Id`

**Query params:**
- `page`: Numéro de page (défaut: 0)
- `size`: Taille de page (défaut: 8)
- `sort`: Tri (défaut: "timestamp,desc")

**Réponse:**
```json
{
  "status": "OK",
  "statusCode": 200,
  "data": {
    "content": [
      {
        "id": "int_xxx",
        "product": { /* détails du produit */ },
        "isFavourite": true,
        "rating": 5,
        "interaction": "VIEW",
        "timestamp": "2026-01-30T23:56:03.462284"
      }
    ],
    "totalElements": 10,
    "totalPages": 2,
    "size": 8,
    "number": 0,
    "first": true,
    "last": false
  }
}
```

## Utilisation dans l'application

1. **Ajouter un favori:**
   - Ouvrir la fiche d'un produit
   - Cliquer sur l'icône cœur à droite (sous le prix)
   - Le cœur devient rouge
   - Le produit est sauvegardé comme favori pour l'utilisateur

2. **Retirer un favori:**
   - Sur la fiche produit, cliquer à nouveau sur le cœur rouge
   - Le cœur redevient gris
   - Le produit est retiré des favoris

3. **Voir les favoris:**
   - Naviguer vers l'onglet "Favoris" dans la barre de navigation
   - Tous les produits favoris sont affichés
   - Cliquer sur un produit pour voir ses détails
   - Pull-to-refresh pour actualiser la liste

## Notes techniques

- Le système utilise une **mise à jour optimiste**: l'UI se met à jour immédiatement, avant la réponse du serveur
- En cas d'erreur réseau, l'état est **annulé** automatiquement
- La pagination charge **8 éléments par page**
- Les favoris sont filtrés **côté client** depuis les interactions
- L'authentification utilise les headers **X-Buyer-Id** ou **X-Seller-Id**
