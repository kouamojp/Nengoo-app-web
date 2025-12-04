# 🗄️ Documentation des Bases de Données - Nengoo

## 📋 Vue d'ensemble

Nengoo utilise **MongoDB** comme base de données principale avec les collections suivantes:

---

## 📊 Collections MongoDB

### 1. 👥 Collection: `users`

Stocke tous les utilisateurs (acheteurs et administrateurs).

#### Schéma:
```javascript
{
  _id: ObjectId,                    // ID unique MongoDB
  id: String,                       // ID custom (UUID recommandé)
  whatsapp: String,                 // Numéro WhatsApp (unique)
  password: String,                 // Mot de passe hashé (bcrypt)
  name: String,                     // Nom complet
  email: String,                    // Email (optionnel)
  type: String,                     // "buyer" | "admin"
  joinDate: Date,                   // Date d'inscription
  status: String,                   // "active" | "suspended"
  
  // Sécurité et authentification
  passwordResetRequired: Boolean,   // Mot de passe doit être changé
  lastPasswordChange: Date,         // Dernière modification du mot de passe
  passwordChangedBy: String,        // ID de l'admin qui a modifié (si applicable)
  loginAttempts: Number,            // Tentatives de connexion échouées
  lastLoginAttempt: Date,           // Dernière tentative de connexion
  accountLocked: Boolean,           // Compte verrouillé après tentatives
  
  // Statistiques acheteur
  totalOrders: Number,              // Nombre de commandes
  totalSpent: Number,               // Montant total dépensé (XAF)
  
  // Données profil
  addresses: Array,                 // Adresses de livraison
  favoritePickupPoints: Array,      // Points de retrait favoris (IDs)
  paymentMethods: Array,            // Méthodes de paiement
  
  // Métadonnées
  createdAt: Date,
  updatedAt: Date
}
```

#### Exemple:
```json
{
  "_id": "65abc123...",
  "id": "user_001",
  "whatsapp": "+237655123456",
  "name": "Marie Kouam",
  "email": "marie.kouam@example.com",
  "type": "buyer",
  "joinDate": "2025-01-10T00:00:00Z",
  "status": "active",
  "totalOrders": 5,
  "totalSpent": 245000,
  "addresses": [
    {
      "id": 1,
      "label": "Domicile",
      "address": "Avenue de la Liberté, Akwa",
      "city": "Douala",
      "phone": "+237655123456",
      "isDefault": true
    }
  ],
  "favoritePickupPoints": ["pickup_001", "pickup_002"],
  "paymentMethods": [
    {
      "type": "MTN Mobile Money",
      "number": "+237 655 XXX 456",
      "isDefault": true
    }
  ],
  "createdAt": "2025-01-10T10:30:00Z",
  "updatedAt": "2025-01-22T15:20:00Z"
}
```

#### Index:
```javascript
db.users.createIndex({ "whatsapp": 1 }, { unique: true })
db.users.createIndex({ "email": 1 })
db.users.createIndex({ "type": 1 })
db.users.createIndex({ "status": 1 })
```

---

### 2. 🏪 Collection: `sellers`

Stocke tous les vendeurs (approuvés et en attente).

#### Schéma:
```javascript
{
  _id: ObjectId,
  id: String,                       // ID unique
  whatsapp: String,                 // Numéro WhatsApp (unique)
  name: String,                     // Nom du propriétaire
  businessName: String,             // Nom de la boutique
  email: String,                    // Email professionnel
  city: String,                     // Ville (Douala, Yaoundé, etc.)
  categories: Array,                // Catégories de produits
  
  // Statut
  status: String,                   // "pending" | "approved" | "suspended"
  submitDate: Date,                 // Date de soumission
  approvalDate: Date,               // Date d'approbation
  approvedBy: String,               // Admin qui a approuvé
  
  // Profil vendeur
  description: String,              // Description de la boutique
  logo: String,                     // URL du logo
  rating: Number,                   // Note moyenne (0-5)
  totalSales: Number,               // Nombre de ventes
  totalRevenue: Number,             // Revenus totaux (XAF)
  
  // Réseaux sociaux
  socialMedia: {
    whatsapp: String,
    facebook: String,
    instagram: String,
    telegram: String
  },
  
  // Métadonnées
  createdAt: Date,
  updatedAt: Date
}
```

#### Exemple:
```json
{
  "_id": "65abc456...",
  "id": "seller_001",
  "whatsapp": "+237655111222",
  "name": "Marie Nkomo",
  "businessName": "Boutique Marie - Mode Africaine",
  "email": "contact@boutiquemarie.cm",
  "city": "Douala",
  "categories": ["clothing_accessories", "handicrafts"],
  "status": "approved",
  "submitDate": "2024-12-01T08:00:00Z",
  "approvalDate": "2024-12-02T10:00:00Z",
  "approvedBy": "admin",
  "description": "Vêtements traditionnels et modernes de qualité",
  "logo": "https://example.com/logos/boutique-marie.png",
  "rating": 4.8,
  "totalSales": 145,
  "totalRevenue": 1250000,
  "socialMedia": {
    "whatsapp": "+237655111222",
    "facebook": "https://facebook.com/boutiquemarie",
    "instagram": "@boutiquemarie",
    "telegram": null
  },
  "createdAt": "2024-12-01T08:00:00Z",
  "updatedAt": "2025-01-22T12:00:00Z"
}
```

#### Index:
```javascript
db.sellers.createIndex({ "whatsapp": 1 }, { unique: true })
db.sellers.createIndex({ "businessName": 1 })
db.sellers.createIndex({ "status": 1 })
db.sellers.createIndex({ "city": 1 })
db.sellers.createIndex({ "rating": -1 })
```

---

### 3. 📦 Collection: `products`

Stocke tous les produits du marketplace.

#### Schéma:
```javascript
{
  _id: ObjectId,
  id: String,                       // ID unique
  sellerId: String,                 // Référence au vendeur
  
  // Informations produit
  name: {
    fr: String,                     // Nom en français
    en: String                      // Nom en anglais
  },
  description: {
    fr: String,
    en: String
  },
  category: String,                 // Catégorie principale
  subcategory: String,              // Sous-catégorie
  
  // Prix et stock
  price: Number,                    // Prix en XAF
  originalPrice: Number,            // Prix original (pour remises)
  discount: Number,                 // Pourcentage de remise
  stock: Number,                    // Quantité en stock
  inStock: Boolean,                 // Disponible ou non
  
  // Médias
  images: Array,                    // URLs des images
  mainImage: String,                // Image principale
  
  // Évaluations
  rating: Number,                   // Note moyenne (0-5)
  reviews: Number,                  // Nombre d'avis
  
  // Contact vendeur
  sellerWhatsApp: String,           // WhatsApp du vendeur
  
  // Statut
  status: String,                   // "pending" | "approved" | "rejected"
  featured: Boolean,                // Produit en vedette
  
  // Métadonnées
  addedDate: Date,
  updatedDate: Date,
  views: Number,                    // Nombre de vues
  sales: Number                     // Nombre de ventes
}
```

#### Exemple:
```json
{
  "_id": "65abc789...",
  "id": "prod_001",
  "sellerId": "seller_001",
  "name": {
    "fr": "Robe Traditionnelle Camerounaise",
    "en": "Traditional Cameroonian Dress"
  },
  "description": {
    "fr": "Belle robe traditionnelle faite à la main avec des tissus locaux authentiques.",
    "en": "Beautiful handmade traditional dress with authentic local fabrics."
  },
  "category": "clothing_accessories",
  "subcategory": "traditional_wear",
  "price": 45000,
  "originalPrice": 60000,
  "discount": 25,
  "stock": 12,
  "inStock": true,
  "images": [
    "https://example.com/prod001_1.jpg",
    "https://example.com/prod001_2.jpg"
  ],
  "mainImage": "https://example.com/prod001_1.jpg",
  "rating": 4.8,
  "reviews": 124,
  "sellerWhatsApp": "+237655111222",
  "status": "approved",
  "featured": true,
  "addedDate": "2025-01-10T09:00:00Z",
  "updatedDate": "2025-01-20T14:30:00Z",
  "views": 1250,
  "sales": 45
}
```

#### Index:
```javascript
db.products.createIndex({ "sellerId": 1 })
db.products.createIndex({ "category": 1 })
db.products.createIndex({ "status": 1 })
db.products.createIndex({ "price": 1 })
db.products.createIndex({ "rating": -1 })
db.products.createIndex({ "featured": -1, "rating": -1 })
db.products.createIndex({ "name.fr": "text", "description.fr": "text" })
```

---

### 4. 🛒 Collection: `orders`

Stocke toutes les commandes.

#### Schéma:
```javascript
{
  _id: ObjectId,
  id: String,                       // ID commande (ex: CMD001)
  
  // Acheteur et vendeur
  buyerId: String,                  // Référence utilisateur
  buyerName: String,
  buyerWhatsApp: String,
  
  sellerId: String,                 // Référence vendeur
  sellerName: String,
  
  // Articles commandés
  items: Array,                     // Liste des produits
  /*
  items: [
    {
      productId: String,
      name: String,
      quantity: Number,
      price: Number,
      subtotal: Number
    }
  ]
  */
  
  // Montants
  subtotal: Number,                 // Sous-total (XAF)
  shippingCost: Number,             // Frais de livraison
  tax: Number,                      // TVA (10%)
  total: Number,                    // Total final
  
  // Livraison
  deliveryOption: String,           // "home" | "pickup"
  shippingAddress: Object,          // Adresse de livraison
  pickupPoint: Object,              // Point de retrait
  
  // Paiement
  paymentMethod: String,            // "mtnMoney" | "orangeMoney" | "card" | "cash"
  paymentStatus: String,            // "pending" | "paid" | "failed"
  
  // Statut commande
  status: String,                   // "processing" | "in_transit" | "delivered" | "cancelled"
  
  // Dates
  orderDate: Date,
  paidDate: Date,
  shippedDate: Date,
  deliveredDate: Date,
  
  // Notes
  customerNotes: String,
  trackingNumber: String,
  
  // Métadonnées
  createdAt: Date,
  updatedAt: Date
}
```

#### Exemple:
```json
{
  "_id": "65abcabc...",
  "id": "CMD001",
  "buyerId": "user_001",
  "buyerName": "Marie Kouam",
  "buyerWhatsApp": "+237655123456",
  "sellerId": "seller_001",
  "sellerName": "Boutique Marie",
  "items": [
    {
      "productId": "prod_001",
      "name": "Robe Traditionnelle Camerounaise",
      "quantity": 1,
      "price": 45000,
      "subtotal": 45000
    }
  ],
  "subtotal": 45000,
  "shippingCost": 0,
  "tax": 4500,
  "total": 49500,
  "deliveryOption": "home",
  "shippingAddress": {
    "name": "Marie Kouam",
    "address": "Avenue de la Liberté, Akwa",
    "city": "Douala",
    "phone": "+237655123456"
  },
  "pickupPoint": null,
  "paymentMethod": "mtnMoney",
  "paymentStatus": "paid",
  "status": "delivered",
  "orderDate": "2025-01-20T10:00:00Z",
  "paidDate": "2025-01-20T10:15:00Z",
  "shippedDate": "2025-01-21T08:00:00Z",
  "deliveredDate": "2025-01-22T14:00:00Z",
  "customerNotes": "Appeler avant livraison SVP",
  "trackingNumber": "TRK123456789",
  "createdAt": "2025-01-20T10:00:00Z",
  "updatedAt": "2025-01-22T14:00:00Z"
}
```

#### Index:
```javascript
db.orders.createIndex({ "buyerId": 1 })
db.orders.createIndex({ "sellerId": 1 })
db.orders.createIndex({ "status": 1 })
db.orders.createIndex({ "orderDate": -1 })
db.orders.createIndex({ "id": 1 }, { unique: true })
```

---

### 5. 📍 Collection: `pickupPoints`

Points de retrait disponibles.

#### Schéma:
```javascript
{
  _id: ObjectId,
  id: String,
  name: String,                     // Nom du point
  address: String,                  // Adresse complète
  city: String,                     // Ville
  phone: String,                    // Téléphone
  hours: String,                    // Horaires d'ouverture
  
  // Coordonnées GPS
  latitude: Number,
  longitude: Number,
  
  // Capacité
  isActive: Boolean,
  maxOrdersPerDay: Number,
  
  // Métadonnées
  createdAt: Date,
  updatedAt: Date
}
```

#### Exemple:
```json
{
  "_id": "65abcdef...",
  "id": "pickup_001",
  "name": "Nengoo Point Douala Centre",
  "address": "Avenue de la Liberté, Akwa, Douala",
  "city": "Douala",
  "phone": "+237 233 456 789",
  "hours": "Lun-Sam: 8h-18h",
  "latitude": 4.0511,
  "longitude": 9.7679,
  "isActive": true,
  "maxOrdersPerDay": 100,
  "createdAt": "2024-12-01T00:00:00Z",
  "updatedAt": "2025-01-15T10:00:00Z"
}
```

#### Index:
```javascript
db.pickupPoints.createIndex({ "city": 1 })
db.pickupPoints.createIndex({ "isActive": 1 })
db.pickupPoints.createIndex({ "latitude": 1, "longitude": 1 })
```

---

### 6. 💬 Collection: `messages`

Messages entre acheteurs et vendeurs.

#### Schéma:
```javascript
{
  _id: ObjectId,
  id: String,
  
  // Participants
  senderId: String,                 // ID expéditeur
  senderName: String,
  senderType: String,               // "buyer" | "seller"
  
  recipientId: String,              // ID destinataire
  recipientName: String,
  recipientType: String,
  
  // Contenu
  subject: String,                  // Sujet
  message: String,                  // Message
  
  // Référence produit (optionnel)
  productId: String,
  productName: String,
  
  // Statut
  read: Boolean,                    // Lu ou non
  replied: Boolean,                 // Répondu ou non
  
  // Dates
  sentDate: Date,
  readDate: Date,
  
  // Métadonnées
  createdAt: Date,
  updatedAt: Date
}
```

#### Index:
```javascript
db.messages.createIndex({ "senderId": 1 })
db.messages.createIndex({ "recipientId": 1 })
db.messages.createIndex({ "read": 1 })
db.messages.createIndex({ "sentDate": -1 })
```

---

### 7. ⭐ Collection: `reviews`

Avis et évaluations des produits.

#### Schéma:
```javascript
{
  _id: ObjectId,
  id: String,
  
  // Références
  productId: String,
  sellerId: String,
  buyerId: String,
  buyerName: String,
  orderId: String,                  // Commande liée
  
  // Évaluation
  rating: Number,                   // 1-5 étoiles
  title: String,                    // Titre de l'avis
  comment: String,                  // Commentaire
  
  // Médias
  images: Array,                    // Photos du produit
  
  // Statut
  verified: Boolean,                // Achat vérifié
  helpful: Number,                  // Nombre de "utile"
  
  // Réponse vendeur
  sellerReply: String,
  sellerReplyDate: Date,
  
  // Dates
  reviewDate: Date,
  createdAt: Date,
  updatedAt: Date
}
```

#### Index:
```javascript
db.reviews.createIndex({ "productId": 1 })
db.reviews.createIndex({ "sellerId": 1 })
db.reviews.createIndex({ "buyerId": 1 })
db.reviews.createIndex({ "rating": -1 })
```

---

## 🔧 Configuration MongoDB

### Connection String (Local):
```
mongodb://localhost:27017/nengoo
```

### Connection String (Production):
```
mongodb+srv://username:password@cluster.mongodb.net/nengoo?retryWrites=true&w=majority
```

### Variables d'environnement:
```bash
# Backend .env
MONGO_URL=mongodb://localhost:27017/nengoo
DB_NAME=nengoo
```

---

## 📊 Statistiques et Requêtes Utiles

### Nombre total d'utilisateurs:
```javascript
db.users.countDocuments()
```

### Revenus totaux:
```javascript
db.orders.aggregate([
  { $match: { status: "delivered" } },
  { $group: { _id: null, total: { $sum: "$total" } } }
])
```

### Produits les mieux notés:
```javascript
db.products.find({ status: "approved" })
  .sort({ rating: -1, reviews: -1 })
  .limit(10)
```

### Vendeurs en attente:
```javascript
db.sellers.find({ status: "pending" })
  .sort({ submitDate: 1 })
```

### Commandes actives:
```javascript
db.orders.countDocuments({ 
  status: { $in: ["processing", "in_transit"] } 
})
```

---

## 🔒 Sécurité

### Recommandations:
1. ✅ Activer l'authentification MongoDB
2. ✅ Utiliser des mots de passe forts
3. ✅ Limiter l'accès réseau (whitelist IPs)
4. ✅ Chiffrer les connexions (SSL/TLS)
5. ✅ Sauvegardes régulières (daily)
6. ✅ Masquer les données sensibles dans les logs

### Backup automatique:
```bash
# Backup quotidien
mongodump --uri="mongodb://localhost:27017/nengoo" --out=/backups/$(date +%Y%m%d)

# Restore
mongorestore --uri="mongodb://localhost:27017/nengoo" /backups/20250122
```

---

## 📈 Performances

### Optimisations:
1. Index sur les champs fréquemment recherchés
2. Pagination des résultats (limit + skip)
3. Projection des champs (ne récupérer que le nécessaire)
4. Connexion pooling
5. Caching (Redis) pour les données fréquentes

### Monitoring:
```javascript
// Statistiques des opérations
db.stats()

// Index non utilisés
db.products.aggregate([{ $indexStats: {} }])
```

---

### 8. 📍 Collection: `pickupPoints`

Points de retrait pour la livraison des commandes.

#### Schéma:
```javascript
{
  _id: ObjectId,                    // ID unique MongoDB
  id: String,                       // ID custom (UUID)
  name: String,                     // Nom du point de retrait
  
  // Localisation
  address: String,                  // Adresse complète
  city: String,                     // Ville
  region: String,                   // Région du Cameroun
  coordinates: {                    // Coordonnées GPS (optionnel)
    latitude: Number,
    longitude: Number
  },
  
  // Gestionnaire
  managerId: String,                // ID du gestionnaire
  managerName: String,              // Nom du gestionnaire
  managerWhatsApp: String,          // WhatsApp du gestionnaire
  managerEmail: String,             // Email du gestionnaire
  
  // Informations de contact
  phone: String,                    // Téléphone du point de retrait
  email: String,                    // Email du point de retrait
  
  // Détails opérationnels
  capacity: Number,                 // Capacité de stockage (nombre de colis)
  currentLoad: Number,              // Nombre de colis actuellement stockés
  hours: String,                    // Horaires d'ouverture (ex: "Lun-Sam: 8h-18h")
  description: String,              // Description du point de retrait
  
  // Statut
  status: String,                   // "pending" | "approved" | "rejected" | "suspended"
  verified: Boolean,                // Point de retrait vérifié
  
  // Statistiques
  totalOrders: Number,              // Nombre total de commandes traitées
  activeOrders: Number,             // Commandes en cours
  rating: Number,                   // Note moyenne (0-5)
  reviewsCount: Number,             // Nombre d'avis
  
  // Métadonnées
  createdDate: Date,
  approvedDate: Date,
  suspendedDate: Date,
  updatedAt: Date
}
```

#### Exemple:
```json
{
  "_id": "65abc...",
  "id": "pickup_001",
  "name": "Nengoo Point Douala Centre",
  "address": "Avenue de la Liberté, Akwa",
  "city": "Douala",
  "region": "Littoral",
  "coordinates": {
    "latitude": 4.0511,
    "longitude": 9.7679
  },
  "managerId": "manager_001",
  "managerName": "Jean Mbarga",
  "managerWhatsApp": "+237655888999",
  "managerEmail": "jean.mbarga@nengoo.cm",
  "phone": "+237 233 456 789",
  "email": "douala.centre@nengoo.cm",
  "capacity": 100,
  "currentLoad": 25,
  "hours": "Lun-Sam: 8h-18h, Dim: Fermé",
  "description": "Point de retrait principal situé au centre ville de Douala",
  "status": "approved",
  "verified": true,
  "totalOrders": 450,
  "activeOrders": 25,
  "rating": 4.7,
  "reviewsCount": 120,
  "createdDate": "2025-01-01T00:00:00Z",
  "approvedDate": "2025-01-02T10:30:00Z",
  "updatedAt": "2025-01-28T12:00:00Z"
}
```

#### Index recommandés:
```javascript
db.pickupPoints.createIndex({ id: 1 }, { unique: true })
db.pickupPoints.createIndex({ managerId: 1 })
db.pickupPoints.createIndex({ city: 1, status: 1 })
db.pickupPoints.createIndex({ status: 1 })
db.pickupPoints.createIndex({ createdDate: -1 })
```

---

### 9. 👨‍💼 Collection: `pickupManagers`

Gestionnaires des points de retrait.

#### Schéma:
```javascript
{
  _id: ObjectId,                    // ID unique MongoDB
  id: String,                       // ID custom (UUID)
  name: String,                     // Nom complet
  whatsapp: String,                 // Numéro WhatsApp (unique)
  email: String,                    // Email
  
  // Point de retrait géré
  pickupPointId: String,            // ID du point de retrait
  pickupPointName: String,          // Nom du point de retrait
  
  // Informations personnelles
  idCard: String,                   // Numéro de carte d'identité
  photo: String,                    // URL de la photo
  address: String,                  // Adresse personnelle
  
  // Type et rôle
  type: String,                     // "pickup_manager"
  role: String,                     // "manager" | "assistant_manager"
  
  // Permissions
  canApproveOrders: Boolean,        // Peut approuver les réceptions
  canContactCustomers: Boolean,     // Peut contacter les clients
  canModifyInventory: Boolean,      // Peut modifier l'inventaire
  
  // Statut
  status: String,                   // "active" | "suspended" | "pending"
  verified: Boolean,                // Compte vérifié
  
  // Statistiques
  ordersProcessed: Number,          // Commandes traitées
  performanceRating: Number,        // Note de performance (0-5)
  
  // Métadonnées
  joinDate: Date,
  lastLogin: Date,
  createdAt: Date,
  updatedAt: Date
}
```

#### Exemple:
```json
{
  "_id": "65def...",
  "id": "manager_001",
  "name": "Jean Mbarga",
  "whatsapp": "+237655888999",
  "email": "jean.mbarga@nengoo.cm",
  "pickupPointId": "pickup_001",
  "pickupPointName": "Nengoo Point Douala Centre",
  "idCard": "CM-DLA-123456",
  "photo": "https://example.com/managers/jean_mbarga.jpg",
  "address": "Quartier Bonanjo, Douala",
  "type": "pickup_manager",
  "role": "manager",
  "canApproveOrders": true,
  "canContactCustomers": true,
  "canModifyInventory": true,
  "status": "active",
  "verified": true,
  "ordersProcessed": 450,
  "performanceRating": 4.8,
  "joinDate": "2025-01-01T00:00:00Z",
  "lastLogin": "2025-01-28T09:30:00Z",
  "createdAt": "2025-01-01T00:00:00Z",
  "updatedAt": "2025-01-28T09:30:00Z"
}
```

#### Index recommandés:
```javascript
db.pickupManagers.createIndex({ id: 1 }, { unique: true })
db.pickupManagers.createIndex({ whatsapp: 1 }, { unique: true })
db.pickupManagers.createIndex({ pickupPointId: 1 })
db.pickupManagers.createIndex({ email: 1 })
db.pickupManagers.createIndex({ status: 1 })
```

---

### 🔄 Modification: Collection `orders`

Ajout des champs pour la gestion des points de retrait:

#### Nouveaux champs:
```javascript
{
  // ... champs existants ...
  
  // Point de retrait
  pickupPointId: String,            // ID du point de retrait choisi
  pickupPointName: String,          // Nom du point de retrait
  pickupPointAddress: String,       // Adresse du point de retrait
  pickupPointPhone: String,         // Téléphone du point de retrait
  
  // Statut de livraison au point de retrait
  pickupStatus: String,             // "ordered" | "in_transit" | "at_pickup_point" | "collected" | "cancelled"
  
  // Dates importantes
  orderedDate: Date,                // Date de commande
  shippedDate: Date,                // Date d'expédition
  arrivedAtPickupDate: Date,        // Date d'arrivée au point de retrait
  collectedDate: Date,              // Date de récupération par le client
  
  // Notifications WhatsApp
  notificationsSent: {
    toSeller: Boolean,              // Notification envoyée au vendeur
    toPickupManager: Boolean,       // Notification envoyée au gestionnaire
    toCustomer: Boolean,            // Notification envoyée au client
    arrivedNotification: Boolean    // Notification d'arrivée envoyée
  },
  
  // Gestionnaire
  pickupManagerId: String,          // ID du gestionnaire qui a validé
  pickupManagerName: String,        // Nom du gestionnaire
  receivedBy: String,               // Nom de la personne qui a réceptionné
  
  // Métadonnées
  pickupNotes: String               // Notes du gestionnaire
}
```

---

## 🎯 Résumé

| Collection | Documents estimés | Taille moyenne |
|------------|------------------|----------------|
| users | 1,250+ | ~2KB |
| sellers | 45+ | ~3KB |
| products | 389+ | ~5KB |
| orders | 567+ | ~5KB |
| pickupPoints | 20-50 | ~2KB |
| pickupManagers | 20-50 | ~2KB |
| messages | Variable | ~2KB |
| reviews | Variable | ~3KB |

**Base de données totale estimée: ~5-10MB (développement)**
**Production: 50-500MB selon le trafic**

---

✅ **La structure de base de données est complète et prête pour la production!**
