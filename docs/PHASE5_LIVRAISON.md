# Phase 5 : livraison (paiement mobile mis de côté)

État au 2 novembre 2026. Le paiement MTN MoMo / Orange Money attend le choix d'un prestataire (NotchPay, CinetPay, Campay…) ; remboursements et reçus en dépendent.

## Frais de livraison

`backend/delivery.py`. Pour chaque vendeur d'une commande livrée à domicile :

1. le vendeur a fixé son propre tarif (`deliveryPrice`, espace vendeur) : il l'applique ;
2. sinon le tarif du quartier, à défaut celui de la ville ;
3. sinon le tarif standard.

La livraison est offerte si le montant d'achat chez ce vendeur atteint le seuil réglé. Le retrait en point relais est gratuit.

- Réglages : **Administration › Frais de livraison** (super administrateur) : tarif standard, seuil de gratuité, tarifs par ville et par quartier. Route `PUT /api/delivery/zones`.
- `POST /api/delivery/quote` : frais et total avant de commander, avec le même calcul que la commande. Utilisé par le formulaire de commande du site et de l'app (recalculé quand la ville ou le quartier change).

## Livreurs et preuve de remise

- **Administration › Livreurs** : nom, téléphone, ville, actif. Chaque livreur a un lien personnel (`/livreur/<lien>`) à lui envoyer sur WhatsApp ; « Changer son lien » rend l'ancien inutilisable.
- **Administration › Commandes** : choix du livreur sous le statut de chaque commande à domicile.
- Page du livreur : ses livraisons en cours (adresse, quartier, repère, articles, montant à encaisser), boutons Appeler / WhatsApp, « Je pars livrer » (le client reçoit un SMS), « Livrée » avec le **code à 4 chiffres** du client, « Livraison impossible » avec un motif (tentative notée, visible dans l'admin).
- Le client reçoit son code dans le SMS de confirmation, sur la page de confirmation et sur le suivi de commande (site et app). Le livreur ne le voit jamais ; les essais de code sont limités.

## Suivi des commandes par vendeur (admin)

**Administration › Commandes › Suivi par vendeur** : pour chaque vendeur, commandes à traiter, en cours, livrées, annulées, ventes livrées et date de la dernière commande ; « Voir ses commandes » filtre la liste (lien partageable `?section=orders&vendeur=<id>`). Le bouton **Commandes** de la liste des vendeurs y mène aussi. Le détail d'une commande montre l'adresse, le livreur, le code et l'historique des statuts.

## Mise en production

Déployer le serveur et le site, puis publier l'app. Aucune migration : les zones sont vides au départ (tarif standard et tarifs des vendeurs comme avant). Les anciennes commandes reçoivent un code quand on leur attribue un livreur.
