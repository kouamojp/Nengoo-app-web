# Phase 2 — Catégories et catalogue

État au 2 novembre 2026. Tout a été testé sur une copie locale de la base (`nengoo_test`). **Rien n'a encore été écrit en production.**

## Ce qui change

- **Arborescence** : 22 catégories principales (les 20 du cahier des charges, plus « Livres, école et bureau » et « Autres ») et 70 sous-catégories. Les 44 catégories existantes sont toutes reprises ; leur identifiant est conservé, donc leurs produits et leurs liens suivent. 48 catégories sont créées.
- **Anciens liens** : une catégorie renommée garde son ancien nom (`formerNames`). `/catalog/<ancien nom>` redirige vers la nouvelle adresse.
- **Produits sans rayon** : 67 produits dont la catégorie était écrite par son nom sont reclassés automatiquement. Les 250 autres pointent vers des catégories supprimées : l'écran **Administration › Reclassement** propose une catégorie pour 246 d'entre eux, à valider.
- **Cause corrigée** : on ne peut plus supprimer une catégorie qui contient des produits, ni créer un produit dans une catégorie qui n'existe pas.
- **Doublons** : deux catégories ne peuvent plus porter le même nom (accents, majuscules et pluriel compris).
- **Catégories** : nom anglais, image, ordre d'affichage, recherche dans l'administration. Les catégories sans produit sont masquées sur le site et dans l'app.
- **Produits** : champs marque, état (neuf, occasion, reconditionné) et caractéristiques côté serveur. Un prix promo doit être inférieur au prix normal.
- **Base** : 4 catégories reçoivent un identifiant fixe, 2 slugs en double sont corrigés (`-2`), 6 index sont créés (uniques sur les identifiants et les slugs).

## Arborescence proposée (à valider)

Pour la modifier, éditer `backend/category_tree.py` (`TREE`), puis relancer la simulation. « ex « … » » : catégorie existante renommée. Nombre de produits après la migration automatique, avant le reclassement manuel.

- **Téléphones et accessoires** (Phones and accessories) — existante, 2 produit(s)
    - **Smartphones** (Smartphones) — nouvelle, 0 produit(s)
    - **Tablettes** (Tablets) — nouvelle, 0 produit(s)
    - **Chargeurs et câbles** (Chargers and cables) — nouvelle, 0 produit(s)
    - **Écouteurs** (Earphones) — nouvelle, 0 produit(s)
    - **Batteries externes** (Power banks) — nouvelle, 0 produit(s)
    - **Coques et accessoires** (Cases and accessories) — nouvelle, 0 produit(s)
- **Informatique** (Computers) — ex « Informatique et accessoires », 0 produit(s)
    - **Ordinateurs** (Computers) — nouvelle, 0 produit(s)
    - **Imprimantes** (Printers) — nouvelle, 0 produit(s)
    - **Accessoires informatiques** (Computer accessories) — nouvelle, 0 produit(s)
- **Électronique** (Electronics) — existante, 26 produit(s)
    - **Audio, photo et vidéo** (Audio, photo and video) — existante, 0 produit(s)
    - **Petits appareils électroniques** (Small electronics) — nouvelle, 0 produit(s)
    - **Énergie solaire et électricité** (Solar energy and electrical) — ex « Énergie solaire et équipements électriques », 0 produit(s)
- **Mode femme** (Women's fashion) — nouvelle, 0 produit(s)
    - **Vêtements femme** (Women's clothing) — existante, 9 produit(s)
    - **Lingerie et nuit** (Lingerie and nightwear) — nouvelle, 0 produit(s)
    - **Chaussures femme** (Women's shoes) — existante, 70 produit(s)
    - **Sacs et accessoires femme** (Women's bags and accessories) — ex « Accessoires femmes », 76 produit(s)
- **Mode homme** (Men's fashion) — nouvelle, 0 produit(s)
    - **Vêtements homme** (Men's clothing) — existante, 1 produit(s)
    - **Chaussures homme** (Men's shoes) — existante, 34 produit(s)
    - **Accessoires homme** (Men's accessories) — existante, 6 produit(s)
- **Mode enfant** (Kids' fashion) — nouvelle, 0 produit(s)
    - **Vêtements enfant** (Kids' clothing) — existante, 4 produit(s)
    - **Chaussures enfant** (Kids' shoes) — existante, 8 produit(s)
- **Beauté et cosmétiques** (Beauty and cosmetics) — ex « Beauté et soins », 0 produit(s)
    - **Cheveux et perruques** (Hair and wigs) — ex « Bijoux et accessoires de beauté », 25 produit(s)
    - **Soins du corps et du visage** (Body and face care) — nouvelle, 0 produit(s)
    - **Parfums** (Perfumes) — nouvelle, 0 produit(s)
    - **Maquillage** (Make-up) — nouvelle, 0 produit(s)
- **Santé et bien-être** (Health and wellness) — nouvelle, 0 produit(s)
    - **Hygiène** (Hygiene) — nouvelle, 0 produit(s)
    - **Matériel médical** (Medical equipment) — nouvelle, 0 produit(s)
- **Maison et décoration** (Home and decor) — nouvelle, 0 produit(s)
    - **Meubles** (Furniture) — existante, 10 produit(s)
    - **Linge de maison et décoration** (Home textiles and decor) — ex « Textiles et Décorations », 31 produit(s)
    - **Cuisine et vaisselle** (Kitchen and tableware) — ex « Maison et cuisine », 0 produit(s)
- **Électroménager** (Home appliances) — nouvelle, 0 produit(s)
    - **Petit électroménager** (Small appliances) — nouvelle, 0 produit(s)
    - **Gros électroménager** (Large appliances) — nouvelle, 0 produit(s)
- **Alimentation et épicerie** (Food and groceries) — ex « Épicerie et produits vivriers », 0 produit(s)
    - **Fruits et légumes** (Fruits and vegetables) — existante, 0 produit(s)
    - **Produits transformés et conserves** (Processed and canned food) — existante, 0 produit(s)
    - **Poissons et produits de la mer** (Fish and seafood) — existante, 0 produit(s)
    - **Boissons** (Drinks) — nouvelle, 0 produit(s)
- **Produits du terroir camerounais** (Cameroonian local produce) — ex « Produits locaux », 2 produit(s)
    - **Plantain** (Plantain) — nouvelle, 0 produit(s)
    - **Manioc** (Cassava) — nouvelle, 0 produit(s)
    - **Macabo** (Cocoyam) — nouvelle, 0 produit(s)
    - **Igname** (Yam) — nouvelle, 0 produit(s)
    - **Maïs** (Maize) — nouvelle, 0 produit(s)
    - **Arachides** (Groundnuts) — nouvelle, 0 produit(s)
    - **Huile de palme** (Palm oil) — nouvelle, 0 produit(s)
    - **Cacao et café** (Cocoa and coffee) — nouvelle, 0 produit(s)
    - **Miel** (Honey) — nouvelle, 0 produit(s)
    - **Produits du terroir transformés** (Processed local produce) — nouvelle, 0 produit(s)
- **Agriculture et élevage** (Farming and livestock) — ex « Produits agricoles et élevage », 0 produit(s)
    - **Jardinage et matériel agricole** (Gardening and farm equipment) — existante, 0 produit(s)
    - **Animaux et accessoires** (Animals and pet supplies) — existante, 0 produit(s)
    - **Semences et intrants** (Seeds and inputs) — nouvelle, 0 produit(s)
- **Construction et bricolage** (Construction and DIY) — ex « Constructions », 0 produit(s)
    - **Outillage et bricolage** (Tools and DIY) — existante, 0 produit(s)
    - **Matériaux de construction** (Building materials) — nouvelle, 0 produit(s)
- **Automobile et pièces détachées** (Cars and spare parts) — ex « Auto, moto et pièces détachées », 0 produit(s)
    - **Pièces auto** (Car parts) — nouvelle, 0 produit(s)
    - **Accessoires auto** (Car accessories) — nouvelle, 0 produit(s)
- **Motos et transport** (Motorbikes and transport) — nouvelle, 0 produit(s)
    - **Motos** (Motorbikes) — nouvelle, 0 produit(s)
    - **Pièces moto** (Motorbike parts) — nouvelle, 0 produit(s)
    - **Vélos** (Bicycles) — nouvelle, 0 produit(s)
- **Bébé et maternité** (Baby and maternity) — ex « Bébé et puériculture », 0 produit(s)
    - **Articles pour enfant** (Kids' items) — existante, 9 produit(s)
    - **Puériculture** (Childcare) — nouvelle, 0 produit(s)
- **Sport et loisirs** (Sports and leisure) — nouvelle, 0 produit(s)
    - **Sports et fitness** (Sports and fitness) — existante, 0 produit(s)
    - **Camping et plein air** (Camping and outdoors) — existante, 0 produit(s)
    - **Jouets et jeux** (Toys and games) — existante, 0 produit(s)
    - **Bagagerie et voyage** (Luggage and travel) — existante, 0 produit(s)
- **Livres, école et bureau** (Books, school and office) — nouvelle, 0 produit(s)
    - **Livres et supports éducatifs** (Books and learning materials) — existante, 0 produit(s)
    - **Fournitures scolaires et papeterie** (School supplies and stationery) — existante, 0 produit(s)
    - **Fournitures de bureau** (Office supplies) — existante, 0 produit(s)
- **Artisanat et Made in Cameroon** (Crafts and Made in Cameroon) — ex « Artisanat et art », 0 produit(s)
    - **Pagnes et tissus traditionnels** (Wax prints and traditional fabrics) — existante, 0 produit(s)
    - **Tenues traditionnelles et de cérémonie** (Traditional and ceremonial wear) — ex « Vêtements traditionnels et tenues de cérémonie », 0 produit(s)
    - **Objets d'art et décoration artisanale** (Art and handmade decor) — nouvelle, 0 produit(s)
- **Équipements professionnels** (Professional equipment) — existante, 0 produit(s)
    - **Protection et sécurité** (Protection and safety) — ex « Équipements de protection et sécurité », 0 produit(s)
    - **Matériel pour commerces** (Shop equipment) — nouvelle, 0 produit(s)
- **Autres** (Other) — existante, 62 produit(s)

## Mise en production

À faire dans cet ordre, après validation de l'arborescence. Les commandes se lancent depuis `~/nengoo-backend` sur le serveur, avec l'environnement Python de l'application.

1. **Déployer le code** (backend et site). Sans migration, rien ne change pour les visiteurs : les nouvelles règles s'appliquent seulement aux prochaines créations et suppressions.
2. **Sauvegarder la base** : export Atlas (onglet *Backup*), ou `mongodump --uri "$MONGO_URL" --db nengoo --out ~/nengoo-backups/avant-phase2`.
3. **Simuler** (n'écrit rien) et vérifier les chiffres :
   ```
   python -m migrations.categories_2026_11 --url "$MONGO_URL" --db nengoo
   ```
   Attendu : 4 catégories sans id, 67 produits reclassés, 44 catégories mises à jour, 48 créées, 2 slugs, 6 index, 250 produits restant sans catégorie valide.
4. **Appliquer** :
   ```
   python -m migrations.categories_2026_11 --url "$MONGO_URL" --db nengoo --allow-remote --apply
   ```
   Le script affiche le chemin du journal d'annulation (dans `~/nengoo-backups`). Le garder.
5. **Vérifier** sur le site : accueil, catalogue, un ancien lien (`/catalog/Produits locaux`), une fiche produit, l'administration des catégories.
6. **Reclasser** les 250 produits restants dans **Administration › Reclassement**, puis vider « Autres » (62 produits).

## Retour arrière

- **Annuler la migration** (remet chaque champ modifié à sa valeur d'origine, supprime les catégories créées et les index ajoutés) :
  ```
  python -m migrations.categories_2026_11 --url "$MONGO_URL" --db nengoo --allow-remote --undo ~/nengoo-backups/migration-categories-AAAAMMJJ-HHMMSS.json
  ```
  Testé sur `nengoo_test` : la base revient octet pour octet à son état d'origine.
- Les reclassements faits ensuite dans l'administration ne sont pas dans ce journal : ils se défont produit par produit, ou par restauration de la sauvegarde de l'étape 2.
- **Annuler le code** : redéployer le commit précédent. Le code accepte une base migrée ou non.

## Suite : règles de saisie et nettoyage du catalogue

**Règles appliquées par le serveur** (et vérifiées avant envoi sur le site et dans l'app) :

- Nouveau produit : au moins une photo, prix supérieur à 0, description d'au moins 20 caractères, prix promo inférieur au prix normal. En modification, seuls les champs changés sont contrôlés : une fiche ancienne reste modifiable.
- Le catalogue public n'affiche plus les produits sans photo ou à prix nul.
- Vendeurs : numéro WhatsApp utilisable obligatoire (indicatif du pays), ville écrite de façon uniforme. Un vendeur ne peut plus changer lui-même le statut de son compte.
- Villes : liste proposée dans les formulaires (`GET /api/cities`), « DOUALA » ou « douala  » enregistré « Douala ». Une ville hors liste reste acceptée.
- Produits : marque, état (neuf, occasion, reconditionné) et caractéristiques libres, affichés sur la fiche produit.

**Nettoyage des données existantes** (`migrations/catalog_cleanup_2026_11.py`, même usage que la migration des catégories) :

```
python -m migrations.catalog_cleanup_2026_11 --url "$MONGO_URL" --db nengoo                          # simulation
python -m migrations.catalog_cleanup_2026_11 --url "$MONGO_URL" --db nengoo --allow-remote --apply   # écriture
python -m migrations.catalog_cleanup_2026_11 --url "$MONGO_URL" --db nengoo --allow-remote --undo <journal>
```

Simulation sur la production le 2 novembre 2026 : 41 prix promo retirés (33 égaux au prix, 8 supérieurs, dont des fautes de frappe comme 900 021 F pour un article à 15 000 F ; le client paie désormais le prix normal), 2 vendeurs sans identifiant, 16 villes uniformisées. Le journal est enregistré même si le script s'arrête sur une erreur.

**À corriger par les vendeurs** (impossible automatiquement) : 164 descriptions trop courtes, 35 doublons, 9 produits sans photo, 2 à prix nul, 5 numéros WhatsApp inutilisables (adresses e-mail, `SYSTEM_NENGOO`, `fotsotjp`, un numéro camerounais à 8 chiffres). La liste par vendeur est produite hors du dépôt (`nengoo-backups/fiches-a-corriger-AAAAMMJJ.csv`).
