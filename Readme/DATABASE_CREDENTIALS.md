# 🗄️ Base de Données MongoDB - Nengoo

## ✅ Statut de la Base de Données

**Base de données créée avec succès le 28 novembre 2025**

- **Nom de la base** : `nengoo`
- **URL de connexion** : `mongodb://localhost:27017/nengoo`
- **Total de collections** : 7
- **Total de documents** : 21

---

## 📊 Collections Créées

| Collection | Documents | Description |
|-----------|-----------|-------------|
| **users** | 3 | Utilisateurs (acheteurs + admins) |
| **sellers** | 3 | Vendeurs (2 approuvés, 1 en attente) |
| **products** | 3 | Produits en vente |
| **pickupPoints** | 5 | Points de retrait (3 approuvés, 2 en attente) |
| **pickupManagers** | 3 | Gestionnaires des points de retrait |
| **orders** | 2 | Commandes clients |
| **reviews** | 2 | Avis sur les produits |

---

## 🔐 Identifiants de Test

### 👑 Super Administrateur

```
WhatsApp: +237600000000
Mot de passe: ADMIN2025
Type: admin
Accès: Dashboard admin complet
```

**Fonctionnalités :**
- Gestion des vendeurs (approuver/rejeter/suspendre)
- Gestion des acheteurs (modifier/suspendre)
- Gestion des produits (approuver/rejeter/modifier)
- Gestion des commandes (modifier statut)
- Gestion des points de retrait (approuver/modifier/suspendre)
- Gestion des gestionnaires de points de retrait
- Modifier les mots de passe des utilisateurs
- Statistiques complètes

---

### 👥 Acheteurs

#### Acheteur 1 : Marie Kouam
```
WhatsApp: +237655123456
Mot de passe: 123456
Email: marie.kouam@example.com
Ville: Yaoundé
```

**Statistiques :**
- 5 commandes passées
- 245,000 FCFA dépensés
- 1 adresse enregistrée
- Point de retrait favori : Yaoundé Mvan

---

#### Acheteur 2 : Jean Nkoa
```
WhatsApp: +237699888777
Mot de passe: buyer456
Email: jean.nkoa@example.com
Ville: Douala
```

**Statistiques :**
- 8 commandes passées
- 520,000 FCFA dépensés
- 1 adresse enregistrée
- Point de retrait favori : Douala Centre

---

### 🏪 Vendeurs

#### Vendeur 1 : Mode Africaine (Marie Boutique)
```
WhatsApp: +237655111222
Mot de passe: seller123
Email: marie@modeafricaine.cm
Boutique: Mode Africaine
Ville: Douala
Statut: Approuvé ✅
```

**Statistiques :**
- 45 produits
- 1,250,000 FCFA de ventes
- 450 commandes complétées
- Note : 4.7/5 (120 avis)

---

#### Vendeur 2 : Électro Plus (Paul Kamdem)
```
WhatsApp: +237677222333
Mot de passe: seller456
Email: paul@electroplus.cm
Boutique: Électro Plus
Ville: Yaoundé
Statut: Approuvé ✅
```

**Statistiques :**
- 32 produits
- 2,850,000 FCFA de ventes
- 320 commandes complétées
- Note : 4.5/5 (85 avis)

---

#### Vendeur 3 : Artisanat Bamiléké (Grace Njoh)
```
WhatsApp: +237688333444
Mot de passe: pending123
Email: grace@artisanat.cm
Boutique: Artisanat Bamiléké
Ville: Bafoussam
Statut: En attente ⏳
```

**Note :** Ce vendeur est en attente d'approbation par le super admin

---

### 📍 Gestionnaires de Points de Retrait

#### Gestionnaire 1 : Jean Mbarga
```
WhatsApp: +237655888999
Mot de passe: manager123
Email: jean.mbarga@nengoo.cm
Point géré: Nengoo Point Douala Centre
Ville: Douala
Statut: Actif ✅
```

**Statistiques :**
- 450 commandes traitées
- Note de performance : 4.8/5

---

#### Gestionnaire 2 : Marie Essomba
```
WhatsApp: +237699777888
Mot de passe: manager456
Email: marie.essomba@nengoo.cm
Point géré: Nengoo Point Yaoundé Mvan
Ville: Yaoundé
Statut: Actif ✅
```

**Statistiques :**
- 320 commandes traitées
- Note de performance : 4.6/5

---

#### Gestionnaire 3 : Paul Kamga
```
WhatsApp: +237677666555
Mot de passe: manager789
Email: paul.kamga@nengoo.cm
Point géré: Nengoo Point Bafoussam
Ville: Bafoussam
Statut: Actif ✅
```

**Statistiques :**
- 180 commandes traitées
- Note de performance : 4.9/5

---

## 📦 Produits en Base de Données

### Produit 1 : Robe Traditionnelle Camerounaise
- **Prix** : 45,000 FCFA (réduit de 55,000 FCFA)
- **Vendeur** : Mode Africaine
- **Catégorie** : Vêtements & Accessoires
- **Stock** : 12 unités
- **Vendus** : 45 unités
- **Note** : 4.8/5 (23 avis)

### Produit 2 : Smartphone Samsung Galaxy A54
- **Prix** : 285,000 FCFA (réduit de 320,000 FCFA)
- **Vendeur** : Électro Plus
- **Catégorie** : Électronique
- **Stock** : 5 unités
- **Vendus** : 18 unités
- **Note** : 4.9/5 (15 avis)

### Produit 3 : Panier Artisanal Bamiléké
- **Prix** : 15,000 FCFA
- **Vendeur** : Mode Africaine
- **Catégorie** : Artisanat
- **Stock** : 25 unités
- **Vendus** : 89 unités
- **Note** : 4.6/5 (34 avis)

---

## 📍 Points de Retrait

### Points Approuvés (3)

#### 1. Nengoo Point Douala Centre
```
Adresse: Avenue de la Liberté, Akwa, Douala
Téléphone: +237 233 456 789
Email: douala.centre@nengoo.cm
Horaires: Lun-Sam: 8h-18h, Dim: Fermé
Capacité: 100 colis (25 actuellement)
Gestionnaire: Jean Mbarga (+237655888999)
Note: 4.7/5 (120 avis)
Statut: Approuvé ✅
```

#### 2. Nengoo Point Yaoundé Mvan
```
Adresse: Quartier Mvan, près du marché, Yaoundé
Téléphone: +237 222 345 678
Email: yaounde.mvan@nengoo.cm
Horaires: Lun-Sam: 8h-18h
Capacité: 80 colis (18 actuellement)
Gestionnaire: Marie Essomba (+237699777888)
Note: 4.5/5 (85 avis)
Statut: Approuvé ✅
```

#### 3. Nengoo Point Bafoussam
```
Adresse: Centre Commercial, Bafoussam
Téléphone: +237 233 567 890
Email: bafoussam@nengoo.cm
Horaires: Lun-Sam: 9h-17h
Capacité: 60 colis (12 actuellement)
Gestionnaire: Paul Kamga (+237677666555)
Note: 4.8/5 (52 avis)
Statut: Approuvé ✅
```

### Points En Attente (2)

#### 4. Nengoo Point Garoua
```
Adresse: Quartier Commercial, Garoua
Gestionnaire: Ahmadou Bello (+237655444333)
Statut: En attente d'approbation ⏳
```

#### 5. Nengoo Point Limbe
```
Adresse: Down Beach, Limbe
Gestionnaire: Grace Njoh (+237688555444)
Statut: En attente d'approbation ⏳
```

---

## 📦 Commandes en Base de Données

### Commande 1 : CMD001
- **Client** : Marie Kouam
- **Vendeur** : Mode Africaine
- **Produit** : Robe Traditionnelle (1x 45,000 FCFA)
- **Point de retrait** : Yaoundé Mvan
- **Statut** : Livré et récupéré ✅
- **Dates** :
  - Commandé : 20/01/2025
  - Expédié : 21/01/2025
  - Arrivé au point : 22/01/2025
  - Récupéré : 23/01/2025

### Commande 2 : CMD002
- **Client** : Jean Nkoa
- **Vendeur** : Électro Plus
- **Produit** : Samsung Galaxy A54 (1x 285,000 FCFA)
- **Point de retrait** : Douala Centre
- **Statut** : En transit 🚚
- **Dates** :
  - Commandé : 26/01/2025
  - Expédié : 27/01/2025
  - Arrivé au point : En attente
  - Récupéré : En attente

---

## 🔄 Script d'Initialisation

Le fichier `/app/backend/init_database.py` peut être réexécuté à tout moment pour :
- Réinitialiser la base de données
- Recréer toutes les collections
- Réinsérer les données de test

**Commande :**
```bash
cd /app/backend && python init_database.py
```

---

## 🔒 Sécurité

- ✅ Tous les mots de passe sont hashés avec **bcrypt**
- ✅ Index uniques sur WhatsApp et Email
- ✅ Champs de sécurité : `loginAttempts`, `accountLocked`, `passwordResetRequired`
- ✅ Tracking des modifications de mot de passe
- ✅ Audit trail : `passwordChangedBy`

---

## 📝 Notes Importantes

1. **Mots de passe** : En production, tous les mots de passe doivent être changés
2. **Données de test** : Ces données sont uniquement pour le développement et les tests
3. **Backup** : Pensez à faire des backups réguliers de la base de données
4. **Production** : Utilisez des identifiants MongoDB sécurisés en production
5. **Scalabilité** : Les index sont optimisés pour des recherches rapides

---

## 🚀 Prochaines Étapes

1. Connecter le backend aux collections MongoDB
2. Implémenter les endpoints API REST
3. Ajouter l'authentification JWT
4. Implémenter le système de notifications WhatsApp
5. Ajouter plus de produits et de données
6. Tester tous les workflows de bout en bout

---

**📅 Date de création** : 28 novembre 2025  
**✍️ Créé par** : Agent E1 (Emergent Labs)  
**🗄️ Base de données** : MongoDB 7.0  
**🔐 Hashage** : bcrypt
