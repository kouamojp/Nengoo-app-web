# Guide de Configuration AWS S3 pour Nengoo

Ce guide explique comment configurer Amazon S3 pour le stockage des images de produits.

## Pourquoi utiliser AWS S3 ?

- **Scalabilité**: Stockage illimité pour vos images
- **Performance**: CDN intégré avec CloudFront
- **Fiabilité**: Disponibilité de 99.99%
- **Coût**: Vous ne payez que ce que vous utilisez
- **Sécurité**: Gestion fine des permissions

## Étapes de Configuration

### 1. Créer un compte AWS

1. Allez sur [aws.amazon.com](https://aws.amazon.com)
2. Cliquez sur "Créer un compte AWS"
3. Suivez les instructions (vous aurez besoin d'une carte bancaire)

### 2. Créer un bucket S3

1. Connectez-vous à la [Console AWS](https://console.aws.amazon.com)
2. Recherchez "S3" dans la barre de recherche
3. Cliquez sur "Créer un compartiment" (Create bucket)
4. Configurez votre bucket :
   - **Nom du compartiment**: Choisissez un nom unique (ex: `nengoo-products-images`)
   - **Région AWS**: Choisissez une région proche de vos utilisateurs (ex: `us-east-1` pour USA)
   - **Paramètres de blocage des accès publics**:
     - Décochez **"Bloquer tout accès public"**
     - Acceptez l'avertissement (vos images doivent être publiques)
   - Laissez les autres paramètres par défaut
5. Cliquez sur "Créer un compartiment"

### 3. Configurer les permissions du bucket

1. Cliquez sur votre bucket dans la liste
2. Allez dans l'onglet **"Autorisations"** (Permissions)
3. Faites défiler jusqu'à **"Politique de compartiment"** (Bucket policy)
4. Cliquez sur "Modifier" et collez cette politique :

```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Sid": "PublicReadGetObject",
            "Effect": "Allow",
            "Principal": "*",
            "Action": "s3:GetObject",
            "Resource": "arn:aws:s3:::VOTRE-NOM-DE-BUCKET/*"
        }
    ]
}
```

⚠️ **Important**: Remplacez `VOTRE-NOM-DE-BUCKET` par le nom de votre bucket

5. Cliquez sur "Enregistrer les modifications"

### 4. Créer un utilisateur IAM

1. Dans la console AWS, recherchez "IAM"
2. Cliquez sur **"Utilisateurs"** dans le menu de gauche
3. Cliquez sur "Créer un utilisateur"
4. Configurez l'utilisateur :
   - **Nom d'utilisateur**: `nengoo-s3-uploader`
   - Cochez **"Accès par programmation"** (Programmatic access)
5. Cliquez sur "Suivant: Autorisations"
6. Cliquez sur **"Attacher directement les stratégies existantes"**
7. Recherchez et sélectionnez **"AmazonS3FullAccess"**
8. Cliquez sur "Suivant" jusqu'à "Créer un utilisateur"
9. **IMPORTANT**: Téléchargez ou copiez les credentials :
   - **Access key ID**
   - **Secret access key**

   ⚠️ Vous ne pourrez plus voir la clé secrète après cette étape!

### 5. Configurer votre application

1. Ouvrez le fichier `.env` dans le dossier `backend/`
2. Ajoutez ou modifiez ces lignes :

```env
AWS_ACCESS_KEY_ID=votre-access-key-id
AWS_SECRET_ACCESS_KEY=votre-secret-access-key
AWS_REGION=us-east-1
S3_BUCKET_NAME=nengoo-products-images
```

3. Remplacez les valeurs par celles obtenues précédemment
4. Redémarrez le serveur backend

### 6. Tester l'upload

1. Connectez-vous en tant que vendeur ou admin
2. Essayez d'ajouter un produit avec une image
3. L'image devrait être uploadée sur S3
4. L'URL retournée devrait ressembler à :
   ```
   https://nengoo-products-images.s3.us-east-1.amazonaws.com/products/xxxx-xxxx-xxxx.jpg
   ```

## Sécurité et Bonnes Pratiques

### Utilisez un utilisateur IAM avec permissions limitées

Au lieu de `AmazonS3FullAccess`, créez une politique personnalisée :

```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Action": [
                "s3:PutObject",
                "s3:GetObject",
                "s3:DeleteObject",
                "s3:ListBucket"
            ],
            "Resource": [
                "arn:aws:s3:::VOTRE-NOM-DE-BUCKET",
                "arn:aws:s3:::VOTRE-NOM-DE-BUCKET/*"
            ]
        }
    ]
}
```

### Configurez CORS (si nécessaire)

Si vous uploadez depuis le frontend, ajoutez cette configuration CORS au bucket :

```json
[
    {
        "AllowedHeaders": ["*"],
        "AllowedMethods": ["GET", "PUT", "POST", "DELETE"],
        "AllowedOrigins": ["http://localhost:3000", "https://votre-domaine.com"],
        "ExposeHeaders": []
    }
]
```

### Activez le versioning (optionnel)

Pour garder un historique des fichiers :
1. Allez dans l'onglet **"Propriétés"** de votre bucket
2. Activez le **"Contrôle de version"** (Versioning)

## Coûts estimés

AWS S3 est très économique :

- **Stockage**: ~$0.023 par GB/mois
- **Requêtes PUT**: $0.005 par 1000 requêtes
- **Requêtes GET**: $0.0004 par 1000 requêtes
- **Transfert de données sortant**: Premiers 100 GB gratuits/mois

Exemple : Pour 1000 images (totaling 10 GB), environ **$0.25/mois**.

## Dépannage

### Erreur : "Access Denied"
- Vérifiez que vos credentials AWS sont corrects dans `.env`
- Vérifiez que l'utilisateur IAM a les bonnes permissions
- Vérifiez que le bucket existe et que le nom est correct

### Erreur : "Bucket not found"
- Vérifiez le nom du bucket dans `.env`
- Vérifiez que la région est correcte

### Les images ne s'affichent pas
- Vérifiez que la politique du bucket autorise l'accès public
- Vérifiez que l'URL de l'image est correcte

### Erreur : "Credentials not found"
- Vérifiez que le fichier `.env` est au bon endroit
- Vérifiez que les variables sont bien nommées (pas d'espaces)
- Redémarrez le serveur backend

## Alternative : Utiliser CloudFront (CDN)

Pour améliorer les performances, vous pouvez configurer CloudFront :

1. Créez une distribution CloudFront
2. Configurez le bucket S3 comme origine
3. Utilisez l'URL CloudFront au lieu de l'URL S3

## Support

Pour plus d'informations :
- [Documentation AWS S3](https://docs.aws.amazon.com/s3/)
- [Documentation boto3](https://boto3.amazonaws.com/v1/documentation/api/latest/index.html)
