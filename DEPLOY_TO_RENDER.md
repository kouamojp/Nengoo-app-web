# Déployer les corrections sur Render

## Problème actuel
Le backend sur Render n'a pas les modifications pour accepter le Bearer token.
L'app Flutter reçoit donc "User ID required" même si le token est bien envoyé.

## Solution: Déployer sur Render

### Étape 1: Vérifier les modifications Git

Les fichiers modifiés:
```bash
git status
```

Devrait montrer:
```
modified:   backend/server.py
modified:   nengoo-front/lib/components/product_card.dart
modified:   nengoo-front/lib/screens/details/view/components/product_images.dart
modified:   nengoo-front/lib/screens/details/bloc/details_bloc.dart
modified:   nengoo-front/lib/repositories/interaction_repository.dart
modified:   nengoo-front/lib/models/user_product_interaction_data.dart
modified:   nengoo-front/lib/dtos/response/post_product_interaction_response_dto.dart
modified:   nengoo-front/lib/screens/favourite/bloc/favourite_bloc.dart
```

### Étape 2: Commiter les changements

```bash
git add backend/server.py
git add nengoo-front/lib/models/user_product_interaction_data.dart
git add nengoo-front/lib/dtos/response/post_product_interaction_response_dto.dart
git add nengoo-front/lib/screens/favourite/bloc/favourite_bloc.dart

git commit -m "Fix: Support Bearer token authentication for favorites

- Add get_user_id_from_request() to extract user ID from Bearer token
- Update interaction endpoints to use new auth function
- Fix favorites pagination logic
- Fix MongoDB _id serialization in user interactions
- Add comprehensive logging for debugging

Fixes #<issue-number> - Session expired error when adding favorites"
```

### Étape 3: Pousser sur GitHub

```bash
git push origin main
```

### Étape 4: Render déploie automatiquement

Render détectera le nouveau commit et déploiera automatiquement.

**Vérifiez le déploiement:**
1. Allez sur https://dashboard.render.com
2. Sélectionnez `nengoo-app-web`
3. Cliquez sur l'onglet "Events"
4. Attendez que le status soit "Live" (généralement 2-5 minutes)

### Étape 5: Tester en production

Une fois déployé, testez avec curl:

```bash
curl -X POST "https://nengoo-app-web.onrender.com/api/interaction/prod_b785a656" \
  -H "Authorization: Bearer buyer_test_123" \
  -H "Content-Type: application/json" \
  -d '{
    "isFavourite": true,
    "rating": 5,
    "interaction": "VIEW"
  }'
```

**Résultat attendu:**
```json
{
  "status": "OK",
  "statusCode": 200,
  "data": {
    "isFavourite": true,
    ...
  }
}
```

### Étape 6: Remettre l'URL de production dans Flutter

Une fois que le backend est déployé, remettez l'URL de production dans `url.dart`:

```dart
if (Platform.isAndroid) {
  return "https://nengoo-app-web.onrender.com";
}

if (Platform.isIOS) {
  return "https://nengoo-app-web.onrender.com";
}
```

## Alternative: Test en local d'abord

**Avant de déployer**, vous pouvez tester en local:

### 1. Démarrer le backend local
```bash
cd backend
python server.py
```

Le serveur devrait démarrer sur `http://localhost:8001`

### 2. L'app Flutter est déjà configurée pour local

Le fichier `url.dart` a été modifié pour pointer vers:
- `http://10.0.2.2:8001` pour émulateur Android
- `http://localhost:8001` pour simulateur iOS

### 3. Tester l'app

```bash
cd nengoo-front
flutter run
```

Cliquez sur le bouton ❤️ - ça devrait **fonctionner** maintenant !

### 4. Vérifier les logs

Vous devriez voir:
```
InteractionRepository.postProductInteraction:
  Product ID: prod_xxx
  Auth token: buyer_73b41c54
  Token length: 14
  URL: http://10.0.2.2:8001/api/interaction/prod_xxx  ← LOCAL!
  Body: {isFavourite: true, rating: 0, interaction: VIEW}

  ✓ Success response received  ← SUCCÈS!
```

## Checklist de déploiement

- [ ] Backend local testé et fonctionne
- [ ] Modifications commitées dans Git
- [ ] Poussé sur GitHub (`git push`)
- [ ] Déploiement Render terminé (status "Live")
- [ ] Testé en production avec curl
- [ ] URL de production remise dans Flutter
- [ ] App testée avec backend de production
- [ ] Favoris fonctionnent ✓

## En cas de problème après déploiement

### Backend ne démarre pas sur Render

Vérifiez les logs dans Render:
1. Dashboard Render > nengoo-app-web
2. Onglet "Logs"
3. Cherchez les erreurs au démarrage

**Erreurs communes:**
- Import manquant
- Syntax error Python
- Variable d'environnement manquante

### Backend démarre mais 401 persiste

1. Vérifiez que le code déployé contient bien `get_user_id_from_request()`
2. Vérifiez les logs Render pour voir les requêtes
3. Testez avec curl directement sur Render

### Ancien code toujours actif

Parfois Render garde le cache. Force un redéploiement:
1. Dashboard Render > nengoo-app-web
2. Bouton "Manual Deploy" > "Deploy latest commit"

## Temps estimés

- **Commit + Push:** 1 minute
- **Déploiement Render:** 2-5 minutes
- **Test:** 2 minutes
- **Total:** ~10 minutes

## Support

Si le problème persiste après déploiement:
1. Partagez les logs Render
2. Partagez le résultat du test curl
3. Partagez les logs Flutter de l'app
