# Configuration CORS pour AWS S3

## Problème

L'upload direct vers S3 échoue avec l'erreur CORS :
```
Access to fetch at 'https://nengoo-bucket.s3.amazonaws.com/...' from origin 'http://localhost:3000'
has been blocked by CORS policy: No 'Access-Control-Allow-Origin' header is present
```

## Solution : Configurer CORS sur le bucket S3

### Étapes pour configurer CORS sur votre bucket AWS S3 :

1. **Connectez-vous à AWS Console**
   - Allez sur https://console.aws.amazon.com/s3/

2. **Sélectionnez votre bucket**
   - Cliquez sur `nengoo-bucket` (ou votre nom de bucket)

3. **Accédez aux permissions**
   - Onglet **Permissions**
   - Descendez jusqu'à **Cross-origin resource sharing (CORS)**

4. **Cliquez sur "Edit"**

5. **Collez la configuration CORS suivante** :

```json
[
    {
        "AllowedHeaders": [
            "*"
        ],
        "AllowedMethods": [
            "GET",
            "PUT",
            "POST",
            "DELETE",
            "HEAD"
        ],
        "AllowedOrigins": [
            "http://localhost:3000",
            "http://localhost:3001",
            "http://127.0.0.1:3000",
            "https://votre-domaine.com"
        ],
        "ExposeHeaders": [
            "ETag",
            "x-amz-server-side-encryption",
            "x-amz-request-id",
            "x-amz-id-2"
        ],
        "MaxAgeSeconds": 3000
    }
]
```

6. **Sauvegardez** la configuration

### Notes importantes :

- **AllowedOrigins** : Ajoutez tous vos domaines (localhost pour dev, domaine prod)
- **AllowedMethods** : PUT est essentiel pour l'upload
- **AllowedHeaders** : Le `*` autorise tous les headers nécessaires

### Pour la production :

Remplacez les origines localhost par votre domaine de production :
```json
"AllowedOrigins": [
    "https://votre-domaine-production.com"
]
```

## Alternative : Méthode URL (Sans S3)

Si vous ne voulez pas configurer AWS S3 pour l'instant, utilisez la **méthode URL** dans le formulaire :

1. Dans le formulaire d'ajout de produit
2. Sélectionnez **"URL d'image"**
3. Entrez une URL d'image existante :
   - Unsplash : `https://images.unsplash.com/photo-xxxxx`
   - Autre service d'hébergement d'images
   - Votre propre CDN

Cette méthode fonctionne immédiatement sans configuration AWS.

## Vérification

Après avoir configuré CORS, testez en ajoutant un produit avec l'option "Upload fichier".
Si le problème persiste, vérifiez :
- Que les origines dans AllowedOrigins correspondent exactement à votre URL
- Que le bucket a les bonnes permissions publiques
- Les logs dans la console du navigateur
