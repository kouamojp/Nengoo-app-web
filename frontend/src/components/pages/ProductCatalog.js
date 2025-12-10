import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { translations } from '../../lib/translations';
import Header from '../layout/Header';
import Footer from '../layout/Footer';
import ProductCard from '../product/ProductCard';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://127.0.0.1:8001/api';

const ProductCatalog = (props) => {
  const { language, addToCart } = props;
  const { category } = useParams();
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const [sortBy, setSortBy] = useState('recent');
  const [maxAllowedPrice, setMaxAllowedPrice] = useState(2000000); // Default max price
  const [priceRange, setPriceRange] = useState([0, 2000000]); // Initialized with default max
  const [selectedCategory, setSelectedCategory] = useState(category || 'all');
  const productListRef = useRef(null);

  const t = translations[language];

  useEffect(() => {
    if (window.innerWidth < 1024 && productListRef.current && selectedCategory !== 'all') {
      productListRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [selectedCategory]);

  useEffect(() => {
    const fetchMaxPrice = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/products/max-price`);

        if (!response.ok) {
          throw new Error(`API responded with status: ${response.status}`);
        }

        const data = await response.json();

        if (data && typeof data.maxPrice === 'number' && data.maxPrice > 0) {
          const fetchedMaxPrice = Math.ceil(data.maxPrice / 1000) * 1000;
          setMaxAllowedPrice(fetchedMaxPrice);
          setPriceRange([0, fetchedMaxPrice]);
        } else {
          setMaxAllowedPrice(2000000);
          setPriceRange([0, 2000000]);
        }

      } catch (error) {
        console.error("❌ [ProductCatalog] Critical error during fetchMaxPrice:", error);
      }
    };
    fetchMaxPrice();
  }, []);

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        setCategoriesLoading(true);
        const response = await fetch(`${API_BASE_URL}/categories`);

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        setCategories(data);
      } catch (error) {
        console.error("❌ [ProductCatalog] Erreur lors de la récupération des catégories:", error);
        setCategories([]);
      } finally {
        setCategoriesLoading(false);
      }
    };

    fetchCategories();
  }, []);

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        setLoading(true);
        const response = await fetch(`${API_BASE_URL}/products`);

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();

        // Trier les produits par date de mise à jour (du plus récent au plus ancien)
        const sortedData = data.sort((a, b) => {
          // Utiliser 0 comme fallback si updatedAt est null ou undefined
          const dateA = a.updatedAt ? new Date(a.updatedAt) : new Date(0);
          const dateB = b.updatedAt ? new Date(b.updatedAt) : new Date(0);
          return dateB - dateA;
        });

        // Adapt backend data to frontend component structure
        const adaptedProducts = sortedData.map(p => ({
          ...p,
          name: { [language]: p.name }, // Adapt name to be an object
          image: p.images && p.images.length > 0 ? p.images[0] : process.env.PUBLIC_URL + '/images/logo-nengoo.png', // Use first image
          inStock: p.stock > 0,
          reviews: p.reviewsCount || 0,
          rating: p.rating || 0,
          // sellerWhatsApp is missing, will be handled later
        }));

        setProducts(adaptedProducts);
      } catch (error) {
        console.error("❌ Erreur lors de la récupération des produits:", error);
        alert("Erreur: Impossible de charger les produits. Vérifiez que le backend est lancé et accessible.");
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, [language]);
  
  let filteredProducts = products;
  
  if (selectedCategory && selectedCategory !== 'all') {
    filteredProducts = filteredProducts.filter(p => p.category === selectedCategory);
  }
  
  filteredProducts = filteredProducts.filter(p => p.price >= priceRange[0] && p.price <= priceRange[1]);
  
  filteredProducts.sort((a, b) => {
    switch (sortBy) {
      case 'recent':
        // Utiliser 0 comme fallback si updatedAt est null ou undefined
        const dateA = a.updatedAt ? new Date(a.updatedAt) : new Date(0);
        const dateB = b.updatedAt ? new Date(b.updatedAt) : new Date(0);
        return dateB - dateA;
      case 'price-low': return a.price - b.price;
      case 'price-high': return b.price - a.price;
      case 'rating': return b.rating - a.rating;
      case 'reviews': return b.reviews - a.reviews;
      default:
        if (a.name[language] && b.name[language]) {
            return a.name[language].localeCompare(b.name[language]);
        }
        return 0;
    }
  });

  // Préparer les catégories pour le filtre (ajouter "Tous" au début)
  const allCategoriesFilter = [
    { id: 'all', name: 'Tous' },
    ...categories
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <Header {...props} />
      
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Filters Sidebar */}
          <div className="lg:w-1/4">
            <div className="bg-white rounded-lg shadow-md p-6 sticky top-24">
              <h3 className="text-xl font-bold mb-6 text-left">Filtres</h3>
              
              {/* Category Filter */}
              <div className="mb-6 text-left">
                <h4 className="font-semibold mb-3">
                  {t.categories}
                  {!categoriesLoading && categories.length > 0 && (
                    <span className="text-gray-500 text-sm ml-2">({categories.length})</span>
                  )}
                </h4>
                <div className="space-y-2">
                  {categoriesLoading ? (
                    <div className="text-center py-4">
                      <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-purple-700"></div>
                    </div>
                  ) : allCategoriesFilter.length > 1 ? (
                    allCategoriesFilter.map(cat => (
                      <label key={cat.id} className="flex items-center cursor-pointer hover:bg-gray-50 p-2 rounded">
                        <input
                          type="radio"
                          name="category"
                          value={cat.id === 'all' ? 'all' : cat.name}
                          checked={selectedCategory === (cat.id === 'all' ? 'all' : cat.name)}
                          onChange={(e) => setSelectedCategory(e.target.value)}
                          className="mr-2"
                        />
                        <span className="text-sm">{cat.name}</span>
                      </label>
                    ))
                  ) : (
                    <p className="text-sm text-gray-500">Aucune catégorie disponible</p>
                  )}
                </div>
              </div>
              
              {/* Price Range */}
              <div className="mb-6">
                <h4 className="font-semibold mb-3">Prix (XAF)</h4>
                <div className="space-y-2">
                  <input
                    type="range"
                    min="0"
                    max={maxAllowedPrice}
                    step="1000" // Adjusted step for more granularity if max price is high
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
          <div className="lg:w-3/4" ref={productListRef}>
            {/* Sort Options */}
            <div className="bg-white rounded-lg shadow-md p-4 mb-6">
              <div className="flex flex-col sm:flex-row justify-between items-center">
                <div>
                  <h2 className="text-2xl font-bold">
                    {selectedCategory === 'all' ? 'Tous les produits' : selectedCategory}
                    <span className="text-gray-500 ml-2">({filteredProducts.length})</span>
                  </h2>
                  {products.length !== filteredProducts.length && (
                    <p className="text-sm text-gray-500 mt-1">
                      {filteredProducts.length} sur {products.length} produits affichés
                    </p>
                  )}
                  {products.length === 0 && !loading && (
                    <p className="text-sm text-orange-600 mt-1">
                      ⚠️ Aucun produit dans la base de données
                    </p>
                  )}
                </div>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500 mt-4 sm:mt-0"
                >
                  <option value="recent">Plus récents</option>
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
                <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-purple-700 mb-4"></div>
                <p className="text-lg text-gray-600">Chargement des produits...</p>
              </div>
            ) : products.length === 0 ? (
              <div className="text-center py-16 bg-white rounded-lg shadow-md">
                <div className="text-6xl mb-4">📦</div>
                <h3 className="text-xl font-semibold mb-2">Aucun produit enregistré</h3>
                <p className="text-gray-600 mb-4">La base de données ne contient aucun produit pour le moment.</p>
                <p className="text-sm text-gray-500">Conseil: Allez dans le panneau d'administration pour ajouter des produits.</p>
              </div>
            ) : filteredProducts.length > 0 ? (
              <div className="grid grid-cols-2 xl:grid-cols-3 gap-6">
                {filteredProducts.map(product => (
                  <ProductCard key={product.id} product={product} language={language} addToCart={addToCart} />
                ))}
              </div>
            ) : (
              <div className="text-center py-12 px-4 bg-white rounded-lg shadow-md">
                <div className="text-6xl mb-4">🔍</div>
                <h3 className="text-xl font-semibold mb-2">Aucun produit trouvé</h3>
                <p className="text-gray-600 mb-4">Aucun produit ne correspond à vos critères de recherche.</p>
                <p className="text-sm text-gray-500">
                  {products.length} produit(s) disponible(s) - Essayez d'ajuster vos filtres ou explorez d'autres catégories.
                </p>
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
