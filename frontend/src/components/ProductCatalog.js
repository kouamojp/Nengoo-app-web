
import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { translations, getImageUrl } from './common';
import Header from './Header';
import Footer from './Footer';
import ProductCard from './ProductCard';
import { getPublicProducts, getPublicCategories } from '../services/api';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:8001/api';

// Product Catalog Component
export const ProductCatalog = (props) => {
  const { language, addToCart } = props;
  const { category } = useParams();
  const [sortBy, setSortBy] = useState('name');
  const [priceRange, setPriceRange] = useState([0, 200000]);
  const [selectedCategory, setSelectedCategory] = useState(category || 'all');
  const [realProducts, setRealProducts] = useState([]);
  const [realCategories, setRealCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  const t = translations[language];

  // Charger les catégories au montage
  useEffect(() => {
    loadCategories();
  }, []);

  // Charger les produits quand les filtres changent
  useEffect(() => {
    loadProducts();
  }, [selectedCategory]);

  const loadCategories = async () => {
    try {
      const data = await getPublicCategories();
      setRealCategories(data);
    } catch (error) {
      console.error('Error loading categories:', error);
    }
  };

  const loadProducts = async () => {
    setLoading(true);
    try {
      const filters = {};
      if (selectedCategory && selectedCategory !== 'all') {
        filters.category = selectedCategory;
      }

      const data = await getPublicProducts(filters);

      // Adapter les données de l'API pour le format attendu par ProductCard
      const adaptedProducts = data.map(product => ({
        id: product.id,
        name: {
          fr: product.name,
          en: product.name
        },
        category: product.category,
        price: product.price,
        image: product.images && product.images.length > 0
          ? getImageUrl(product.images[0])
          : '/placeholder-product.jpg',
        rating: 4.5, // Valeur par défaut
        reviews: 0,  // Valeur par défaut
        inStock: product.stock > 0,
        sellerWhatsApp: product.seller?.whatsapp || '',
        description: product.description,
        unit: product.unit,
        stock: product.stock,
        seller: product.seller
      }));

      setRealProducts(adaptedProducts);
    } catch (error) {
      console.error('Error loading products:', error);
    } finally {
      setLoading(false);
    }
  };

  let filteredProducts = realProducts;
  
  if (selectedCategory && selectedCategory !== 'all') {
    filteredProducts = filteredProducts.filter(p => p.category === selectedCategory);
  }
  
  filteredProducts = filteredProducts.filter(p => p.price >= priceRange[0] && p.price <= priceRange[1]);
  
  filteredProducts.sort((a, b) => {
    switch (sortBy) {
      case 'price-low': return a.price - b.price;
      case 'price-high': return b.price - a.price;
      case 'rating': return b.rating - a.rating;
      case 'reviews': return b.reviews - a.reviews;
      default: return a.name[language].localeCompare(b.name[language]);
    }
  });

  // Préparer les catégories avec "Tous" au début
  const categories = [
    { key: 'all', name: { fr: 'Tous', en: 'All' }, icon: '' },
    ...realCategories.map(cat => ({
      key: cat.name,
      name: { fr: cat.name, en: cat.name },
      icon: cat.icon || ''
    }))
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <Header {...props} />
      
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Filters Sidebar */}
          <div className="lg:w-1/4">
            <div className="bg-white rounded-lg shadow-md p-6 sticky top-24">
              <h3 className="text-xl font-bold mb-6">Filtres</h3>
              
              {/* Category Filter */}
              <div className="mb-6">
                <h4 className="font-semibold mb-3">{t.categories}</h4>
                <div className="space-y-2">
                  {categories.map(cat => (
                    <label key={cat.key} className="flex items-center cursor-pointer hover:bg-gray-50 p-2 rounded">
                      <input
                        type="radio"
                        name="category"
                        value={cat.key}
                        checked={selectedCategory === cat.key}
                        onChange={(e) => setSelectedCategory(e.target.value)}
                        className="mr-2"
                      />
                      {cat.icon && <span className="mr-2">{cat.icon}</span>}
                      {cat.name[language]}
                    </label>
                  ))}
                </div>
              </div>
              
              {/* Price Range */}
              <div className="mb-6">
                <h4 className="font-semibold mb-3">Prix (XAF)</h4>
                <div className="space-y-2">
                  <input
                    type="range"
                    min="0"
                    max="200000"
                    step="5000"
                    value={priceRange[1]}
                    onChange={(e) => setPriceRange([0, parseInt(e.target.value)])}
                    className="w-full"
                  />
                  <div className="flex justify-between text-sm text-gray-600">
                    <span>0 XAF</span>
                    <span>{priceRange[1].toLocaleString()} XAF</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          {/* Products Grid */}
          <div className="lg:w-3/4">
            {/* Sort Options */}
            <div className="bg-white rounded-lg shadow-md p-4 mb-6">
              <div className="flex flex-col sm:flex-row justify-between items-center">
                <h2 className="text-2xl font-bold mb-4 sm:mb-0">
                  {selectedCategory === 'all' ? 'Tous les produits' : t[selectedCategory]} 
                  <span className="text-gray-500 ml-2">({filteredProducts.length})</span>
                </h2>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  <option value="name">Trier par nom</option>
                  <option value="price-low">Prix: Bas → Haut</option>
                  <option value="price-high">Prix: Haut → Bas</option>
                  <option value="rating">Meilleure note</option>
                  <option value="reviews">Plus d'avis</option>
                </select>
              </div>
            </div>
            
            {/* Products Grid */}
            {loading ? (
              <div className="text-center py-16">
                <div className="text-6xl mb-4">⏳</div>
                <h3 className="text-xl font-semibold mb-2">Chargement des produits...</h3>
                <p className="text-gray-600">Veuillez patienter</p>
              </div>
            ) : filteredProducts.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredProducts.map(product => (
                  <ProductCard key={product.id} product={product} language={language} addToCart={addToCart} />
                ))}
              </div>
            ) : (
              <div className="text-center py-16">
                <div className="text-6xl mb-4">🔍</div>
                <h3 className="text-xl font-semibold mb-2">Aucun produit trouvé</h3>
                <p className="text-gray-600">Essayez d'ajuster vos filtres ou explorez d'autres catégories.</p>
              </div>
            )}
          </div>
        </div>
      </div>
      
      <Footer language={language} />
    </div>
  );
};

export default ProductCatalog;
