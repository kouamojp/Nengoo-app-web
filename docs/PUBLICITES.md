# Bannières publicitaires (V1)

Régie interne : l'équipe crée les campagnes dans l'administration (*Site → Publicités*, rôles
admin et super admin). Pas de réseau publicitaire tiers : les bannières sont celles de Nengoo,
de ses vendeurs ou de partenaires, vendues hors du site.

## Emplacements

| Emplacement | Où | Image grand écran | Image mobile |
|---|---|---|---|
| Accueil : milieu de page | entre les catégories et « Tous les produits » | 1200 × 300 | 800 × 400 (facultative) |
| Catalogue : haut des pages catégorie | sous le titre du catalogue | 1200 × 200 | 800 × 300 (facultative) |
| App mobile : accueil | carrousel de l'accueil de l'app | — | 800 × 400 |

Sans image mobile, l'image grand écran est recadrée sur téléphone : garder le texte au centre.
Une bannière sans campagne en cours n'occupe aucune place.

## Une campagne

- **Lien** : page du site (`/catalog/Mode`, `/seller/…`, `/product/…`) ou adresse `https://`.
  Les liens du site restent dans le site ; les autres s'ouvrent dans un nouvel onglet
  (`rel="sponsored"`). Dans l'app, un lien `/product/…` ouvre la fiche produit, les autres pages
  du site s'ouvrent dans le navigateur intégré.
- **Période** : début et fin facultatifs. La campagne apparaît et disparaît à l'heure dite.
- **Priorité** (1 à 10) : avec plusieurs campagnes au même emplacement, une priorité 3 s'affiche
  trois fois plus souvent qu'une priorité 1.
- **Catégories ciblées** (catalogue seulement) : aucune cochée = tout le catalogue. Une catégorie
  principale couvre ses sous-catégories.
- **Pause** : retire la bannière tout de suite en gardant ses statistiques (la suppression les efface).

Chaque bannière porte la mention « Sponsorisé ».

## Statistiques

- **Vue** : bannière visible au moins à moitié, une fois par page affichée (une fois par lancement
  dans l'app). **Clic** : chaque ouverture du lien. Les robots (user-agent) ne sont pas comptés.
- Agrégées par jour (`ad_stats`) ; l'administration montre vues, clics et taux de clic sur 7, 30
  ou 90 jours, avec le détail jour par jour.

## Technique

- Serveur : `backend/routers/ads.py` (collections `ad_banners`, `ad_stats`, index créés au démarrage).
  - Public : `GET /api/promotions?placement=…&category=…`, `POST /api/promotions/{id}/view`,
    `POST /api/promotions/{id}/open`.
  - Admin : `/api/admin/promotions` (liste, création, modification, statut, suppression, stats).
  - Les chemins publics ne contiennent pas « ads » : les bloqueurs de publicité filtrent ces
    adresses et masqueraient les bannières.
  - `GET /api/ads/active` (ancienne route) renvoie les campagnes « App mobile : accueil » au format
    des versions de l'app déjà installées (affichage sans comptage).
- Site : `frontend/src/components/promotions/PromoSlot.js`, `frontend/src/lib/promotions.js`,
  administration `frontend/src/components/admin/PromotionManagement.js`.
- App : `nengoo-front/lib/helper/promotions.dart`, `lib/screens/home/view/components/ads_banner.dart`.
- Images : envoyées sur S3 comme celles du carrousel (`/generate-presigned-url`).

## Étapes suivantes (V2)

Achat par les vendeurs depuis leur espace (emplacement, durée, paiement Mobile Money, validation
par l'admin) et statistiques visibles par l'annonceur ; puis produits sponsorisés dans la recherche.
