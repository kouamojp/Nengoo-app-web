# 📱 Guide de Publication sur les Stores - Nengoo

## 🎯 Vue d'ensemble

Ce guide détaille les étapes pour publier Nengoo sur:
- 🤖 **Google Play Store** (Android)
- 🍎 **Apple App Store** (iOS)

---

## 📋 Informations de l'Application

### Identité
- **Nom**: Nengoo
- **Package ID**: `com.nengoo.cameroon`
- **Version**: 1.0.0
- **Bundle ID (iOS)**: `com.nengoo.cameroon`

### Description Courte (80 caractères max)
**FR**: Marketplace camerounaise - Achetez et vendez en toute confiance
**EN**: Cameroonian marketplace - Buy and sell with confidence

### Description Longue

#### Français:
```
Nengoo est votre marketplace camerounaise de confiance pour acheter et vendre des produits locaux et internationaux.

🛍️ FONCTIONNALITÉS:
• Plus de 400 produits dans 12 catégories
• Paiement sécurisé (MTN Money, Orange Money, Carte)
• Livraison à domicile ou points de retrait
• Contact direct WhatsApp avec les vendeurs
• Interface bilingue (Français/Anglais)
• Application rapide et légère

📦 CATÉGORIES:
Vêtements, Électronique, Artisanat, Beauté, Alimentation, Sports, Jouets, Maison, et plus encore.

💳 PAIEMENT FACILE:
Payez avec MTN Mobile Money, Orange Money, carte bancaire ou à la livraison.

🚚 LIVRAISON FLEXIBLE:
Choisissez la livraison à domicile ou retirez dans un de nos points de retrait dans les grandes villes du Cameroun.

🇨🇲 100% CAMEROUNAIS:
Soutenez l'économie locale en achetant auprès de vendeurs camerounais.

Téléchargez Nengoo maintenant et découvrez une nouvelle façon de faire vos achats au Cameroun!
```

#### English:
```
Nengoo is your trusted Cameroonian marketplace to buy and sell local and international products.

🛍️ FEATURES:
• Over 400 products across 12 categories
• Secure payment (MTN Money, Orange Money, Card)
• Home delivery or pickup points
• Direct WhatsApp contact with sellers
• Bilingual interface (French/English)
• Fast and lightweight app

📦 CATEGORIES:
Clothing, Electronics, Handicrafts, Beauty, Food, Sports, Toys, Home, and more.

💳 EASY PAYMENT:
Pay with MTN Mobile Money, Orange Money, bank card, or cash on delivery.

🚚 FLEXIBLE DELIVERY:
Choose home delivery or pickup at one of our points in major Cameroonian cities.

🇨🇲 100% CAMEROONIAN:
Support the local economy by buying from Cameroonian sellers.

Download Nengoo now and discover a new way to shop in Cameroon!
```

### Mots-clés
```
marketplace, cameroun, shopping, e-commerce, achats, vente, mtn money, orange money, douala, yaoundé, livraison, products, boutique
```

### Catégorie
- **Google Play**: Shopping
- **App Store**: Shopping

### Classification de Contenu
- **Rating**: 3+ / PEGI 3 / Tous publics
- Pas de contenu violent, adulte ou dangereux

---

## 🤖 Google Play Store

### 1. Prérequis

#### Compte Google Play Developer
- Coût: $25 (one-time payment)
- URL: https://play.google.com/console/signup

#### Fichiers Requis
- ✅ AAB signé (Android App Bundle)
- ✅ Icône 512x512px
- ✅ Feature Graphic 1024x500px
- ✅ Captures d'écran (min 2, max 8)

### 2. Captures d'écran Requises

#### Téléphone (Obligatoire)
- **Résolution**: 1080x1920px minimum (16:9)
- **Nombre**: 2-8 screenshots
- **Format**: PNG ou JPEG

#### Tablette 7" (Optionnel)
- **Résolution**: 600x1024px minimum
- **Nombre**: 1-8 screenshots

#### Tablette 10" (Optionnel)
- **Résolution**: 1200x1920px minimum
- **Nombre**: 1-8 screenshots

### 3. Graphiques Requis

#### Icône de l'application
- **Taille**: 512x512px
- **Format**: PNG (32-bit)
- **Pas de transparence**
- **Coins**: Pas arrondis (Google le fait)

#### Feature Graphic
- **Taille**: 1024x500px
- **Format**: PNG ou JPEG
- **Contenu**: Logo + Texte "Nengoo - Marketplace Camerounaise"

### 4. Processus de Publication

```bash
# 1. Build AAB
cd /app/frontend
yarn build:pwa
npx cap sync android
npx cap open android

# Dans Android Studio:
# Build → Generate Signed Bundle / APK → Android App Bundle
# Release → Sign with keystore → Build
```

#### Étapes dans Play Console:

1. **Créer l'application**
   - Nom: Nengoo
   - Langue par défaut: Français
   - Type: Application
   - Gratuite

2. **Fiche de l'application**
   - Description courte et longue
   - Icône 512x512px
   - Feature graphic 1024x500px
   - Captures d'écran

3. **Classification du contenu**
   - Répondre au questionnaire
   - Rating: Tous publics

4. **Tarification et distribution**
   - Gratuit
   - Pays: Cameroun (+ autres si souhaité)

5. **Version de production**
   - Upload AAB
   - Notes de version
   - Déployer en production

6. **Review**
   - Délai: 1-7 jours généralement
   - Répondre rapidement si demande de clarification

### 5. Informations Techniques

```json
{
  "packageName": "com.nengoo.cameroon",
  "versionCode": 1,
  "versionName": "1.0.0",
  "minSdkVersion": 24,
  "targetSdkVersion": 34,
  "permissions": [
    "INTERNET",
    "ACCESS_NETWORK_STATE",
    "CAMERA",
    "READ_EXTERNAL_STORAGE",
    "WRITE_EXTERNAL_STORAGE"
  ]
}
```

---

## 🍎 Apple App Store

### 1. Prérequis

#### Compte Apple Developer
- Coût: $99/an
- URL: https://developer.apple.com/programs/

#### Fichiers Requis
- ✅ IPA signé (Archive Xcode)
- ✅ Icône 1024x1024px
- ✅ Captures d'écran iPhone & iPad

### 2. Captures d'écran Requises

#### iPhone 6.7" (Obligatoire)
- **Résolution**: 1290x2796px
- **Appareils**: iPhone 14 Pro Max, 15 Pro Max
- **Nombre**: 3-10 screenshots

#### iPhone 5.5" (Optionnel mais recommandé)
- **Résolution**: 1242x2208px
- **Appareils**: iPhone 8 Plus
- **Nombre**: 1-10 screenshots

#### iPad Pro 12.9" (Si support iPad)
- **Résolution**: 2048x2732px
- **Nombre**: 1-10 screenshots

#### iPad Pro 11" (Si support iPad)
- **Résolution**: 1668x2388px
- **Nombre**: 1-10 screenshots

### 3. Graphiques Requis

#### Icône de l'application
- **Taille**: 1024x1024px
- **Format**: PNG (pas de transparence)
- **Pas de coins arrondis** (iOS le fait)
- **Pas de texte alpha**

### 4. Processus de Publication

```bash
# 1. Build Archive
cd /app/frontend
yarn build:pwa
npx cap sync ios
npx cap open ios

# Dans Xcode:
# 1. Sélectionner "Any iOS Device"
# 2. Product → Archive
# 3. Window → Organizer
# 4. Distribute App → App Store Connect
```

#### Étapes dans App Store Connect:

1. **Créer l'app**
   - URL: https://appstoreconnect.apple.com
   - My Apps → + → New App
   - Name: Nengoo
   - Bundle ID: com.nengoo.cameroon
   - SKU: nengoo-001

2. **Informations de l'app**
   - Nom: Nengoo
   - Sous-titre: Marketplace Camerounaise
   - Description (4000 caractères max)
   - Mots-clés (100 caractères max)
   - URL support: https://nengoo.com/support
   - URL marketing: https://nengoo.com

3. **Tarification**
   - Prix: Gratuit
   - Disponibilité: Cameroun (+ autres pays)

4. **Préparation de l'envoi**
   - Captures d'écran pour toutes les tailles
   - Icône 1024x1024px
   - Rating: 4+
   - Copyright: © 2025 Nengoo

5. **Build**
   - Upload via Xcode ou Transporter
   - Sélectionner le build
   - Conformité exportation

6. **Informations de review**
   - Coordonnées de contact
   - Notes pour l'équipe de review
   - Compte de test si nécessaire

7. **Soumettre pour review**
   - Vérifier toutes les informations
   - Submit for Review
   - Délai: 24-48h généralement

### 5. Informations Techniques

```json
{
  "bundleIdentifier": "com.nengoo.cameroon",
  "version": "1.0.0",
  "buildNumber": "1",
  "minimumOSVersion": "13.0",
  "deviceFamilies": ["iPhone", "iPad"],
  "orientations": ["portrait"],
  "permissions": {
    "NSCameraUsageDescription": "Pour prendre des photos de produits",
    "NSPhotoLibraryUsageDescription": "Pour sélectionner des photos",
    "NSLocationWhenInUseUsageDescription": "Pour trouver les points de retrait près de vous"
  }
}
```

---

## 📸 Guide de Capture d'Écran

### Écrans à Capturer (dans l'ordre):

1. **Homepage** - Écran d'accueil avec produits
2. **Catalog** - Liste de produits d'une catégorie
3. **Product Detail** - Page détail d'un produit
4. **Cart** - Panier avec articles
5. **Profile** - Page profil utilisateur
6. **Checkout** - Formulaire de commande (optionnel)

### Conseils:
- ✅ Utiliser des données réelles (pas de lorem ipsum)
- ✅ Afficher l'app en mode clair
- ✅ Remplir complètement les écrans
- ✅ Montrer les fonctionnalités principales
- ✅ Ajouter du texte descriptif sur les screenshots (optionnel)

### Outils:
- **Figma**: Pour créer des mockups
- **Canva**: Pour ajouter du texte
- **Screenshot Framer**: Pour ajouter des cadres de téléphone

---

## 📝 Notes de Version

### Version 1.0.0 (Première publication)

**Français:**
```
🎉 Bienvenue sur Nengoo!

Première version de votre marketplace camerounaise préférée.

✨ Nouveautés:
• Catalogue de plus de 400 produits
• 12 catégories de produits
• Paiement mobile (MTN Money, Orange Money)
• Livraison à domicile et points de retrait
• Contact WhatsApp direct avec les vendeurs
• Interface bilingue français/anglais
• Mode hors ligne

Téléchargez maintenant et commencez vos achats!
```

**English:**
```
🎉 Welcome to Nengoo!

First version of your favorite Cameroonian marketplace.

✨ What's New:
• Catalog of over 400 products
• 12 product categories
• Mobile payment (MTN Money, Orange Money)
• Home delivery and pickup points
• Direct WhatsApp contact with sellers
• Bilingual French/English interface
• Offline mode

Download now and start shopping!
```

---

## ⚠️ Checklist de Publication

### Avant de Soumettre:

#### Général
- [ ] App testée sur plusieurs appareils
- [ ] Toutes les fonctionnalités marchent
- [ ] Pas de bugs critiques
- [ ] Performance optimale (< 3s de chargement)
- [ ] Textes sans fautes d'orthographe

#### Graphiques
- [ ] Icône 512x512 (Play) ou 1024x1024 (App Store)
- [ ] Feature graphic 1024x500 (Play)
- [ ] Captures d'écran toutes les tailles requises
- [ ] Toutes les images en haute résolution

#### Légal
- [ ] Politique de confidentialité disponible en ligne
- [ ] Conditions d'utilisation
- [ ] URL de support fonctionnelle
- [ ] Copyright © 2025 Nengoo

#### Technique
- [ ] Version code/number incrémenté
- [ ] Keystore/Certificate sauvegardé
- [ ] Build signé avec certificat de production
- [ ] Permissions justifiées

---

## 🚨 Problèmes Courants

### Google Play

**Rejet: "Contenu trompeur"**
- Solution: S'assurer que les screenshots reflètent l'app réelle

**Rejet: "Permissions non justifiées"**
- Solution: Supprimer permissions non utilisées

**Rejet: "Politique de confidentialité manquante"**
- Solution: Ajouter URL de privacy policy valide

### Apple App Store

**Rejet: "App ne fonctionne pas"**
- Solution: Fournir compte de test avec toutes les features accessibles

**Rejet: "Interface ressemble trop au web"**
- Solution: Améliorer les transitions et animations natives

**Rejet: "Liens externes vers site web"**
- Solution: Toutes les fonctionnalités doivent être dans l'app

---

## 📊 Après Publication

### Suivi
- Monitor ratings & reviews quotidiennement
- Répondre aux commentaires rapidement
- Analyser les crashs (Firebase Crashlytics)
- Suivre les téléchargements

### Mises à Jour
- Correction bugs: Version 1.0.1
- Nouvelles fonctionnalités: Version 1.1.0
- Changements majeurs: Version 2.0.0

### Marketing
- Promouvoir sur réseaux sociaux
- Créer page Facebook/Instagram
- Faire des publicités ciblées
- Contacter influenceurs camerounais

---

## 📞 Ressources

### Google Play
- Console: https://play.google.com/console
- Docs: https://developer.android.com/distribute
- Support: https://support.google.com/googleplay/android-developer

### Apple App Store
- Connect: https://appstoreconnect.apple.com
- Docs: https://developer.apple.com/app-store
- Guidelines: https://developer.apple.com/app-store/review/guidelines

---

## 🎉 Résumé

**Timeline estimé:**
- Google Play: 1-7 jours
- Apple App Store: 1-3 jours

**Coûts:**
- Google Play: $25 (one-time)
- Apple Developer: $99/an

**Prochaines étapes:**
1. Créer comptes developer
2. Préparer tous les assets
3. Build et signer les apps
4. Soumettre pour review
5. Répondre aux questions
6. Publication! 🎉

**Bonne chance avec la publication de Nengoo!** 🚀
