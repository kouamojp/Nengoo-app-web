
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { translations } from '../../lib/translations';
import Header from '../layout/Header';
import Footer from '../layout/Footer';
import ProductCard from '../product/ProductCard';
import PWAInstallPrompt from '../pwa/PWAInstallPrompt';
import InstallAppButton from '../pwa/InstallAppButton';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://127.0.0.1:8001/api';

const Homepage = (props) => {
  const { language, addToCart } = props;
  const t = translations[language];

  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const [email, setEmail] = useState('');
  const [newsletterFeedback, setNewsletterFeedback] = useState({ message: '', isError: false });

  // Mapping des icônes et couleurs pour les catégories
  const categoryIcons = {
    'Vêtements et Accessoires': { icon: '👗', bg: 'from-pink-400 to-red-400' },
    'Aliments et Boissons': { icon: '🍽️', bg: 'from-green-400 to-teal-400' },
    'Électroniques': { icon: '📱', bg: 'from-blue-400 to-indigo-400' },
    'Maison & Jardinage': { icon: '🏠', bg: 'from-yellow-400 to-orange-400' },
    'Artisanat': { icon: '🎨', bg: 'from-purple-400 to-pink-400' },
    'Beauté et Soins': { icon: '💄', bg: 'from-purple-400 to-red-400' },
    'Articles Sportifs': { icon: '⚽', bg: 'from-indigo-400 to-blue-400' },
    'Jouets pour Enfants': { icon: '🧸', bg: 'from-orange-400 to-red-400' },
    'Matériel Médical': { icon: '🏥', bg: 'from-red-400 to-pink-400' },
    'Équipements Pro': { icon: '🔧', bg: 'from-gray-400 to-gray-600' },
    'Services': { icon: '🛠️', bg: 'from-teal-400 to-green-400' },
    'Voyages et Billets': { icon: '✈️', bg: 'from-cyan-400 to-blue-400' }
  };

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
        /* console.error("❌ [Homepage] Erreur lors de la récupération des catégories:", error); */
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

        // Adapter les données du backend
        const adaptedProducts = sortedData.map(p => ({
          ...p,
          name: { [language]: p.name },
          description: { [language]: p.description },
          image: p.images && p.images.length > 0 ? p.images[0] : 'https://via.placeholder.com/300',
          inStock: p.stock > 0,
          reviews: p.reviewsCount || 0,
          rating: p.rating || 0,
        }));

        setProducts(adaptedProducts);
      } catch (error) {
        console.error("❌ [Homepage] Erreur lors de la récupération des produits:", error);
        // Ne pas afficher d'alert sur la homepage pour ne pas gêner l'expérience utilisateur
        setProducts([]);
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, [language]);

  // Sélection des produits pour les différentes sections
  const featuredProducts = products;
  const localProducts = products.filter(p => p.category === 'cat_340d7906').slice(0, 3);

  const handleNewsletterSubmit = async (e) => {
    e.preventDefault();
    setNewsletterFeedback({ message: '', isError: false });

    if (!email) {
      setNewsletterFeedback({ message: 'Veuillez entrer une adresse email.', isError: true });
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/newsletter/subscribe`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || 'Une erreur est survenue.');
      }

      setNewsletterFeedback({ message: 'Merci pour votre inscription !', isError: false });
      setEmail('');
    } catch (error) {
      setNewsletterFeedback({ message: error.message, isError: true });
    }
  };

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
                {/* <Link to="/catalog/handicrafts" className="border-2 border-white hover:bg-white hover:text-purple-600 px-6 sm:px-8 py-3 rounded-lg font-semibold transition-colors text-center">
                  {t.localSpecialties} 🎨
                </Link> */}
              </div>
            </div>
            <div className="relative order-first lg:order-last">
              <img
                src="https://images.unsplash.com/photo-1550041499-4c5857d2b508"
                alt="Hero"
                className="rounded-lg shadow-2xl w-full max-w-md mx-auto lg:max-w-full"
              />
              {/* <div className="absolute -bottom-4 -left-4 bg-yellow-400 text-black p-3 sm:p-4 rounded-lg font-bold text-center">
                {t.flashSale} 🔥<br />
                <span className="text-sm">-30% OFF</span>
              </div> */}
            </div>
          </div>
        </div>
      </section>

      {/* Install App Section */}
     {/*  <section className="py-8 lg:py-12 bg-gradient-to-r from-yellow-400 via-orange-400 to-red-500">
        <div className="container mx-auto px-4">
          <div className="bg-white rounded-2xl shadow-2xl p-6 lg:p-10">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
              <div className="text-center lg:text-left">
                <div className="flex items-center justify-center lg:justify-start mb-4">
                  <span className="text-6xl animate-bounce">📱</span>
                </div>
                <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-4">
                  Installez l'Application Nengoo
                </h2>
                <p className="text-lg text-gray-600 mb-6">
                  Accédez instantanément à Nengoo depuis votre écran d'accueil. 
                  Plus rapide, plus pratique, fonctionne même hors ligne!
                </p>
                
                <div className="space-y-3 mb-6">
                  <div className="flex items-center space-x-3">
                    <span className="text-green-500 text-2xl">✓</span>
                    <span className="text-gray-700">Installation en 1 clic</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <span className="text-green-500 text-2xl">✓</span>
                    <span className="text-gray-700">Fonctionne hors ligne</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <span className="text-green-500 text-2xl">✓</span>
                    <span className="text-gray-700">Mises à jour automatiques</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <span className="text-green-500 text-2xl">✓</span>
                    <span className="text-gray-700">Très léger (~500KB)</span>
                  </div>
                </div>

                <InstallAppButton />
              </div>

              <div className="hidden lg:block">
                <div className="relative">
                  <img
                    src="https://images.unsplash.com/photo-1512941937669-90a1b58e7e9c"
                    alt="Mobile Phone"
                    className="rounded-2xl shadow-xl w-full"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-purple-600/20 to-transparent rounded-2xl"></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section> */}

      {/* Categories Grid */}
      <section className="py-12 lg:py-16 max-md:hidden">
        <div className="container mx-auto px-4">
          <h2 className="text-2xl sm:text-3xl font-bold text-center mb-8 lg:mb-12">
            {t.categories}
            {/* {!categoriesLoading && categories.length > 0 && (
              <span className="text-gray-500 text-lg ml-2">({categories.length})</span>
            )} */}
          </h2>

          {categoriesLoading ? (
            <div className="text-center py-16">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-purple-700 mb-4"></div>
              <p className="text-lg text-gray-600">Chargement des catégories...</p>
            </div>
          ) : categories.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 lg:gap-6">
              {categories.map(cat => {
                // Récupérer l'icône et la couleur correspondantes, ou utiliser des valeurs par défaut
                const categoryStyle = categoryIcons[cat.name] || { icon: '📦', bg: 'from-gray-400 to-gray-600' };

                return (
                  <Link
                    key={cat.id}
                    to={`/catalog/${cat.name}`}
                    className={`bg-gradient-to-r ${categoryStyle.bg} text-white rounded-lg p-4 lg:p-6 text-center hover:scale-105 transition-transform shadow-lg`}
                  >
                    <div className="text-2xl lg:text-4xl mb-2">{categoryStyle.icon}</div>
                    <div className="font-semibold text-sm sm:text-base">{cat.name}</div>
                    {cat.description && (
                      <div className="text-xs mt-1 opacity-90 line-clamp-2">{cat.description}</div>
                    )}
                  </Link>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-16 bg-white rounded-lg shadow-md">
              <div className="text-6xl mb-4">🏷️</div>
              <h3 className="text-xl font-semibold mb-2">Aucune catégorie disponible</h3>
              <p className="text-gray-600 mb-4">Les catégories seront bientôt disponibles.</p>
              <Link to="/catalog" className="text-purple-600 hover:text-purple-700 font-semibold">
                Explorer les produits →
              </Link>
            </div>
          )}
        </div>
      </section>

      {/* Featured Products */}
      <section className="py-12 lg:py-16 bg-white">
        <div className="container mx-auto px-4">
          {/* <div className="flex flex-col sm:flex-row justify-between items-center mb-6 lg:mb-8 space-y-4 sm:space-y-0">
            <h2 className="text-2xl sm:text-3xl font-bold">
              {t.featuredProducts}
              {!loading && products.length > 0 && (
                <span className="text-gray-500 text-lg ml-2">({products.length} produit{products.length > 1 ? 's' : ''})</span>
              )}
            </h2>
            <Link to="/catalog" className="text-purple-600 hover:text-purple-700 font-semibold">
              {t.viewAll} →
            </Link>
          </div> */}

          {loading ? (
            <div className="text-center py-16">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-purple-700 mb-4"></div>
              <p className="text-lg text-gray-600">Chargement des produits...</p>
            </div>
          ) : featuredProducts.length > 0 ? (
            <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 lg:gap-6">
              {featuredProducts.map(product => (
                <ProductCard key={product.id} product={product} language={language} addToCart={addToCart} />
              ))}
            </div>
          ) : (
            <div className="text-center py-16 bg-gray-50 rounded-lg">
              <div className="text-6xl mb-4">📦</div>
              <h3 className="text-xl font-semibold mb-2">Aucun produit disponible</h3>
              <p className="text-gray-600 mb-4">Nos produits arrivent bientôt !</p>
              <Link to="/catalog" className="text-purple-600 hover:text-purple-700 font-semibold">
                Explorer le catalogue →
              </Link>
            </div>
          )}
        </div>
      </section>

      {/* Local Specialties */}
      {/* <section className="py-12 lg:py-16 bg-gradient-to-r from-orange-100 to-red-100">
        <div className="container mx-auto px-4">
          <div className="text-center mb-8 lg:mb-12">
            <h2 className="text-2xl sm:text-3xl font-bold mb-4">
              {t.localSpecialties}
              {!loading && localProducts.length > 0 && (
                <span className="text-gray-600 text-lg ml-2">({localProducts.length})</span>
              )}
            </h2>
            <p className="text-gray-600">Découvrez l'artisanat et les produits authentiques du Cameroun</p>
          </div>

          {loading ? (
            <div className="text-center py-16">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-orange-700 mb-4"></div>
              <p className="text-lg text-gray-600">Chargement des spécialités locales...</p>
            </div>
          ) : localProducts.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6">
              {localProducts.map(product => (
                <ProductCard key={product.id} product={product} language={language} addToCart={addToCart} />
              ))}
            </div>
          ) : (
            <div className="text-center py-16 bg-white rounded-lg shadow-md">
              <div className="text-6xl mb-4">🎨</div>
              <h3 className="text-xl font-semibold mb-2">Aucune spécialité locale disponible</h3>
              <p className="text-gray-600 mb-4">Nos artisans préparent leurs créations...</p>
              <Link to="/catalog/handicrafts" className="text-orange-600 hover:text-orange-700 font-semibold">
                Explorer l'artisanat →
              </Link>
            </div>
          )}
        </div>
      </section> */}

      {/* Newsletter */}
      {/* <section className="py-12 lg:py-16 bg-gradient-to-r from-purple-600 to-red-600 text-white">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-2xl sm:text-3xl font-bold mb-4">{t.newsletter}</h2>
          <p className="text-lg sm:text-xl mb-6 lg:mb-8 opacity-90">Restez informé de nos dernières offres et nouveautés</p>
          <form onSubmit={handleNewsletterSubmit} className="max-w-md mx-auto flex flex-col sm:flex-row">
            <input
              type="email"
              placeholder={t.email}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="flex-1 px-4 py-3 text-black rounded-t-lg sm:rounded-l-lg sm:rounded-tr-none focus:outline-none"
              required
            />
            <button 
              type="submit"
              className="bg-yellow-500 hover:bg-yellow-600 px-6 py-3 rounded-b-lg sm:rounded-r-lg sm:rounded-bl-none font-semibold transition-colors text-black"
            >
              {t.subscribe}
            </button>
          </form>
          {newsletterFeedback.message && (
            <p className={`mt-4 text-sm ${newsletterFeedback.isError ? 'text-red-300' : 'text-green-300'}`}>
              {newsletterFeedback.message}
            </p>
          )}
        </div>
      </section> */}

      <Footer language={language} />
    </div>
  );
};

export default Homepage;
