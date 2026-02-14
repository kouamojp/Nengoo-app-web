# Gestion du Carrousel Hero - Documentation Admin

## Vue d'ensemble

Le carrousel hero de la page d'accueil permet d'afficher plusieurs images qui défilent automatiquement. Les images sont gérées par le super administrateur via l'API backend.

## Architecture

### Backend (FastAPI)

#### Modèle de données
```python
class HomepageSettings(BaseModel):
    heroImages: List[str] = Field(default=[], description="Liste des URLs des images du carrousel hero")
```

#### Endpoints API

**GET /api/settings/homepage**
- Récupère la liste des images hero
- Retourne des images par défaut si aucune n'est configurée
- Pas d'authentification requise (lecture publique)

```json
{
  "heroImages": [
    "https://example.com/image1.jpg",
    "https://example.com/image2.jpg",
    "https://example.com/image3.jpg"
  ]
}
```

**PUT /api/settings/homepage**
- Met à jour la liste des images hero
- Authentification super admin requise
- Header: `Authorization: Bearer <token>`

```json
{
  "heroImages": [
    "https://example.com/new-image1.jpg",
    "https://example.com/new-image2.jpg"
  ]
}
```

### Frontend (React)

#### Configuration Swiper.js

Le carrousel utilise Swiper.js avec les modules suivants :
- **Navigation** : Flèches gauche/droite
- **Pagination** : Points de navigation en bas
- **Autoplay** : Défilement automatique toutes les 5 secondes
- **EffectFade** : Transition en fondu entre les slides

#### Caractéristiques
- Responsive (adapté mobile/desktop)
- Loop infini si plusieurs images
- Pause au survol (desktop)
- Contrôles tactiles (mobile)

## Comment uploader des images

### Option 1 : Via l'API directement (curl/Postman)

```bash
# 1. Se connecter et obtenir le token admin
curl -X POST https://nengoo-app-web.onrender.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@nengoo.com","password":"votre_password"}'

# 2. Uploader une image sur S3
curl -X POST https://nengoo-app-web.onrender.com/api/upload \
  -H "Authorization: Bearer <votre_token>" \
  -F "file=@/path/to/image.jpg"

# 3. Mettre à jour les images hero avec les URLs retournées
curl -X PUT https://nengoo-app-web.onrender.com/api/settings/homepage \
  -H "Authorization: Bearer <votre_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "heroImages": [
      "https://nengoo-s3.s3.amazonaws.com/image1.jpg",
      "https://nengoo-s3.s3.amazonaws.com/image2.jpg",
      "https://nengoo-s3.s3.amazonaws.com/image3.jpg"
    ]
  }'
```

### Option 2 : Interface d'administration React (à créer)

Voir le fichier `HeroImagesManager.js` pour un exemple de composant React permettant de gérer les images hero avec une interface utilisateur complète.

## Recommandations pour les images

### Dimensions recommandées
- **Largeur** : 1920px (desktop)
- **Hauteur** : 1080px
- **Ratio** : 16:9 ou similaire
- **Format** : JPG ou WebP (optimisé)
- **Poids** : < 500KB par image (optimisé pour le web)

### Optimisation
```bash
# Avec ImageMagick
convert input.jpg -resize 1920x1080^ -gravity center -extent 1920x1080 -quality 85 output.jpg

# Avec cwebp (WebP)
cwebp -q 85 input.jpg -o output.webp
```

### Bonnes pratiques
1. **Nombre d'images** : 3-5 images maximum pour ne pas ralentir le chargement
2. **Cohérence visuelle** : Utiliser des images avec des couleurs complémentaires
3. **Text overlay** : Éviter de placer du texte important sur les zones qui changent
4. **Mobile-first** : S'assurer que l'élément central de l'image est visible sur mobile
5. **Accessibilité** : Utiliser des images avec un bon contraste pour les textes superposés

## Structure des fichiers modifiés

```
Nengoo-app-web/
├── backend/
│   └── server.py                          # Modifié : HomepageSettings model + endpoints
├── frontend/
│   ├── package.json                       # Modifié : ajout de swiper
│   └── src/
│       └── components/
│           └── pages/
│               ├── Homepage.js            # Modifié : intégration Swiper
│               ├── HeroSwiper.css         # Nouveau : styles personnalisés
│               └── HeroImagesManager.js   # Nouveau : interface admin (exemple)
└── docs/
    └── HERO_CAROUSEL_ADMIN.md            # Ce fichier
```

## Dépannage

### Le carrousel ne s'affiche pas
1. Vérifier que les images sont bien chargées (ouvrir les URLs dans un navigateur)
2. Vérifier la console du navigateur pour les erreurs
3. Vérifier que Swiper.js est installé : `npm list swiper`

### Les images ne se mettent pas à jour
1. Vider le cache du navigateur (Ctrl+Shift+R)
2. Vérifier que l'API retourne les bonnes données : `GET /api/settings/homepage`
3. Vérifier les logs du backend pour les erreurs

### Performance lente
1. Optimiser la taille des images (< 500KB)
2. Utiliser le format WebP
3. Réduire le nombre d'images (3-4 maximum)
4. Activer la mise en cache côté serveur

## Support

Pour toute question ou problème, contacter l'équipe technique Nengoo.

**Version** : 1.0
**Dernière mise à jour** : 4 février 2026
