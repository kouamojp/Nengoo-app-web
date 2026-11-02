# Phase 3 : recherche et images

État au 2 novembre 2026. Le catalogue reste chargé en une seule fois (choix validé) ; `/api/products` accepte quand même `limit`, `skip`, `sort`, `minPrice` et `maxPrice` pour un usage futur.

## Recherche

- `backend/product_search.py` : recherche calculée par le serveur, tolérante aux fautes de frappe, accents, pluriels, mots collés et synonymes (liste `SYNONYMS`, à compléter). Cherche dans le nom, la catégorie, la marque, les mots-clés et la description. Environ 25 ms pour 625 produits ; passer à Atlas Search au-delà de quelques milliers de produits.
- `GET /api/products?search=` utilise cette recherche : le site et l'app en profitent sans mise à jour de l'app.
- `GET /api/search/suggest?q=` : 6 produits et 3 catégories pour la barre de recherche du site.
- Recherches sans résultat : la page de résultats du site (`track=true`) enregistre une recherche dont aucun produit ne contient tous les mots (collection `search_misses`). Écran **Administration › Recherches sans résultat**.

## Script du site

Espaces vendeur et admin, connexion (Firebase), carte des points de retrait et suppression de compte sont chargés à la demande : script principal de 1,38 Mo à 792 Ko (229 Ko compressé).

## Images

Pour chaque photo produit sur S3, deux versions WebP sous `uploads/variants/` : 400 px (listes, champ `thumbnails`) et 1000 px (fiche, champ `previews`), mises en cache un an par le navigateur. L'original reçoit le même en-tête de cache. Le site et l'app affichent la version réduite quand elle existe, sinon l'originale. Mesure sur 20 photos : 158 Ko en moyenne à l'origine, 21 Ko en version liste (-87 %).

- Nouvelles photos : traitées automatiquement après l'enregistrement du produit (tâche de fond).
- Photos existantes : script `migrations/image_variants_2026_11.py`.

### Mise en production

1. Installer Pillow dans l'environnement Python du serveur : `pip install Pillow==11.3.0` (ajouté à `requirements.txt`), puis déployer et redémarrer. Sans Pillow, le site fonctionne mais aucune version réduite n'est créée.
2. Simuler et mesurer :
   ```
   python -m migrations.image_variants_2026_11 --url "$MONGO_URL" --db nengoo --sample 20
   ```
3. Essayer sur 3 produits, puis vérifier leurs photos sur le site :
   ```
   python -m migrations.image_variants_2026_11 --url "$MONGO_URL" --db nengoo --allow-remote --apply --limit 3
   ```
4. Traiter le reste (même commande sans `--limit`). Les produits déjà traités sont ignorés.

### Retour arrière

```
python -m migrations.image_variants_2026_11 --url "$MONGO_URL" --db nengoo --allow-remote --undo ~/nengoo-backups/migration-images-AAAAMMJJ-HHMMSS.json
```

Supprime les versions créées et remet les champs des produits. L'en-tête de cache ajouté aux originaux reste (même contenu, aucun effet sur l'affichage). Le site et l'app reviennent d'eux-mêmes aux originales.
