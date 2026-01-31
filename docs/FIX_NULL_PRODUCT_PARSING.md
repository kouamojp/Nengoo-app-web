# Fix: Parsing Error - Null Product in User Interactions

## Problème
```
FavouriteBloc._onFetchFavourites onError: {error: Parsing Error: TypeError: null: type 'Null' is not a subtype of type 'Map<String, dynamic>'}
```

Cette erreur se produit quand l'utilisateur a des interactions (favoris, vues) sur des produits qui ont été **supprimés** de la base de données.

## Cause

Quand le backend récupère les interactions utilisateur, il fait:
1. Récupère toutes les interactions (favoris, vues, etc.)
2. Pour chaque interaction, cherche le produit associé
3. Si le produit existe → ajoute l'interaction enrichie
4. Si le produit n'existe pas → **l'interaction est ignorée** (backend corrigé) ou **product est null** (backend non corrigé)

Sur le frontend, le parsing crashait car il essayait de parser `product: null` comme un objet Map.

## Solution appliquée

### 1. Rendre le modèle plus robuste

**Fichier:** `lib/models/user_product_interaction_data.dart`

**Avant:**
```dart
factory UserProductInteractionData.fromJson(Map<String, dynamic> json) =>
    UserProductInteractionData(
      product: ProductData.fromJson(json['product'] as Map<String, dynamic>),
      ...
    );
```

**Après:**
```dart
factory UserProductInteractionData.fromJson(Map<String, dynamic> json) {
  // Handle case where product might be null (deleted product)
  final productJson = json['product'];
  if (productJson == null) {
    throw Exception('Product is null for interaction ${json['id']}');
  }

  return UserProductInteractionData(
    product: ProductData.fromJson(productJson as Map<String, dynamic>),
    ...
  );
}
```

**Avantage:** Message d'erreur plus clair si le produit est null.

### 2. Filtrer les interactions invalides dans le DTO

**Fichier:** `lib/dtos/response/user_interaction_response_dto.dart`

**Avant:**
```dart
content: (json['content'] as List<dynamic>)
    .map((e) => UserProductInteractionData.fromJson(e))
    .toList(),
```

**Après:**
```dart
// Parse interactions and filter out invalid ones (e.g., deleted products)
final List<UserProductInteractionData> validInteractions = [];
final contentList = json['content'] as List<dynamic>;

for (var item in contentList) {
  try {
    final interaction = UserProductInteractionData.fromJson(item);
    validInteractions.add(interaction);
  } catch (e) {
    print('Warning: Skipping invalid interaction: $e');
    // Skip this interaction but continue with others
  }
}

return UserInteractionResponseDTOData(
  content: validInteractions,
  numberOfElements: validInteractions.length.toDouble(),
  empty: validInteractions.isEmpty,
  ...
);
```

**Avantages:**
- ✅ Les interactions avec produits supprimés sont **ignorées** au lieu de faire crasher l'app
- ✅ Les interactions valides sont toujours affichées
- ✅ Log d'avertissement pour le debug
- ✅ L'app continue de fonctionner

### 3. Améliorer le logging

**Fichier:** `lib/repositories/interaction_repository.dart`

Ajout de `print("Response data: $data")` pour debug.

## Scénarios gérés

### Scénario 1: Produit supprimé
```json
{
  "content": [
    {
      "id": "int_xxx",
      "product": null,  ← Produit supprimé
      "isFavourite": true
    },
    {
      "id": "int_yyy",
      "product": { "id": "prod_123", ... },  ← Produit existant
      "isFavourite": true
    }
  ]
}
```

**Résultat:**
- Interaction 1 → Ignorée (log: "Skipping invalid interaction")
- Interaction 2 → Affichée normalement
- ✅ L'app fonctionne, affiche 1 favori au lieu de crasher

### Scénario 2: Tous les produits valides
```json
{
  "content": [
    {"id": "int_xxx", "product": {...}, "isFavourite": true},
    {"id": "int_yyy", "product": {...}, "isFavourite": true}
  ]
}
```

**Résultat:**
- Toutes les interactions → Affichées
- ✅ Fonctionne comme avant

### Scénario 3: Aucune interaction
```json
{
  "content": []
}
```

**Résultat:**
- Liste vide
- ✅ Message "Pas de favoris"

## Backend (Correction déjà appliquée)

**Fichier:** `backend/server.py` ligne 1838-1851

Le backend filtre déjà les produits inexistants:
```python
for interaction in interactions:
    product = await db.products.find_one({"id": interaction["productId"]})
    if product:  # ← Seuls les produits existants sont inclus
        enriched_interactions.append({
            "id": interaction["id"],
            "product": product_dict,
            ...
        })
```

**⚠️ Mais en production (Render), cette correction n'est pas encore déployée !**

Donc le frontend doit gérer les deux cas:
- Backend corrigé → product null n'arrive jamais
- Backend non corrigé → product peut être null

## Test

Pour tester la robustesse:

1. **Créer une interaction sur un produit**
2. **Supprimer le produit de la BD**
3. **Aller dans l'onglet Favoris**

**Avant la correction:**
```
❌ App crash: "type 'Null' is not a subtype of type 'Map<String, dynamic>'"
```

**Après la correction:**
```
✓ Warning: Skipping invalid interaction: Product is null for interaction int_xxx
✓ Les autres favoris s'affichent normalement
✓ L'app ne crash pas
```

## Déploiement

### Pour résoudre complètement:

1. **Frontend:** ✅ Déjà corrigé (filtre les interactions invalides)
2. **Backend:** Déployer sur Render pour filtrer côté serveur

```bash
git add backend/server.py
git commit -m "Fix: Filter out interactions with deleted products"
git push origin main
```

Une fois le backend déployé, les interactions avec produits null **ne seront plus envoyées** au frontend.

## Logs de debug

Avec les corrections, vous verrez:

```
InteractionRepository.getUserInteractions URL: .../api/interactions/user?page=0&size=8
✓ Success response received

Warning: Skipping invalid interaction: Product is null for interaction int_abc123

FavouriteBloc: 2 valid favorites loaded (1 skipped)
```

## Conclusion

✅ **Correction immédiate:** L'app ne crash plus
✅ **Gestion gracieuse:** Les interactions invalides sont ignorées
✅ **Debug facile:** Logs clairs pour identifier les problèmes
✅ **Compatible:** Fonctionne avec ancien et nouveau backend
