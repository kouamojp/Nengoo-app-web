# Notifications push (app mobile)

L'app reçoit en push chaque notification de la cloche du site :

| Événement | Destinataire | Écran ouvert au toucher |
|---|---|---|
| Réponse de l'équipe Nengoo (messagerie) | vendeur ou acheteur | Écrire à l'équipe Nengoo |
| Nouvelle commande | vendeur | Ma boutique |
| Commande reçue, changement de statut | acheteur | Mes commandes |
| Message d'un client sur un produit | vendeur | (app ouverte sur l'accueil) |

Fonctionnement :

- **Serveur** : `backend/push.py`. `notify()` enregistre la notification de la cloche puis l'envoie
  par Firebase Cloud Messaging aux appareils du compte, en tâche de fond. Les jetons refusés par
  FCM (app désinstallée) sont supprimés. Routes : `backend/routers/push.py`.
- **App** : `nengoo-front/lib/helper/push_notifications.dart`. Le jeton est enregistré à la
  connexion et à chaque démarrage (`POST /api/push/tokens`), oublié à la déconnexion. Au premier
  plan, la notification s'affiche en bandeau violet dans l'app.

Tant que la configuration ci-dessous n'est pas faite, rien ne casse : l'app se construit et
fonctionne sans push, le serveur ignore l'envoi.

## Mise en service

Projet Firebase : **nengoo-994dd** (celui de la connexion Google du site et du compte de service
du serveur).

### 1. Android

1. [Console Firebase](https://console.firebase.google.com/project/nengoo-994dd/settings/general) →
   *Paramètres du projet* → *Vos applications* → **Ajouter une application** → Android.
2. Nom du package : `com.nengoo.app` (doit être exact).
3. Télécharger `google-services.json` et le placer dans `nengoo-front/android/app/`.
4. Reconstruire l'app (`flutter build appbundle`). Le plugin Google Services s'active tout seul
   quand le fichier est présent.

Le fichier ne contient pas de secret (clé d'API restreinte à l'app) ; il peut être versionné.

### 2. Serveur

- `firebase-service-account.json` doit être présent sur le serveur (déjà requis pour la connexion
  Google, voir `DEPLOY_CPANEL.md`).
- Vérifier dans Google Cloud que l'API **Firebase Cloud Messaging API (V1)** est activée pour
  nengoo-994dd (activée par défaut sur les projets récents).

### 3. iOS (si l'app est publiée sur l'App Store)

1. Console Firebase → *Ajouter une application* → iOS, avec le Bundle ID de l'app.
2. Placer `GoogleService-Info.plist` dans `ios/Runner/` **via Xcode** (glisser dans le groupe
   Runner, cocher la cible Runner).
3. Xcode → cible Runner → *Signing & Capabilities* → ajouter **Push Notifications**
   (le mode d'arrière-plan *Remote notifications* est déjà déclaré dans `Info.plist`).
4. Portail Apple Developer → *Keys* → créer une clé APNs, puis la téléverser dans la console
   Firebase → *Cloud Messaging* → *Configuration de l'application Apple*.

## Vérifier

1. Installer l'app, se connecter avec un compte vendeur ou acheteur, accepter les notifications.
2. Dans MongoDB, la collection `push_tokens` contient une ligne pour ce compte.
3. Depuis l'administration (*Messagerie*), écrire à ce compte : la notification arrive, app
   fermée comme ouverte, et la toucher ouvre la conversation.

Si rien n'arrive : journaux du serveur (`Push non envoyé à …`), puis la console Firebase →
*Cloud Messaging* → *Envoyer un message test* avec le jeton de `push_tokens`.
