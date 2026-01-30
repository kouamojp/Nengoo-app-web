# 📱 Lien produit dans les messages WhatsApp

## 🎯 Fonctionnalité

Lorsqu'un utilisateur clique sur le bouton **"Commandez"** dans la fiche produit ou sur une carte produit, il est redirigé vers WhatsApp avec un message pré-rempli contenant :

1. ✅ Le nom du produit
2. ✅ La catégorie
3. ✅ **Le lien cliquable vers le produit** 🔗
4. ✅ L'image du produit 📷

## 📋 Implémentation

### 1. URL du produit

**Fichier** : `lib/helper/url.dart`

```dart
// Generate shareable product URL for WhatsApp
static String getProductUrl(String productId) {
  return "$baseUrl/product/$productId";
}
```

**Format de l'URL** :
```
https://nengoo-app-web.onrender.com/product/{productId}
```

### 2. Messages de localisation

**Fichier** : `lib/l10n/app_fr.arb`

```json
"whatsappMessageWithCategory": "Je suis intéressé par : {productName} \n\n Sous Catégorie : {categoryName} \n\n 🔗 Lien du produit : {productUrl} \n\n 📷 Image : {imageUrl}"
```

**Fichier** : `lib/l10n/app_en.arb`

```json
"whatsappMessageWithCategory": "I am interested in : {productName} \n Sub Category : {categoryName} \n\n 🔗 Product link : {productUrl} \n\n 📷 Image : {imageUrl}"
```

### 3. Utilisation dans ProductCard

**Fichier** : `lib/components/product_card.dart`

```dart
final phoneNumber = product.vendor.whatsappNumber.replaceAll('+', '');
final validImageUrl = ImageHelper.getFirstValidImage(product.images) ?? '';
final productUrl = URL.getProductUrl(product.id);

final message = AppLocalizations.of(context)!.whatsappMessageWithCategory(
  product.category.name,
  validImageUrl,
  product.name,
  productUrl
);

final url = Uri.parse(
  "whatsapp://send?phone=$phoneNumber&text=${Uri.encodeComponent(message)}"
);
```

### 4. Utilisation dans ProductDetails

**Fichier** : `lib/screens/details/view/components/body.dart`

Même logique que ProductCard avec le bouton "Commandez".

## 📱 Exemple de message WhatsApp

Le message **s'adapte à la langue de l'application**. Si l'app est en français, le message est en français. Si l'app est en anglais, le message est en anglais.

### En français

```
Je suis intéressé par : iPhone 14 Pro Max

Sous Catégorie : Smartphones

🔗 Lien du produit : https://nengoo-app-web.onrender.com/product/abc123

📷 Image : https://nengoo-bucket.s3.amazonaws.com/uploads/xyz.jpg
```

### En anglais

```
I am interested in : iPhone 14 Pro Max

Sub Category : Smartphones

🔗 Product link : https://nengoo-app-web.onrender.com/product/abc123

📷 Image : https://nengoo-bucket.s3.amazonaws.com/uploads/xyz.jpg
```

## 🔗 Où le lien mène-t-il ?

Le lien pointe vers le **frontend React** hébergé sur :
```
https://nengoo-app-web.onrender.com
```

Route utilisée :
```
/product/:idOrSlug
```

Définie dans `frontend/src/App.js` :
```javascript
<Route path="/product/:idOrSlug" element={<ProductDetail {...appProps} />} />
```

## ✨ Avantages

### 1. Partage facile
- L'utilisateur peut copier le lien et le partager avec d'autres
- Le lien reste valide et permanent

### 2. Traçabilité
- Possibilité de tracker les clics sur les liens produits
- Analyse de la source du trafic (WhatsApp)

### 3. Conversion
- Le destinataire peut voir le produit directement sur le site web
- Interface complète avec tous les détails et autres produits similaires

### 4. Expérience utilisateur
- Message professionnel avec émojis
- Toutes les informations nécessaires en un message
- Lien cliquable pour accès direct

## 🧪 Test

### 1. Tester depuis l'application mobile

1. Ouvrir l'app Nengoo
2. Naviguer vers un produit
3. Cliquer sur **"Commandez"**
4. Vérifier que WhatsApp s'ouvre avec le message pré-rempli
5. Vérifier que le lien est présent dans le message
6. Envoyer le message à un contact ou à soi-même
7. Cliquer sur le lien dans WhatsApp
8. Vérifier que le navigateur s'ouvre sur la page du produit

### 2. Tester depuis le web

1. Ouvrir https://nengoo-app-web.onrender.com dans Chrome
2. Cliquer sur un produit
3. Cliquer sur **"Commandez"**
4. Vérifier que WhatsApp Web s'ouvre avec le message
5. Vérifier le lien dans le message

### 3. Vérifier la page de destination

1. Copier le lien du produit depuis le message WhatsApp
2. Ouvrir le lien dans un navigateur
3. Vérifier que la page du produit s'affiche correctement
4. Vérifier que toutes les informations sont présentes :
   - Images
   - Nom
   - Prix
   - Description
   - Bouton d'achat

## 🔧 Configuration

### Changer l'URL de base

Si vous changez le domaine de production, modifiez `lib/helper/url.dart` :

```dart
static String get baseUrl {
  if (kIsWeb) {
    return "https://votre-nouveau-domaine.com";
  }
  // ...
}
```

### Personnaliser le message

Le message utilise le système de localisation. Pour le personnaliser, modifiez les fichiers de localisation :

**`lib/l10n/app_fr.arb`** :
```json
"whatsappMessageWithCategory": "Votre message personnalisé : {productName} \n\n Catégorie : {categoryName} \n\n 🔗 Lien : {productUrl} \n\n 📷 Image : {imageUrl}"
```

**`lib/l10n/app_en.arb`** :
```json
"whatsappMessageWithCategory": "Your custom message : {productName} \n\n Category : {categoryName} \n\n 🔗 Link : {productUrl} \n\n 📷 Image : {imageUrl}"
```

Puis régénérez les localisations :
```bash
cd nengoo-front
flutter gen-l10n
```

### Ajouter des paramètres UTM

Pour tracker les clics depuis WhatsApp, modifiez `URL.getProductUrl()` :

```dart
static String getProductUrl(String productId) {
  return "$baseUrl/product/$productId?utm_source=whatsapp&utm_medium=share&utm_campaign=product_share";
}
```

## 📊 Analytics

Pour suivre les conversions depuis WhatsApp, ajoutez dans le frontend React :

```javascript
// Dans ProductDetail.js
useEffect(() => {
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.get('utm_source') === 'whatsapp') {
    // Track WhatsApp referral
    analytics.track('Product Viewed from WhatsApp', {
      product_id: productId,
      utm_source: 'whatsapp'
    });
  }
}, []);
```

## ⚠️ Limitations

### 1. Longueur du message
WhatsApp limite la longueur des URLs dans les messages. Si le message est trop long, certaines parties peuvent être tronquées.

**Solution** : Utiliser un raccourcisseur d'URL (bit.ly, tinyurl) :

```dart
// Exemple avec un service de raccourcissement
static Future<String> getShortenedProductUrl(String productId) async {
  final longUrl = "$baseUrl/product/$productId";
  final shortUrl = await UrlShortenerService.shorten(longUrl);
  return shortUrl;
}
```

### 2. Liens bloqués
Certains antivirus ou filtres WhatsApp peuvent bloquer les liens inconnus.

**Solution** :
- Vérifier que le domaine est bien configuré (HTTPS, certificat valide)
- Demander aux utilisateurs d'ajouter le domaine à leur liste de confiance

### 3. Deep linking mobile
Le lien ouvre le navigateur au lieu de l'app mobile.

**Solution** : Implémenter des deep links avec Firebase Dynamic Links ou Branch.io :

```dart
static String getProductUrl(String productId) {
  return "https://nengoo.page.link/?link=$baseUrl/product/$productId&apn=com.nengoo.app";
}
```

## 🚀 Améliorations futures

### 1. QR Code
Générer un QR code pour chaque produit :

```dart
import 'package:qr_flutter/qr_flutter.dart';

QrImageView(
  data: URL.getProductUrl(product.id),
  version: QrVersions.auto,
  size: 200.0,
)
```

### 2. Partage natif
Utiliser le partage natif au lieu de WhatsApp uniquement :

```dart
import 'package:share_plus/share_plus.dart';

Share.share(
  'Regarde ce produit : ${product.name}\n${URL.getProductUrl(product.id)}',
  subject: product.name,
);
```

### 3. Images riches
Ajouter des meta tags Open Graph pour l'aperçu dans WhatsApp :

```html
<!-- Dans frontend/public/index.html -->
<meta property="og:title" content="${productName}" />
<meta property="og:description" content="${productDescription}" />
<meta property="og:image" content="${productImage}" />
<meta property="og:url" content="${productUrl}" />
```

## 📝 Checklist de déploiement

- [ ] Les fichiers de localisation sont à jour
- [ ] `flutter gen-l10n` a été exécuté
- [ ] L'URL de base pointe vers le bon domaine de production
- [ ] Les tests WhatsApp fonctionnent sur mobile
- [ ] Les tests WhatsApp fonctionnent sur web
- [ ] Le lien ouvre correctement la page produit
- [ ] Le message contient bien tous les éléments (nom, catégorie, lien, image)
- [ ] L'URL est correctement encodée (pas de caractères spéciaux cassés)

## 🔗 Ressources

- [WhatsApp Click to Chat](https://faq.whatsapp.com/5913398998672934)
- [URL Encoding](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/encodeURIComponent)
- [Flutter Localization](https://docs.flutter.dev/ui/accessibility-and-internationalization/internationalization)
- [Deep Linking Flutter](https://docs.flutter.dev/ui/navigation/deep-linking)

---

**Date de création** : 2026-01-30
**Dernière mise à jour** : 2026-01-30
**Status** : ✅ Implémenté et testé
