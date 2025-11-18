# Guide d'utilisation des APIs Publiques

Ce document explique comment utiliser les nouvelles APIs publiques pour afficher les produits et catégories côté frontend.

## Endpoints Publics Disponibles

### 1. Récupérer toutes les catégories
```javascript
import { getPublicCategories } from '../services/api';

const categories = await getPublicCategories();
```

**Réponse:**
```json
[
  {
    "id": "...",
    "name": "Fruits et légumes",
    "description": "...",
    "icon": "🍎",
    "createdDate": "..."
  }
]
```

---

### 2. Récupérer tous les produits (avec filtres optionnels)
```javascript
import { getPublicProducts } from '../services/api';

// Sans filtres (tous les produits actifs)
const products = await getPublicProducts();

// Avec filtres
const products = await getPublicProducts({
  category: 'Fruits et légumes',  // Filtrer par catégorie
  search: 'tomate',                // Recherche dans nom et description
  sellerId: '...',                 // Filtrer par vendeur
  limit: 20,                       // Limite de résultats (défaut: 100)
  skip: 0                          // Pagination (défaut: 0)
});
```

**Réponse:**
```json
[
  {
    "id": "...",
    "name": "Tomates fraîches",
    "description": "...",
    "price": 1500,
    "category": "Fruits et légumes",
    "sellerId": "...",
    "images": ["/uploads/products/xxx.jpg", "/uploads/products/yyy.jpg"],
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
]
```

---

### 3. Récupérer un produit spécifique
```javascript
import { getPublicProduct } from '../services/api';

const product = await getPublicProduct(productId);
```

**Réponse:** Même structure que ci-dessus mais pour un seul produit.

---

### 4. Récupérer tous les produits d'un vendeur
```javascript
import { getSellerProducts } from '../services/api';

const data = await getSellerProducts(sellerId);
```

**Réponse:**
```json
{
  "seller": {
    "id": "...",
    "businessName": "Marché de Sandaga",
    "name": "Amadou Diallo",
    "city": "Dakar",
    "categories": ["Fruits et légumes", "Épices"]
  },
  "products": [...],
  "count": 15
}
```

---

## Exemple de composant React complet

```javascript
import React, { useState, useEffect } from 'react';
import { getPublicProducts, getPublicCategories } from '../services/api';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:8001/api';

export const ProductList = () => {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);

  // Charger les catégories au montage
  useEffect(() => {
    loadCategories();
  }, []);

  // Recharger les produits quand les filtres changent
  useEffect(() => {
    loadProducts();
  }, [selectedCategory, searchTerm]);

  const loadCategories = async () => {
    try {
      const data = await getPublicCategories();
      setCategories(data);
    } catch (error) {
      console.error('Erreur:', error);
    }
  };

  const loadProducts = async () => {
    setLoading(true);
    try {
      const filters = {};
      if (selectedCategory) filters.category = selectedCategory;
      if (searchTerm) filters.search = searchTerm;

      const data = await getPublicProducts(filters);
      setProducts(data);
    } catch (error) {
      console.error('Erreur:', error);
    } finally {
      setLoading(false);
    }
  };

  const getImageUrl = (imagePath) => {
    return `${API_BASE_URL.replace('/api', '')}${imagePath}`;
  };

  return (
    <div>
      {/* Filtres */}
      <div className="mb-6">
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Rechercher un produit..."
          className="border px-4 py-2 rounded"
        />

        <select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          className="border px-4 py-2 rounded ml-4"
        >
          <option value="">Toutes les catégories</option>
          {categories.map(cat => (
            <option key={cat.id} value={cat.name}>
              {cat.icon} {cat.name}
            </option>
          ))}
        </select>
      </div>

      {/* Liste des produits */}
      {loading ? (
        <p>Chargement...</p>
      ) : (
        <div className="grid grid-cols-3 gap-4">
          {products.map(product => (
            <div key={product.id} className="border rounded p-4">
              {/* Image */}
              {product.images && product.images.length > 0 && (
                <img
                  src={getImageUrl(product.images[0])}
                  alt={product.name}
                  className="w-full h-48 object-cover rounded mb-4"
                />
              )}

              {/* Informations */}
              <h3 className="font-bold text-lg">{product.name}</h3>
              <p className="text-gray-600 text-sm mb-2">{product.description}</p>

              <div className="flex justify-between items-center">
                <span className="text-xl font-bold text-purple-600">
                  {product.price} FCFA
                </span>
                <span className="text-sm text-gray-500">
                  par {product.unit}
                </span>
              </div>

              {/* Vendeur */}
              {product.seller && (
                <div className="mt-3 pt-3 border-t">
                  <p className="text-sm text-gray-600">
                    Vendeur: {product.seller.businessName}
                  </p>
                  <p className="text-sm text-gray-500">{product.seller.city}</p>
                </div>
              )}

              {/* Bouton contact */}
              <button
                onClick={() => {
                  const msg = encodeURIComponent(`Bonjour, je suis intéressé par: ${product.name}`);
                  window.open(`https://wa.me/${product.seller.whatsapp}?text=${msg}`, '_blank');
                }}
                className="w-full mt-4 bg-green-500 text-white py-2 rounded hover:bg-green-600"
              >
                Contacter via WhatsApp
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
```

---

## Affichage des images

Les images sont stockées localement sur le serveur. Pour les afficher:

```javascript
const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:8001/api';

const getImageUrl = (imagePath) => {
  // imagePath vient de l'API: "/uploads/products/xxx.jpg"
  return `${API_BASE_URL.replace('/api', '')}${imagePath}`;
};

// Utilisation dans JSX
<img src={getImageUrl(product.images[0])} alt={product.name} />
```

---

## Contact vendeur via WhatsApp

```javascript
const handleContactSeller = (whatsapp, productName) => {
  const message = encodeURIComponent(`Bonjour, je suis intéressé par votre produit: ${productName}`);
  const url = `https://wa.me/${whatsapp}?text=${message}`;
  window.open(url, '_blank');
};
```

---

## Points importants

1. **Aucune authentification requise** - Ces endpoints sont publics
2. **Seuls les produits actifs** - Seuls les produits avec `status: "active"` sont retournés
3. **Informations vendeur incluses** - Chaque produit inclut automatiquement les infos du vendeur
4. **Images locales** - Les images sont servies depuis le backend via `/uploads/`
5. **Pagination disponible** - Utilisez `limit` et `skip` pour paginer les résultats

---

## Exemple d'intégration dans le composant existant

Pour modifier le `ProductCatalog.js` existant afin d'utiliser les vraies données:

1. Remplacer les imports:
```javascript
import { getPublicProducts, getPublicCategories } from '../services/api';
```

2. Remplacer `mockProducts` par un appel API:
```javascript
useEffect(() => {
  loadRealProducts();
}, [selectedCategory, priceRange, sortBy]);

const loadRealProducts = async () => {
  try {
    const filters = {};
    if (selectedCategory !== 'all') {
      filters.category = selectedCategory;
    }
    const data = await getPublicProducts(filters);
    // Filtrer par prix localement
    const filtered = data.filter(p =>
      p.price >= priceRange[0] && p.price <= priceRange[1]
    );
    setProducts(filtered);
  } catch (error) {
    console.error('Erreur:', error);
  }
};
```

3. Charger les vraies catégories:
```javascript
useEffect(() => {
  loadRealCategories();
}, []);

const loadRealCategories = async () => {
  try {
    const data = await getPublicCategories();
    setCategories([
      { id: 'all', name: 'Tous', icon: '' },
      ...data
    ]);
  } catch (error) {
    console.error('Erreur:', error);
  }
};
```
