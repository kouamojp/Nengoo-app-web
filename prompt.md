CAHIER DES CHARGES TECHNIQUE

Optimisation et évolution de la marketplace Nengoo.com

Projet : Nengoo – Marketplace e-commerce au Cameroun
Destinataire : Ingénieur / Développeur responsable de la plateforme
Objectif : Améliorer l’expérience client, optimiser les ventes et intégrer un assistant intelligent de recherche de produits.

⸻

1. Présentation du projet

Nengoo est une marketplace destinée à mettre en relation les acheteurs et les vendeurs, avec une priorité donnée au marché camerounais.

L’objectif de cette évolution est de transformer Nengoo en une plateforme e-commerce moderne, intuitive, rapide et adaptée aux habitudes des consommateurs camerounais.

Le site doit permettre aux clients de :

- Trouver rapidement les produits recherchés.
- Comparer les offres de différents vendeurs.
- Commander facilement depuis un téléphone.
- Utiliser les moyens de paiement locaux.
- Connaître les frais et délais de livraison.
- Bénéficier d’un accompagnement intelligent grâce à un assistant IA.

Le développement devra préserver les fonctionnalités existantes et les données de la plateforme.

2. Audit technique et fonctionnel préalable

Avant toute modification, le développeur devra effectuer un audit de la version actuelle de Nengoo.

Tâches à réaliser

1. Examiner l’architecture technique du site.
2. Identifier les technologies utilisées : frontend, backend, base de données et API.
3. Examiner les catégories et sous-catégories existantes.
4. Identifier les produits non classés, les catégories vides et les doublons.
5. Vérifier les fonctionnalités du panier et de la commande.
6. Examiner les moyens de paiement disponibles.
7. Vérifier le système de livraison.
8. Contrôler les performances du site sur mobile.
9. Vérifier la sécurité des comptes clients et vendeurs.
10. Identifier les erreurs techniques et les fonctionnalités incomplètes.

Livrable attendu : un rapport d’audit présentant les problèmes identifiés, leur niveau de priorité et les solutions proposées.

Les observations issues de l’analyse publique du catalogue, notamment les produits non classés, devront être vérifiées dans la base de données réelle avant toute intervention.

3. Optimisation des catégories et du catalogue

3.1. Nouvelle organisation des catégories

Le développeur devra examiner les catégories actuelles et proposer une structure cohérente adaptée au Cameroun.

Catégories prioritaires à intégrer ou à améliorer :

1. Téléphones et accessoires.
2. Informatique.
3. Électronique.
4. Mode femme.
5. Mode homme.
6. Mode enfant.
7. Beauté et cosmétiques.
8. Santé et bien-être.
9. Maison et décoration.
10. Électroménager.
11. Alimentation et épicerie.
12. Produits du terroir camerounais.
13. Agriculture et élevage.
14. Construction et bricolage.
15. Automobile et pièces détachées.
16. Motos et transport.
17. Bébé et maternité.
18. Sport et loisirs.
19. Artisanat et Made in Cameroon.
20. Équipements professionnels.

Les catégories existantes devront être conservées lorsqu’elles sont pertinentes.

3.2. Gestion des sous-catégories

Chaque catégorie devra pouvoir contenir des sous-catégories.

Exemple :

Téléphones et accessoires

- Smartphones Android.
- Téléphones Tecno.
- Téléphones Infinix.
- Téléphones Samsung.
- Téléphones iPhone.
- Chargeurs.
- Écouteurs.
- Batteries.
- Accessoires.

Produits du terroir camerounais

- Plantain.
- Manioc.
- Macabo.
- Igname.
- Maïs.
- Arachides.
- Huile de palme.
- Cacao et café.
- Miel.
- Produits transformés.

Les sous-catégories devront être administrables sans intervention du développeur.

3.3. Fonctionnalités attendues

- Ajouter, modifier et supprimer une catégorie.
- Ajouter des sous-catégories.
- Associer une image et une description.
- Réorganiser les catégories.
- Associer plusieurs produits à une catégorie.
- Déplacer un produit vers une autre catégorie.
- Masquer les catégories sans produits.
- Éviter les doublons.
- Traduire les catégories en français et en anglais.
- Permettre la recherche d’une catégorie dans l’administration.

Critère de validation : un administrateur doit pouvoir créer et modifier une catégorie sans intervention technique.

4. Amélioration de la recherche de produits

La recherche constitue une fonctionnalité stratégique de Nengoo.

Le système actuel devra être examiné afin de déterminer les améliorations nécessaires.

Fonctionnalités à développer

4.1. Recherche intelligente

La recherche devra :

- Reconnaître les fautes d’orthographe courantes.
- Comprendre les synonymes.
- Reconnaître les noms de marques.
- Rechercher dans les noms, descriptions et catégories.
- Afficher des suggestions pendant la saisie.
- Proposer des produits similaires lorsque la recherche ne donne aucun résultat.
- Comprendre les requêtes en français et en anglais.

Exemples :

Un client écrit :

« téléphone tecno pas cher »

Le système doit proposer des téléphones Tecno disponibles, classés par pertinence et prix.

Un client écrit :

« machine pour faire jus »

Le système doit proposer des extracteurs de jus, des centrifugeuses et des appareils similaires.

Un client écrit :

« chaussure homme taille 43 »

Le système doit filtrer les chaussures pour homme correspondant à la taille demandée.

4.2. Filtres de recherche

Ajouter les filtres suivants :

- Catégorie.
- Sous-catégorie.
- Prix minimum et maximum.
- Ville.
- Disponibilité.
- Marque.
- État du produit : neuf ou occasion.
- Note du vendeur.
- Livraison disponible.
- Promotion.

  4.3. Classement des résultats

Les résultats devront être classés selon :

- La pertinence de la recherche.
- La disponibilité du produit.
- Le prix.
- La qualité des informations.
- La réputation du vendeur.
- Les préférences du client.

Les produits sponsorisés devront être clairement identifiés.

5. Développement d’un assistant IA pour Nengoo

5.1. Objectif

Intégrer un assistant intelligent permettant aux clients de rechercher des produits en utilisant le langage naturel.

L’assistant devra agir comme un conseiller d’achat virtuel.

Il devra comprendre les besoins du client, proposer les produits disponibles et faciliter l’accès à la fiche produit.

5.2. Interface utilisateur

Ajouter un bouton visible sur le site :

« Assistant Nengoo – Trouvez votre produit »

L’assistant devra être accessible :

- Depuis la page d’accueil.
- Depuis la barre de recherche.
- Depuis les pages de catégories.
- Depuis les fiches produits.
- Depuis la version mobile.

L’interface devra être légère et adaptée aux téléphones Android.

5.3. Exemples de conversations

Exemple 1 : recherche par budget

Client :

« Je cherche un téléphone Android avec un budget de 80 000 FCFA. »

Assistant :

« Voici les téléphones Android disponibles dans ton budget. Tu peux comparer les modèles, les vendeurs et les frais de livraison. »

L’assistant devra afficher les produits correspondants avec leurs prix et leurs liens.

Exemple 2 : recherche par besoin

Client :

« Je veux un ordinateur pour travailler sur Excel et faire des cours en ligne. »

Assistant :

« Je te recommande de rechercher un ordinateur avec au moins 8 Go de RAM et un SSD. Voici les modèles disponibles sur Nengoo. »

Les recommandations devront être basées sur les caractéristiques réelles des produits.

Exemple 3 : recherche locale

Client :

« Je cherche une moto à Douala pour faire le moto-taxi. »

Assistant :

« Voici les motos disponibles à Douala. Tu peux comparer les prix, les caractéristiques et les vendeurs. »

L’assistant ne devra afficher que des offres réelles et disponibles.

5.4. Fonctionnalités IA à développer

- Compréhension du langage naturel.
- Recherche sémantique dans le catalogue.
- Reconnaissance des besoins du client.
- Recherche par budget.
- Recherche par ville.
- Comparaison de plusieurs produits.
- Recommandation de produits similaires.
- Questions de clarification lorsque la demande est ambiguë.
- Réponses en français et en anglais.
- Liens directs vers les fiches produits.

  5.5. Architecture technique recommandée

L’assistant devra utiliser les données réelles de Nengoo.

Architecture proposée :

Client → Interface IA → API de recherche Nengoo → Base de données des produits → Résultats → Assistant IA.

Le modèle IA ne devra pas inventer :

- Des produits.
- Des prix.
- Des stocks.
- Des vendeurs.
- Des délais de livraison.
- Des caractéristiques techniques.

Si aucune offre ne correspond à la demande, l’assistant devra l’indiquer clairement.

5.6. Sécurité et coût de l’IA

Le développeur devra :

- Utiliser une API IA sécurisée côté serveur.
- Ne jamais exposer les clés API dans le frontend.
- Limiter les requêtes abusives.
- Mettre en cache les recherches fréquentes.
- Mesurer le coût par conversation.
- Prévoir un système de limitation des requêtes.
- Enregistrer les statistiques d’utilisation.
- Respecter la confidentialité des clients.

L’assistant devra être conçu pour évoluer progressivement, sans imposer immédiatement des coûts élevés.

6. Optimisation du parcours de commande

Le parcours de commande devra être simplifié.

Fonctionnalités demandées

- Possibilité de commander sans créer de compte.
- Commande par numéro de téléphone.
- Formulaire simple et rapide.
- Choix de la ville.
- Choix du quartier.
- Champ pour le point de repère.
- Affichage des frais de livraison.
- Affichage du montant total avant confirmation.
- Confirmation de commande par SMS, WhatsApp ou notification.
- Suivi de commande.

Les informations essentielles devront être accessibles sans obliger le client à remplir de longs formulaires.

États de commande

Le système devra gérer les états suivants :

1. Commande reçue.
2. Commande confirmée.
3. Paiement en attente.
4. Paiement confirmé.
5. Préparation du colis.
6. Expédition.
7. Livraison en cours.
8. Commande livrée.
9. Commande annulée.
10. Remboursement, si applicable.

11. Paiements adaptés au Cameroun

Le développeur devra vérifier les moyens de paiement existants et proposer les intégrations nécessaires.

Moyens prioritaires :

- MTN Mobile Money.
- Orange Money.
- Paiement à la livraison, selon les zones et les vendeurs.
- Carte bancaire, si disponible et pertinente.

Fonctionnalités demandées

- Confirmation automatique des paiements.
- Vérification des transactions côté serveur.
- Protection contre les fausses confirmations.
- Gestion des paiements échoués.
- Gestion des remboursements.
- Historique des transactions.
- Génération de reçus.

Les intégrations devront utiliser des prestataires autorisés et compatibles avec le Cameroun.

8. Amélioration de la livraison

Le système de livraison devra être adapté aux réalités des villes camerounaises.

Fonctionnalités demandées

- Gestion des villes.
- Gestion des quartiers.
- Configuration des frais par zone.
- Délais de livraison estimés.
- Gestion des livreurs.
- Affectation des commandes aux livreurs.
- Suivi de livraison.
- Confirmation de réception.
- Gestion des commandes non livrées.
- Historique des livraisons.

Le système devra permettre de configurer des frais différents pour Douala, Yaoundé, Bafoussam, Bamenda et les autres villes.

9. Amélioration de la confiance et de la sécurité

Vendeurs

Ajouter :

- Vérification des vendeurs.
- Badge vendeur vérifié.
- Note et avis des clients.
- Historique des ventes.
- Informations de contact.
- Politique de retour.
- Gestion des réclamations.

Produits

Chaque fiche produit devra contenir :

- Nom du produit.
- Description.
- Prix.
- Photos.
- Disponibilité.
- Caractéristiques.
- Vendeur.
- Frais de livraison.
- Délai estimé.
- Conditions de retour.

Sécurité

Le développeur devra vérifier :

- La sécurité des comptes.
- La protection des données personnelles.
- La sécurité des paiements.
- Les permissions administrateur.
- La protection contre les injections et les attaques courantes.
- Les sauvegardes de la base de données.
- La journalisation des actions sensibles.

10. Optimisation de l’administration

Le tableau de bord administrateur devra faciliter la gestion de Nengoo.

Fonctionnalités attendues :

- Gestion des catégories.
- Gestion des produits.
- Gestion des vendeurs.
- Gestion des commandes.
- Gestion des paiements.
- Gestion des livraisons.
- Gestion des promotions.
- Gestion des réclamations.
- Gestion de l’assistant IA.
- Statistiques commerciales.

L’administration devra permettre de suivre :

- Le nombre de produits.
- Le nombre de vendeurs actifs.
- Le nombre de commandes.
- Le chiffre d’affaires.
- Les produits les plus vendus.
- Les catégories les plus consultées.
- Les recherches sans résultat.
- Les abandons de panier.
- Les performances de l’assistant IA.

11. Performance et expérience mobile

La majorité des utilisateurs potentiels de Nengoo peuvent accéder au site depuis un smartphone.

Le développeur devra donc :

- Optimiser les images.
- Réduire le poids des pages.
- Améliorer le temps de chargement.
- Tester sur Android.
- Tester sur les connexions mobiles lentes.
- Simplifier les menus.
- Rendre les boutons faciles à utiliser.
- Éviter les formulaires trop longs.
- Assurer la compatibilité avec les navigateurs mobiles.

Le site devra rester utilisable même lorsque la connexion Internet est faible.

12. Plan de développement

Phase Tâches Priorité
Phase 1 Audit technique et fonctionnel Critique
Phase 2 Correction des catégories et du catalogue Critique
Phase 3 Optimisation de la recherche Haute
Phase 4 Simplification de la commande Haute
Phase 5 Paiements et livraison Haute
Phase 6 Assistant IA de recherche Haute
Phase 7 Amélioration de l’administration Moyenne
Phase 8 Statistiques et fidélisation Moyenne

Le développeur devra proposer un calendrier détaillé après l’audit technique.

13. Critères de validation

Le projet sera considéré comme validé lorsque :

1. Les catégories seront correctement organisées.
2. Les produits seront correctement classés.
3. La recherche fonctionnera avec des fautes courantes.
4. Les filtres permettront de retrouver les produits.
5. L’assistant IA affichera uniquement des offres réelles.
6. Le client pourra commander depuis un téléphone.
7. Les frais de livraison seront visibles avant confirmation.
8. Les paiements seront vérifiés côté serveur.
9. Le suivi de commande sera fonctionnel.
10. Les données existantes seront préservées.
11. Les fonctionnalités auront été testées.
12. Le développeur aura fourni une documentation technique.

13. Livrables attendus du développeur

Le développeur devra fournir :

- Le rapport d’audit initial.
- La liste des problèmes identifiés.
- Le plan de développement.
- La liste des fonctionnalités développées.
- Les modifications apportées à la base de données.
- La documentation de l’API.
- Les résultats des tests.
- La documentation de l’assistant IA.
- Les instructions d’administration.
- Les recommandations pour les évolutions futures.

15. Consignes importantes

Aucune modification destructive ne devra être réalisée sans validation préalable.

Le développeur devra :

- Sauvegarder la base de données avant les modifications.
- Conserver les produits et les commandes existants.
- Éviter les doublons de catégories.
- Effectuer les tests sur un environnement de développement avant la production.
- Documenter les modifications.
- Prévoir une procédure de retour arrière en cas de problème.

Objectif final : faire de Nengoo une marketplace camerounaise moderne, fiable, intelligente et simple d’utilisation, capable de faciliter les achats en ligne et d’améliorer les ventes des commerçants locaux.
