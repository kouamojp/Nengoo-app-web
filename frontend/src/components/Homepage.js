
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { translations, getImageUrl } from './common';
import Header from './Header';
import Footer from './Footer';
import ProductCard from './ProductCard';
import PWAInstallPrompt from './PWAInstallPrompt';
import { getPublicProducts, getPublicCategories } from '../services/api';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:8001/api';

// Homepage Component
export const Homepage = (props) => {
  const { language, addToCart } = props;
  const t = translations[language];

  const [allProducts, setAllProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [productsData, categoriesData] = await Promise.all([
        getPublicProducts({ limit: 50 }),
        getPublicCategories()
      ]);

      // Adapter les données pour ProductCard
      const adaptedProducts = productsData.map(product => ({
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
        rating: 4.5,
        reviews: 0,
        inStock: product.stock > 0,
        sellerWhatsApp: product.seller?.whatsapp || '',
        description: product.description,
        unit: product.unit,
        stock: product.stock,
        seller: product.seller
      }));

      setAllProducts(adaptedProducts);
      setCategories(categoriesData);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const featuredProducts = allProducts.slice(0, 8);
  const recentProducts = allProducts.slice(0, 6);

  return (
    <div className="min-h-screen bg-gray-50">
      <Header {...props} />
      
      {/* PWA Install Prompt */}
      <PWAInstallPrompt />
      
      {/* Hero Section */}
      <section className="relative bg-gradient-to-r from-purple-600 to-red-600 text-white">
        <div className="container mx-auto px-4 py-12 sm:py-20">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-center">
            <div className="text-center lg:text-left">
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-4 lg:mb-6">{t.welcome}</h1>
              <p className="text-lg sm:text-xl mb-6 lg:mb-8 opacity-90">{t.subtitle}</p>
              <div className="flex flex-col sm:flex-row space-y-4 sm:space-y-0 sm:space-x-4 justify-center lg:justify-start">
                <Link to="/catalog" className="bg-white text-purple-600 hover:bg-gray-100 px-6 sm:px-8 py-3 rounded-lg font-semibold transition-colors text-center">
                  {t.viewAll} 🛍️
                </Link>
                <Link to="/catalog/handicrafts" className="border-2 border-white hover:bg-white hover:text-purple-600 px-6 sm:px-8 py-3 rounded-lg font-semibold transition-colors text-center">
                  {t.localSpecialties} 🎨
                </Link>
              </div>
            </div>
            <div className="relative order-first lg:order-last">
              <img
                src="https://images.unsplash.com/photo-1550041499-4c5857d2b508"
                alt="Hero"
                className="rounded-lg shadow-2xl w-full max-w-md mx-auto lg:max-w-full"
              />
              <div className="absolute -bottom-4 -left-4 bg-yellow-400 text-black p-3 sm:p-4 rounded-lg font-bold text-center">
                {t.flashSale} 🔥<br />
                <span className="text-sm">-30% OFF</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Categories Grid */}
      <section className="py-12 lg:py-16">
        <div className="container mx-auto px-4">
          <h2 className="text-2xl sm:text-3xl font-bold text-center mb-8 lg:mb-12">{t.categories}</h2>
          {loading ? (
            <div className="text-center py-8">
              <div className="text-4xl mb-4">⏳</div>
              <p className="text-gray-600">Chargement des catégories...</p>
            </div>
          ) : categories.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 lg:gap-6">
              {categories.map((cat, index) => {
                const bgColors = [
                  'from-pink-400 to-red-400',
                  'from-green-400 to-teal-400',
                  'from-blue-400 to-indigo-400',
                  'from-yellow-400 to-orange-400',
                  'from-purple-400 to-pink-400',
                  'from-purple-400 to-red-400',
                  'from-indigo-400 to-blue-400',
                  'from-orange-400 to-red-400'
                ];
                const bgColor = bgColors[index % bgColors.length];

                return (
                  <Link
                    key={cat.id}
                    to={`/catalog`}
                    state={{ category: cat.name }}
                    className={`bg-gradient-to-r ${bgColor} text-white rounded-lg p-4 lg:p-6 text-center hover:scale-105 transition-transform shadow-lg`}
                  >
                    <div className="text-2xl lg:text-4xl mb-2">{cat.icon || '📦'}</div>
                    <div className="font-semibold text-sm sm:text-base">{cat.name}</div>
                  </Link>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-gray-600">Aucune catégorie disponible</p>
            </div>
          )}
        </div>
      </section>

      {/* All Products */}
      <section className="py-12 lg:py-16 bg-white">
        <div className="container mx-auto px-4">
          <div className="flex flex-col sm:flex-row justify-between items-center mb-6 lg:mb-8 space-y-4 sm:space-y-0">
            <h2 className="text-2xl sm:text-3xl font-bold">Tous nos produits</h2>
            <Link to="/catalog" className="text-purple-600 hover:text-purple-700 font-semibold">
              {t.viewAll} →
            </Link>
          </div>
          {loading ? (
            <div className="text-center py-12">
              <div className="text-4xl mb-4">⏳</div>
              <p className="text-gray-600">Chargement des produits...</p>
            </div>
          ) : allProducts.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
              {featuredProducts.map(product => (
                <ProductCard key={product.id} product={product} language={language} addToCart={addToCart} user={props.user} />
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="text-4xl mb-4">📦</div>
              <p className="text-gray-600">Aucun produit disponible pour le moment</p>
              <p className="text-sm text-gray-500 mt-2">Les produits seront bientôt ajoutés!</p>
            </div>
          )}
        </div>
      </section>

      {/* More Products */}
      {!loading && allProducts.length > 8 && (
        <section className="py-12 lg:py-16 bg-gradient-to-r from-orange-100 to-red-100">
          <div className="container mx-auto px-4">
            <div className="text-center mb-8 lg:mb-12">
              <h2 className="text-2xl sm:text-3xl font-bold mb-4">Découvrez aussi</h2>
              <p className="text-gray-600">Plus de produits disponibles sur notre plateforme</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6">
              {recentProducts.map(product => (
                <ProductCard key={product.id} product={product} language={language} addToCart={addToCart} user={props.user} />
              ))}
            </div>
            <div className="text-center mt-8">
              <Link
                to="/catalog"
                className="inline-block bg-purple-600 hover:bg-purple-700 text-white px-8 py-3 rounded-lg font-semibold transition-colors"
              >
                Voir tous les produits ({allProducts.length})
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* Newsletter */}
      <section className="py-12 lg:py-16 bg-gradient-to-r from-purple-600 to-red-600 text-white">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-2xl sm:text-3xl font-bold mb-4">{t.newsletter}</h2>
          <p className="text-lg sm:text-xl mb-6 lg:mb-8 opacity-90">Restez informé de nos dernières offres et nouveautés</p>
          <div className="max-w-md mx-auto flex flex-col sm:flex-row">
            <input
              type="email"
              placeholder={t.email}
              className="flex-1 px-4 py-3 text-black rounded-t-lg sm:rounded-l-lg sm:rounded-tr-none focus:outline-none"
            />
            <button className="bg-yellow-500 hover:bg-yellow-600 px-6 py-3 rounded-b-lg sm:rounded-r-lg sm:rounded-bl-none font-semibold transition-colors text-black">
              {t.subscribe}
            </button>
          </div>
        </div>
      </section>

      <Footer language={language} />
    </div>
  );
};

export default Homepage;
