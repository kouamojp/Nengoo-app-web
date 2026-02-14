# Guide de diagnostic - Images WhatsApp pour les produits

## Problème
Certains produits affichent leur image lors du partage sur WhatsApp, d'autres non.

## Causes possibles et solutions

### 1. 🔄 Cache WhatsApp (Cause la plus fréquente)
**Problème**: WhatsApp met en cache les métadonnées Open Graph pendant plusieurs jours/semaines.

**Solutions**:
- Utiliser l'outil de débogage Facebook: https://developers.facebook.com/tools/debug/
- Entrer l'URL de la page produit (ex: `https://www.nengoo.com/product/[slug-ou-id]`)
- Cliquer sur "Scrape Again" pour forcer le rafraîchissement
- Attendre quelques minutes puis retester

### 2. 🖼️ Images invalides ou vides
**Problème**: Certains produits peuvent avoir des URLs d'images vides ou invalides.

**Diagnostic**:
```bash
cd backend
python check_product_images.py
```

**Solutions**:
- Vérifier que tous les produits ont des URLs d'images valides
- S'assurer qu'il n'y a pas de chaînes vides dans le tableau `images`
- Mettre à jour les produits problématiques avec des URLs valides

### 3. 🚫 Images inaccessibles (404, 403, CORS)
**Problème**: L'URL de l'image est valide mais l'image n'est pas accessible publiquement.

**Diagnostic**:
- Tester l'URL de l'image directement dans un navigateur
- Vérifier le code de réponse HTTP (doit être 200)
- Utiliser la route de debug: `GET /api/og/debug/{product_id}`

**Exemple de test**:
```bash
# Tester l'image directement
curl -I https://votre-url-image.com/image.jpg

# Tester les métadonnées
curl https://www.nengoo.com/api/og/debug/prod_12345678
```

**Solutions**:
- Vérifier les permissions CORS sur le serveur d'images
- S'assurer que les images sont hébergées sur un domaine public
- Vérifier que le serveur répond correctement aux requêtes HEAD

### 4. 📏 Images trop lourdes
**Problème**: WhatsApp a une limite de ~8MB pour les images.

**Diagnostic**:
```bash
# Vérifier la taille d'une image
curl -I https://votre-url-image.com/image.jpg | grep -i content-length
```

**Solutions**:
- Compresser les images trop volumineuses
- Utiliser des services d'optimisation d'images (TinyPNG, ImageOptim)
- Redimensionner aux dimensions recommandées: 1200x630px

### 5. 🔒 Images en HTTP au lieu de HTTPS
**Problème**: WhatsApp bloque ou ne charge pas les images HTTP non sécurisées.

**Solutions**:
- ✅ **Déjà corrigé**: Le backend convertit automatiquement HTTP en HTTPS
- Vérifier que le serveur d'images supporte HTTPS
- Utiliser uniquement des URLs HTTPS pour les nouvelles images

### 6. 🎨 Format d'image non supporté
**Problème**: Certains formats d'image peuvent ne pas être supportés.

**Formats recommandés**:
- ✅ JPEG/JPG
- ✅ PNG
- ✅ WebP
- ⚠️ GIF (parfois problématique)
- ❌ SVG (non supporté pour les previews)

### 7. 📝 Métadonnées Open Graph mal formatées
**Problème**: Les tags Open Graph sont incorrects ou incomplets.

**Vérification**:
```bash
# Voir les métadonnées générées pour un produit
curl https://www.nengoo.com/api/og/product/prod_12345678
```

**Solutions**:
- ✅ **Déjà corrigé**: Validation améliorée des URLs d'images
- Les métadonnées incluent maintenant:
  - `og:image`
  - `og:image:secure_url`
  - `og:image:type`
  - `og:image:width` et `og:image:height`
  - `og:image:alt`

## Améliorations apportées

### 1. Validation renforcée des images
**Avant**:
```python
if images and len(images) > 0 and images[0]:
```

**Après**:
```python
if images and len(images) > 0 and images[0] and isinstance(images[0], str) and images[0].strip():
    image_url = images[0].strip()
```

Cette validation vérifie maintenant:
- ✅ Que le tableau `images` existe
- ✅ Qu'il n'est pas vide
- ✅ Que le premier élément existe
- ✅ Que c'est une chaîne de caractères
- ✅ Que ce n'est pas une chaîne vide ou seulement des espaces

### 2. Fallback automatique
Si aucune image valide n'est trouvée, le système utilise automatiquement le logo Nengoo.

## Comment tester

### Test 1: Vérifier les métadonnées d'un produit
```bash
# Remplacer {product_id} par l'ID du produit
curl https://www.nengoo.com/api/og/debug/prod_12345678
```

### Test 2: Tester avec l'outil Facebook
1. Aller sur https://developers.facebook.com/tools/debug/
2. Entrer: `https://www.nengoo.com/product/[slug-ou-id-du-produit]`
3. Cliquer sur "Debug"
4. Vérifier que l'image s'affiche
5. Si nécessaire, cliquer sur "Scrape Again"

### Test 3: Tester sur WhatsApp
1. Partager le lien du produit dans un chat WhatsApp
2. Attendre quelques secondes pour le chargement du preview
3. Si l'image ne s'affiche pas:
   - Utiliser l'outil Facebook Debug (étape 2)
   - Attendre 5-10 minutes
   - Réessayer de partager le lien

## Checklist de diagnostic

Pour chaque produit problématique:

- [ ] L'URL de l'image est-elle valide et non vide?
- [ ] L'image est-elle accessible (test dans un navigateur)?
- [ ] L'image est-elle en HTTPS?
- [ ] L'image fait-elle moins de 8MB?
- [ ] Le format est-il supporté (JPG, PNG, WebP)?
- [ ] Les métadonnées Open Graph sont-elles correctes?
- [ ] Le cache WhatsApp a-t-il été rafraîchi?

## Support et documentation

- **Facebook Sharing Debugger**: https://developers.facebook.com/tools/debug/
- **Open Graph Protocol**: https://ogp.me/
- **WhatsApp Business API Docs**: https://developers.facebook.com/docs/whatsapp/

## Scripts utiles

### Vérifier tous les produits
```bash
cd backend
python check_product_images.py
```

### Vérifier un produit spécifique
```bash
# Via l'API
curl https://www.nengoo.com/api/og/debug/prod_12345678

# Voir les métadonnées complètes
curl https://www.nengoo.com/api/og/product/prod_12345678
```

## Notes importantes

1. **Cache persistant**: Le cache WhatsApp peut prendre plusieurs heures voire jours à se rafraîchir naturellement
2. **Force refresh**: Utilisez toujours l'outil Facebook Debug pour forcer le rafraîchissement
3. **Production vs Dev**: Testez toujours avec les URLs de production car WhatsApp ne peut pas accéder aux URLs localhost
4. **Validation côté client**: Assurez-vous que l'interface admin valide les URLs d'images avant de les sauvegarder
