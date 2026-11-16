# Publier l'app Nengoo sur l'App Store depuis Windows

Une app iOS ne se compile et ne se signe que sur macOS, avec Xcode. Depuis Windows,
on passe par **Codemagic** : un Mac dans le cloud qui compile l'app, la signe et
l'envoie à Apple. Tout se fait dans le navigateur. Le fichier `codemagic.yaml`, à la
racine de `nengoo-front`, est déjà prêt :

| Workflow | Rôle | Compte Apple |
|---|---|---|
| `ios-check` | Vérifie que l'app compile pour iOS | Non |
| `ios-testflight` | Compile, signe et envoie l'app sur TestFlight | Oui |

```
Windows ──git push──▶ GitHub ──▶ Codemagic (Mac) ──▶ App Store Connect ──▶ TestFlight ──▶ App Store
```

Données du projet : identifiant `com.proditech.nengoo`, équipe Apple `67MA4QPW2M`,
iOS 15 minimum, nom affiché « Nengoo », version lue dans `pubspec.yaml`
(`version: 1.0.3+13` → version 1.0.3).

Compter 1 à 2 jours pour la mise en place, puis 24 à 48 h de revue par Apple.

---

## 0. À régler avant la première soumission

Ces trois points font refuser l'app ou bloquent l'envoi.

### a) L'achat de documents numériques par Mobile Money

Les règles d'Apple (guideline **3.1.1**) imposent l'achat intégré d'Apple (avec
30 % de commission, ou 15 % pour une petite entreprise) pour tout contenu numérique
vendu dans l'app. Les PDF de la boutique de documents en font partie. Un bouton
« Acheter » qui fait payer par Orange Money ou MTN MoMo **fera refuser l'app**, tout
comme un texte invitant à payer sur le site.

Les produits physiques payés hors de l'app, eux, sont autorisés (guideline 3.1.5) :
les commandes de la marketplace ne posent pas de problème.

**Fait** : sur iOS, l'app ne propose ni l'achat ni le prix des documents payants
(`documentSalesAllowed()` dans `lib/screens/documents/components/document_widgets.dart`).
L'app garde les documents gratuits et les documents offerts ; les documents déjà
achetés (sur le site ou sur Android) restent téléchargeables dans « Mes documents ».
Le paiement Mobile Money reste disponible sur Android et sur le site.

### b) iPad

L'app est déclarée pour iPhone **et** iPad (`TARGETED_DEVICE_FAMILY = "1,2"`). Apple
exige alors des captures d'écran iPad, et la revue teste l'app sur iPad. Deux choix :

- fournir des captures iPad 13 pouces (2064 × 2752) et vérifier l'affichage sur iPad ;
- ou **limiter l'app à l'iPhone** : remplacer `"1,2"` par `1` aux trois endroits de
  `ios/Runner.xcodeproj/project.pbxproj`. Elle reste installable sur iPad, en mode
  iPhone agrandi.

**Fait** : l'app est limitée à l'iPhone (`TARGETED_DEVICE_FAMILY = 1`). Pas de
captures iPad à fournir.

### c) Le numéro de version

Apple refuse un envoi qui reprend une version et un numéro de build déjà utilisés.
Avant chaque envoi, monter la version dans `pubspec.yaml` (ex. `1.0.4+14`) et pousser
sur GitHub. Codemagic remplace le numéro de build par son compteur (`$BUILD_NUMBER`),
qui augmente à chaque compilation.

---

## 1. Compte Apple Developer

1. S'inscrire sur https://developer.apple.com/programs/ avec l'identifiant Apple de
   l'entreprise : 99 USD par an. Pour une société, il faut un numéro **D-U-N-S**
   (gratuit, quelques jours à obtenir). L'équipe `67MA4QPW2M` qui figure dans le projet
   existe peut-être déjà : vérifier sur https://developer.apple.com/account
   (Membership details).
2. Sur https://developer.apple.com/account/resources/identifiers, vérifier que
   l'identifiant `com.proditech.nengoo` existe (type App IDs). Sinon, le créer :
   « + » → App IDs → App → description « Nengoo », Bundle ID explicite
   `com.proditech.nengoo`. Aucune option (« capability ») n'est nécessaire pour l'instant.

## 2. Créer l'app dans App Store Connect

https://appstoreconnect.apple.com → **Apps** → **+** → **Nouvelle app** :

| Champ | Valeur |
|---|---|
| Plateformes | iOS |
| Nom | Nengoo (30 caractères au plus, unique sur l'App Store ; si le nom est pris : « Nengoo Marketplace ») |
| Langue principale | Français |
| Identifiant de lot | `com.proditech.nengoo` |
| SKU | `nengoo-ios` (référence interne libre) |
| Accès utilisateur | Accès complet |

## 3. Clé API App Store Connect

Elle permet à Codemagic de signer l'app et de l'envoyer à Apple sans mot de passe.

1. App Store Connect → **Utilisateurs et accès** → **Intégrations** →
   **App Store Connect API** → **Clés d'équipe** → **+**.
2. Nom : `Codemagic`, accès : **App Manager**.
3. **Télécharger la clé** (fichier `AuthKey_XXXXXXXXXX.p8`). Elle ne se télécharge
   **qu'une fois** : la ranger en lieu sûr, jamais dans le dépôt Git.
4. Noter l'**Issuer ID** (en haut de la page) et le **Key ID** (ligne de la clé).

## 4. Configurer Codemagic

1. Créer un compte sur https://codemagic.io en se connectant avec GitHub.
2. **Add application** → GitHub → dépôt `proditech-douala/nengoo-front`. Si le dépôt
   n'apparaît pas, autoriser l'organisation `proditech-douala` dans les réglages de
   l'application Codemagic sur GitHub. Type de projet : Flutter App, configuration
   **codemagic.yaml**.
3. **Clé Apple** : Team settings → **Integrations** → **Developer Portal** →
   Connect. Le nom doit être exactement **`Nengoo App Store Connect`** (c'est celui que
   lit `codemagic.yaml`). Renseigner l'Issuer ID et le Key ID, puis joindre le `.p8`.
4. **Certificat de distribution** : Team settings → **codemagic.yaml settings** →
   **Code signing identities** → **iOS certificates** → **Generate certificate**
   (type Apple Distribution, avec la clé `Nengoo App Store Connect`). Télécharger et
   garder le `.p12` et son mot de passe : ils resservent si l'on change d'outil.
5. **Profil de provisionnement** : même page, **iOS provisioning profiles** →
   **Fetch profiles** : choisir le profil *App Store* de `com.proditech.nengoo`. S'il
   n'existe pas, le créer sur developer.apple.com → Profiles → « + » → App Store
   Connect → App ID `com.proditech.nengoo` → certificat créé à l'étape 4, puis refaire
   Fetch.

## 5. Vérifier que l'app compile

Codemagic → application `nengoo-front` → **Start new build** → branche `main` →
workflow **iOS - vérification sans signature** (`ios-check`).

Compter 10 à 20 minutes. En cas d'échec, ouvrir l'étape en rouge : la cause est
presque toujours une dépendance CocoaPods (voir § 11).

## 6. Envoyer sur TestFlight

1. Monter la version dans `pubspec.yaml` si elle a déjà été envoyée (§ 0 c), commiter,
   pousser.
2. **Start new build** → `main` → **iOS - TestFlight** (`ios-testflight`).
3. Codemagic compile, signe, puis envoie l'IPA. Le build apparaît dans App Store
   Connect → app → **TestFlight**. Apple le traite en 10 à 30 minutes ; un e-mail
   prévient quand il est prêt.

La question sur le chiffrement n'est pas posée : `Info.plist` déclare déjà
`ITSAppUsesNonExemptEncryption = false` (l'app n'utilise que le HTTPS standard).

## 7. Tester sur iPhone

1. TestFlight → **Tests internes** → créer un groupe « Équipe Nengoo » et y ajouter
   les membres de l'équipe (ils doivent avoir un accès à App Store Connect).
2. Sur l'iPhone : installer l'app **TestFlight** depuis l'App Store, accepter
   l'invitation reçue par e-mail, installer Nengoo.
3. Points à vérifier :
   - parcourir le catalogue sans compte, puis créer un compte et se connecter ;
   - photo d'un produit : appareil photo et galerie (autorisations demandées) ;
   - localisation : produits près de chez vous ;
   - panier, commande, suivi de commande, messagerie ;
   - documents : document gratuit, document offert, téléchargement (ouvert dans
     Safari) ;
   - espace vendeur : ajout d'un produit, rédaction de la fiche par l'IA ;
   - Profil → **Supprimer mon compte** : Apple exige que ce bouton fonctionne.

Les captures d'écran de la fiche App Store peuvent être faites à ce moment, sur
l'iPhone (voir § 8).

## 8. Remplir la fiche App Store

App Store Connect → app → **App Store** → version **1.0.3** (ou celle de
`pubspec.yaml`).

**Captures d'écran** : 3 à 10 en iPhone 6,9 pouces (1320 × 2868 ou 1290 × 2796 en
portrait). Une capture faite sur un iPhone 15 Pro Max ou plus récent a la bonne
taille ; sinon, la recadrer sur fond de couleur dans Canva ou Figma. L'app étant limitée
à l'iPhone (§ 0 b), aucune capture iPad n'est demandée.

**Textes** (en français, puis en anglais si l'app est publiée hors de la zone
francophone) :

| Champ | Limite | Suggestion |
|---|---|---|
| Sous-titre | 30 caractères | La marketplace du Cameroun |
| Texte promotionnel | 170 | Modifiable sans nouvelle revue |
| Description | 4000 | Ce que l'on trouve, comment on commande, livraison et retrait, vendeurs |
| Mots-clés | 100, séparés par des virgules | marketplace,cameroun,douala,yaoundé,achat,vente,boutique,livraison |
| URL d'assistance | — | https://www.nengoo.com/about |
| URL de confidentialité | — | https://www.nengoo.com/privacy-policy |

**Informations générales** de l'app :
- catégorie principale **Shopping**, secondaire **Lifestyle** ;
- **classification par âge** : répondre au questionnaire. La messagerie entre clients
  et vendeurs compte comme contenu généré par les utilisateurs ; le signalement de
  conversations existe déjà ;
- **prix et disponibilité** : gratuit, pays choisis (au moins le Cameroun).

**Confidentialité de l'app** (questionnaire obligatoire, à garder cohérent avec
`docs/POLITIQUE_CONFIDENTIALITE.md`) — données collectées, liées à l'identité, sans
suivi publicitaire :

| Catégorie Apple | Données Nengoo | Usage |
|---|---|---|
| Coordonnées | Nom, numéro de téléphone, e-mail, adresse de livraison | Fonctionnement de l'app |
| Localisation | Position approximative (point de retrait le plus proche) | Fonctionnement de l'app |
| Contenu utilisateur | Photos de produits, messages, demandes d'assistance | Fonctionnement de l'app |
| Achats | Historique des commandes | Fonctionnement de l'app |
| Identifiants | Identifiant de compte | Fonctionnement de l'app |

Les photos et les questions envoyées à l'assistant IA partent chez un fournisseur
d'IA (`docs/ASSISTANT_IA.md`) : le mentionner dans la politique de confidentialité.

## 9. Soumettre à la revue

1. Sur la page de la version, section **Build** → **+** → choisir le build TestFlight.
2. **Informations pour la revue** :
   - **compte de démonstration** : créer un compte client et un compte vendeur
     approuvé réservés à Apple (ne pas donner de vrais comptes), avec quelques
     produits ;
   - **notes**, par exemple :
     > Nengoo est une marketplace de produits physiques au Cameroun. Les commandes sont
     > réglées à la livraison ou par Mobile Money auprès du vendeur, hors de l'app
     > (biens physiques, guideline 3.1.5). Suppression du compte : Profil > Supprimer
     > mon compte. Compte vendeur : Profil > Ma boutique.
3. **Publication** : manuelle (recommandé la première fois) ou automatique après
   validation.
4. **Ajouter pour vérification** → **Soumettre**.

Réponse sous 24 à 48 h en général. En cas de refus, Apple cite la règle en cause dans
le **Centre de résolution** : corriger, renvoyer un build si nécessaire et répondre
dans le même fil.

## 10. Mises à jour suivantes

1. Monter `version` dans `pubspec.yaml` (ex. `1.0.4+14`), commiter, pousser.
2. Codemagic → **iOS - TestFlight**.
3. Vérifier le build sur TestFlight.
4. App Store Connect → **+ Version** → numéro identique à `pubspec.yaml` → texte
   « Nouveautés » → choisir le build → soumettre.

## 11. Problèmes fréquents

| Symptôme | Cause et solution |
|---|---|
| `No matching profiles found` / `No signing certificate` | Profil ou certificat absent dans Codemagic (§ 4, étapes 4 et 5), ou profil d'un autre type que *App Store*. |
| `Integration "Nengoo App Store Connect" not found` | Le nom de l'intégration dans Codemagic diffère de `codemagic.yaml`. |
| Erreur `pod install` / `CocoaPods could not find compatible versions` | Lancer le build avec « Clean cache » (Codemagic → Start new build), ou supprimer `ios/Podfile.lock`, pousser et relancer. |
| `The bundle version must be higher than the previously uploaded version` | Version déjà envoyée : monter `version` dans `pubspec.yaml` (§ 0 c). |
| `Missing purpose string in Info.plist` (e-mail d'Apple) | Un plugin demande une autorisation non décrite. Ajouter la clé `NS…UsageDescription` indiquée dans `ios/Runner/Info.plist`. Appareil photo, galerie et localisation sont déjà décrits. |
| Refus 3.1.1 | Achat de contenu numérique hors achat intégré (§ 0 a). |
| Refus 2.1 (informations manquantes) | Compte de démonstration absent ou sans données : le compléter dans les informations pour la revue. |
| Refus 4.0 / 4.2 (design, fonctionnalités) | Expliquer dans les notes ce que l'app fait de plus que le site (photos, assistant, position, notifications). |

## 12. Plus tard : notifications push sur iOS

Elles sont désactivées sur iOS pour l'instant : l'app ne contient pas encore la
configuration Firebase, et `PushNotifications.init` se contente alors de les ignorer.
L'app fonctionne normalement sans elles. Pour les activer :

1. Firebase → projet Nengoo → ajouter une app iOS `com.proditech.nengoo`.
2. Depuis Windows, générer `lib/firebase_options.dart` avec la FlutterFire CLI
   (`dart pub global activate flutterfire_cli`, puis `flutterfire configure`) et passer
   `options: DefaultFirebaseOptions.currentPlatform` à `Firebase.initializeApp`. Cela
   évite d'ajouter `GoogleService-Info.plist` au projet Xcode, ce qui demande un Mac.
3. developer.apple.com → Keys → « + » → **Apple Push Notifications service (APNs)** →
   télécharger la clé `.p8`, puis l'ajouter dans Firebase → Paramètres du projet →
   Cloud Messaging → app iOS.
4. Activer la capacité **Push Notifications** sur l'App ID, ajouter un fichier
   `ios/Runner/Runner.entitlements` (`aps-environment` = `production`) référencé par
   `CODE_SIGN_ENTITLEMENTS` dans `project.pbxproj`, puis refaire « Fetch profiles »
   dans Codemagic pour un profil qui inclut le push.
