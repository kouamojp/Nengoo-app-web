# Guide - Affichage des Produits en Frontend

## ✅ Ce qui a été fait

### 1. **Endpoints Backend Publics**
Les produits créés par l'admin et les vendeurs sont maintenant accessibles publiquement via :

- `GET /api/products` - Tous les produits actifs
- `GET /api/products/{id}` - Un produit spécifique
- `GET /api/categories` - Toutes les catégories
- `GET /api/sellers/{id}/products` - Produits d'un vendeur

### 2. **Endpoints Backend pour Vendeurs**
Les vendeurs peuvent maintenant gérer leurs propres produits :

- `GET /api/seller/products` - Mes produits
- `POST /api/seller/products` - Créer un produit
- `PUT /api/seller/products/{id}` - Modifier mon produit
- `DELETE /api/seller/products/{id}` - Supprimer mon produit

### 3. **ProductCatalog Modifié**
Le composant `ProductCatalog.js` a été modifié pour :

- ✅ Charger les vraies données depuis l'API (au lieu des données mockées)
- ✅ Afficher les catégories créées par l'admin
- ✅ Afficher les produits créés par l'admin ET les vendeurs
- ✅ Filtrer par catégorie
- ✅ Filtrer par prix
- ✅ Afficher les images uploadées localement
- ✅ Indicateur de chargement
- ✅ Bouton WhatsApp pour contacter le vendeur

---

## 📊 Comment ça fonctionne

### Flow de création de produit

**Par l'Admin:**
1. Admin se connecte
2. Va dans "Gestion des Produits"
3. Clique sur "+ Ajouter un produit"
4. Remplit le formulaire avec images
5. Le produit est créé avec `status: "active"`
6. **Le produit apparaît immédiatement dans le catalogue frontend**

**Par un Vendeur:**
1. Vendeur s'inscrit (status: "pending")
2. Admin approuve le vendeur (status: "approved")
3. Vendeur se connecte
4. Crée un produit via `POST /api/seller/products`
5. Le produit est créé avec `status: "active"`
6. **Le produit apparaît immédiatement dans le catalogue frontend**

### Flow d'affichage frontend

1. L'utilisateur visite la page catalogue
2. `ProductCatalog` appelle `getPublicProducts()`
3. L'API retourne TOUS les produits avec `status: "active"`
   - Peu importe qui les a créés (admin ou vendeur)
4. Les produits sont affichés avec:
   - Images (depuis `/uploads/products/`)
   - Prix, stock, description
   - Informations du vendeur
   - Bouton WhatsApp

---

## 🎨 Structure des Données

### Produit retourné par l'API
```json
{
  "id": "...",
  "name": "Tomates fraîches",
  "description": "Tomates bio de qualité",
  "price": 1500,
  "category": "Fruits et légumes",
  "images": [
    "/uploads/products/abc123.jpg",
    "/uploads/products/def456.jpg"
  ],
  "stock": 100,
  "unit": "kg",
  "status": "active",
  "seller": {
    "id": "...",
    "businessName": "Marché de Sandaga",
    "name": "Amadou Diallo",
    "city": "Dakar",
    "whatsapp": "+221 77 123 45 67"
  }
}
```

### Produit adapté pour ProductCard
```javascript
{
  id: product.id,
  name: {
    fr: product.name,
    en: product.name
  },
  category: product.category,
  price: product.price,
  image: 'http://localhost:8001/uploads/products/abc123.jpg',
  rating: 4.5,
  reviews: 0,
  inStock: true,
  sellerWhatsApp: '+221 77 123 45 67',
  description: product.description,
  unit: product.unit,
  stock: product.stock,
  seller: { ... }
}
```

---

## 🚀 Utilisation

### Pour afficher tous les produits
```javascript
import { getPublicProducts } from '../services/api';

const products = await getPublicProducts();
// Retourne TOUS les produits actifs (admin + vendeurs)
```

### Avec filtres
```javascript
const products = await getPublicProducts({
  category: 'Fruits et légumes',
  search: 'tomate',
  limit: 20,
  skip: 0
});
```

### Pour un vendeur qui crée un produit
```javascript
import { createProductBySeller } from '../services/api';

const newProduct = await createProductBySeller({
  name: 'Mon produit',
  description: '...',
  price: 1000,
  category: 'Fruits et légumes',
  images: ['/uploads/products/xxx.jpg'],
  stock: 50,
  unit: 'kg'
});
// Note: pas besoin de sellerId, il est automatiquement pris depuis le token
```

---

## 🔐 Sécurité et Permissions

### Endpoints Publics (pas d'auth)
- ✅ `/api/products` - Tout le monde peut voir
- ✅ `/api/products/{id}` - Tout le monde peut voir
- ✅ `/api/categories` - Tout le monde peut voir

### Endpoints Vendeurs (auth requise, type: "seller")
- 🔒 `/api/seller/products` - Voir MES produits
- 🔒 `POST /api/seller/products` - Créer un produit (sellerId auto)
- 🔒 `PUT /api/seller/products/{id}` - Modifier MON produit uniquement
- 🔒 `DELETE /api/seller/products/{id}` - Supprimer MON produit uniquement

### Endpoints Admin (auth requise, type: "admin")
- 🔒 `/api/admin/products` - Voir TOUS les produits
- 🔒 `POST /api/admin/products` - Créer un produit pour N'IMPORTE QUEL vendeur
- 🔒 `PUT /api/admin/products/{id}` - Modifier N'IMPORTE QUEL produit
- 🔒 `DELETE /api/admin/products/{id}` - Supprimer N'IMPORTE QUEL produit

---

## 📝 Exemple Complet

### Scénario: Admin ajoute un produit

1. **Admin crée le produit:**
```javascript
// Dans AdminProducts.js
await createProduct({
  name: 'Mangues',
  description: 'Mangues juteuses',
  price: 2000,
  category: 'Fruits et légumes',
  sellerId: '12345', // ID du vendeur sélectionné
  images: ['/uploads/products/mango1.jpg'],
  stock: 200,
  unit: 'kg'
});
```

2. **Le produit est sauvegardé avec:**
```json
{
  "name": "Mangues",
  "status": "active",
  "sellerId": "12345",
  ...
}
```

3. **Le frontend récupère automatiquement:**
```javascript
// Dans ProductCatalog.js
const products = await getPublicProducts();
// Le produit "Mangues" est dans la liste!
```

---

### Scénario: Vendeur ajoute un produit

1. **Vendeur crée le produit:**
```javascript
// Dans un futur composant SellerProducts.js
await createProductBySeller({
  name: 'Bananes plantain',
  description: 'Fraîches du jour',
  price: 1500,
  category: 'Fruits et légumes',
  images: ['/uploads/products/banana1.jpg'],
  stock: 150,
  unit: 'kg'
});
// Note: sellerId automatique depuis le token
```

2. **Le produit est sauvegardé avec:**
```json
{
  "name": "Bananes plantain",
  "status": "active",
  "sellerId": "vendeur_token_id",
  ...
}
```

3. **Le frontend récupère automatiquement:**
```javascript
const products = await getPublicProducts();
// Le produit "Bananes plantain" est dans la liste!
```

---

## ✨ Points Importants

1. **Tous les produits actifs sont publics** - Peu importe qui les a créés
2. **Les vendeurs ne peuvent modifier que LEURS produits**
3. **L'admin peut tout modifier**
4. **Les images sont servies localement** via `/uploads/products/`
5. **Le catalogue est rechargé automatiquement** quand on change de catégorie
6. **Le bouton WhatsApp** utilise les infos du vendeur incluses dans chaque produit

---

## 🎯 Prochaines Étapes Possibles

Si vous voulez ajouter une interface pour les vendeurs:

1. Créer un composant `SellerProducts.js` (similaire à `AdminProducts.js`)
2. Utiliser les fonctions:
   - `getSellerOwnProducts()` - Voir mes produits
   - `createProductBySeller()` - Créer
   - `updateSellerProduct()` - Modifier
   - `deleteSellerProduct()` - Supprimer
3. Ajouter dans le routing
4. Le vendeur pourra gérer ses produits depuis son interface

---

## 🔍 Tests

Pour tester que tout fonctionne:

1. **Créer des catégories en admin** (ex: "Fruits et légumes", "Électronique")
2. **Approuver un vendeur en admin**
3. **Créer des produits en admin** avec des images
4. **Aller sur le catalogue frontend** - Les produits doivent apparaître
5. **Filtrer par catégorie** - Le filtre doit fonctionner
6. **Cliquer sur WhatsApp** - Doit ouvrir WhatsApp avec le bon numéro

---

## ✅ Résumé

**Avant:**
- ❌ Données mockées (fausses)
- ❌ Catégories hardcodées
- ❌ Pas de vraies images

**Maintenant:**
- ✅ Vraies données depuis MongoDB
- ✅ Catégories dynamiques (créées par admin)
- ✅ Produits créés par admin ET vendeurs
- ✅ Images uploadées localement
- ✅ Contact vendeur via WhatsApp
- ✅ Filtres fonctionnels

Tous les produits enregistrés en admin et par les vendeurs s'affichent maintenant correctement dans le frontend! 🎉
