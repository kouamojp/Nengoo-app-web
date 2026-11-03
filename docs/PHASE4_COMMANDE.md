# Phase 4 : commande simplifiée

État au 2 novembre 2026. Les moyens de paiement sont mis de côté pour l'instant (seul le paiement à la livraison est proposé).

## Commande

- Sans compte et sans e-mail : un nom et un numéro de téléphone suffisent. Un client qui revient est retrouvé par son numéro, quel que soit son format.
- Adresse : ville (liste proposée), quartier, point de repère, adresse facultative. Champs `shippingNeighborhood` et `shippingLandmark` de la commande.
- Contrôles du serveur : quantité entière d'au moins 1, produit en vente (approuvé, prix > 0), quantité disponible en stock. Un même produit ajouté deux fois est regroupé.
- Stock réservé à la commande, de façon atomique : deux clients ne peuvent pas acheter le même dernier article. Il est rendu si la commande est annulée (et repris si un administrateur la réactive). Champ `stockReserved` ; les commandes plus anciennes gardent l'ancienne règle (stock retiré à la livraison).
- Après la commande, le site affiche les numéros de commande et un lien de suivi.

## États de commande

`backend/order_flow.py` et `frontend/src/lib/orderStatuses.js` : reçue, confirmée, paiement en attente, paiement confirmé, préparation du colis, expédiée, livraison en cours, livrée, annulée, remboursée. Un vendeur ne propose que les étapes suivantes possibles (les étapes de paiement sont masquées tant que le paiement n'est pas intégré) ; un administrateur peut corriger librement. Chaque changement est ajouté à `statusHistory`. Les anciens statuts `pending` et `processing` s'affichent « Commande reçue » et « Préparation du colis ».

## Suivi sans compte

Page `/suivi-commande` (lien dans le pied de page) : numéro de commande + téléphone utilisé. Route `GET /api/orders/track`, limitée en tentatives comme la connexion. Elle ne renvoie ni l'identifiant ni les coordonnées du client.

## App

« Mot de passe oublié » appelle désormais `/api/auth/forgot-password` (e-mail et type de compte) ; le lien reçu ouvre la page de réinitialisation du site.

## Mise en production

Déployer le serveur et le site, puis publier l'app. Aucune migration de données : les anciennes commandes restent lisibles telles quelles.

## Confirmation par SMS

`backend/sms.py` : SMS au client à la commande (numéro, montant, lien de suivi) et quand la commande est confirmée, expédiée, en livraison, livrée ou annulée. Messages sans accents (alphabet GSM : 160 caractères par SMS au lieu de 70). Envoi en tâche de fond : un fournisseur lent ne bloque jamais une commande.

Fournisseur à choisir, puis à renseigner dans le `.env` du serveur :

```ini
# Africa's Talking (couvre le Cameroun)
SMS_PROVIDER=africastalking
AT_USERNAME=<nom d'utilisateur>
AT_API_KEY=<clé>
SMS_SENDER_ID=Nengoo        # facultatif, à faire valider par le fournisseur

# ou Twilio
SMS_PROVIDER=twilio
TWILIO_ACCOUNT_SID=<...>
TWILIO_AUTH_TOKEN=<...>
TWILIO_FROM=<numéro Twilio>
```

Sans `SMS_PROVIDER`, rien n'est envoyé : le message est seulement écrit dans le journal du serveur.

## Panier dans l'app

- Onglet **Panier** dans la barre du bas (avec le nombre d'articles), bouton **Ajouter au panier** sur la fiche produit ; WhatsApp reste à côté. Le panier est gardé sur le téléphone ; la quantité ne dépasse pas le stock connu.
- Commande depuis l'app avec le même formulaire que le site (nom, téléphone, e-mail facultatif, livraison à domicile ou point de retrait, paiement à la livraison), frais de livraison et total affichés avant confirmation.
- Écran de confirmation avec les numéros de commande, et **Suivre une commande** (aussi dans le profil).
