
import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import { translations } from '../../lib/translations';
import Header from '../layout/Header';
import Footer from '../layout/Footer';
import ProductCard from '../product/ProductCard';
import PWAInstallPrompt from '../pwa/PWAInstallPrompt';
import InstallAppButton from '../pwa/InstallAppButton';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Navigation, Pagination, Autoplay, EffectFade } from 'swiper/modules';
import 'swiper/css';
import 'swiper/css/navigation';
import 'swiper/css/pagination';
import 'swiper/css/effect-fade';
import './HeroSwiper.css';
import { PinIcon } from '../ui/Icons';
import ProductGridSkeleton from '../ui/ProductGridSkeleton';

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
  const [heroImages, setHeroImages] = useState([]);

  // Icônes des catégories
  const categoryIcons = {
    'Produits locaux': '🧺',
    'Constructions': '🧱',
    'Chaussures hommes': '👞',
    'Chaussures femmes': '👠',
    'Chaussures enfants': '👟',
    'Vetements hommes': '👔',
    'Vetements femmes': '👗',
    'Vetements enfants': '👕',
    'Accessoires hommes': '⌚',
    'Accessoires femmes': '👜',
    'Articles pour enfant': '🧸',
    'Electroniques': '🔌',
    'Téléphones et accessoires': '📱',
    'Bijoux et accessoires de beauté': '💍',
    'Fruits et légumes': '🥭',
    'Meubles': '🛋️',
    'Textiles et Décorations': '🧵',
    'Autres': '📦'
  };

  // Accueil : seulement les catégories qui ont des produits, les plus fournies d'abord
  const visibleCategories = categories
    .filter(cat => typeof cat.productCount !== 'number' || cat.productCount > 0)
    .sort((a, b) => (b.productCount || 0) - (a.productCount || 0));

  useEffect(() => {
    const fetchHomepageSettings = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/settings/homepage`);
        if (!response.ok) {
          throw new Error('Could not fetch homepage settings');
        }
        const data = await response.json();
        setHeroImages(data.heroImages || []);
      } catch (error) {
        console.error("Erreur lors de la récupération des images hero:", error);
        // Fallback to default images if the fetch fails
        setHeroImages([
          "https://images.unsplash.com/photo-1550041499-4c5857d2b508",
          "https://images.unsplash.com/photo-1441986300917-64674bd600d8",
          "https://images.unsplash.com/photo-1483985988355-763728e1935b"
        ]);
      }
    };

    fetchHomepageSettings();
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
        const response = await fetch(`${API_BASE_URL}/products?status=approved`);

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();

        // Mélanger les produits de manière aléatoire
        const shuffledData = data.sort(() => Math.random() - 0.5);

        // Adapter les données du backend
        const adaptedProducts = shuffledData.map(p => ({
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

  const organizationJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'Nengoo',
    url: 'https://www.nengoo.com',
    logo: 'https://www.nengoo.com/icons/logo-512x512.png',
    description: 'Nengoo est la marketplace camerounaise de confiance pour acheter et vendre des produits locaux et internationaux au Cameroun.',
    sameAs: [],
    contactPoint: {
      '@type': 'ContactPoint',
      contactType: 'customer service',
      availableLanguage: ['French'],
    },
  };

  const searchActionJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'Nengoo',
    url: 'https://www.nengoo.com',
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: 'https://www.nengoo.com/search?q={search_term_string}',
      },
      'query-input': 'required name=search_term_string',
    },
  };

  return (
    <>
      <Helmet>
        <title>Nengoo — Marketplace Cameroun | Achetez & Vendez en ligne</title>
        <meta name="description" content="Nengoo, la marketplace camerounaise de confiance. Achetez et vendez des produits locaux et internationaux au Cameroun. Livraison rapide, paiement sécurisé." />
        <link rel="canonical" href="https://www.nengoo.com/" />
        <script type="application/ld+json">{JSON.stringify(organizationJsonLd)}</script>
        <script type="application/ld+json">{JSON.stringify(searchActionJsonLd)}</script>
      </Helmet>
    <div className="min-h-screen bg-gray-50 text-left">
      <Header {...props} />
      
      {/* PWA Install Prompt */}
      <PWAInstallPrompt />
      
      {/* Hero Section */}
      <section className="on-dark relative overflow-hidden bg-gradient-to-br from-purple-700 via-purple-700 to-red-600 text-white">
        <div className="container mx-auto px-4 pt-8 pb-12 sm:pt-14 sm:pb-20">
          <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)] gap-10 lg:gap-16 items-center">
            <div>
              <h1 className="font-display text-[2.4rem] sm:text-6xl xl:text-7xl max-w-[13ch]">
                {t.heroTitle}
              </h1>
              <p className="mt-4 sm:mt-5 text-base sm:text-xl text-purple-100 max-w-[44ch] leading-relaxed">
                {t.heroText}
              </p>
              <div className="mt-6 sm:mt-8 flex flex-wrap gap-2 sm:gap-3">
                <Link to="/catalog" className="inline-flex items-center h-11 sm:h-12 px-5 sm:px-6 text-sm sm:text-base rounded-full bg-white text-purple-800 font-bold hover:bg-yellow-300 hover:text-purple-950 transition-colors">
                  {t.browseCatalog}
                </Link>
                <Link to="/pickup-points" className="inline-flex items-center gap-2 h-11 sm:h-12 px-4 sm:px-5 text-sm sm:text-base rounded-full border border-white/50 text-white font-semibold hover:bg-white/10 transition-colors">
                  <PinIcon className="w-5 h-5" />
                  {t.pickupPoints}
                </Link>
              </div>
            </div>
            <div className="relative min-w-0 mx-auto w-full max-w-xl lg:max-w-none">
              {/* Orbite du logo : l'arrière passe derrière les images, l'avant devant */}
              <svg className="absolute -inset-x-[9%] -inset-y-[22%] w-[118%] h-[144%] pointer-events-none" viewBox="0 0 600 400" fill="none" aria-hidden="true">
                <g transform="rotate(-12 300 200)">
                  <path className="orbit-draw" pathLength="1" d="M10 200 A290 125 0 1 1 590 200 A290 125 0 1 1 10 200" stroke="rgba(255,255,255,0.35)" strokeWidth="5" />
                </g>
              </svg>
              {heroImages.length > 0 ? (
                <Swiper
                  modules={[Navigation, Pagination, Autoplay, EffectFade]}
                  spaceBetween={0}
                  slidesPerView={1}
                  navigation
                  pagination={{ clickable: true }}
                  autoplay={{
                    delay: 5000,
                    disableOnInteraction: false,
                  }}
                  effect="fade"
                  fadeEffect={{ crossFade: true }}
                  loop={heroImages.length > 1}
                  className="hero-swiper relative rounded-2xl shadow-[0_24px_60px_-20px_rgba(59,7,100,0.7)] w-full aspect-[4/3]"
                >
                  {heroImages.map((imageUrl, index) => (
                    <SwiperSlide key={index}>
                      <img
                        src={imageUrl}
                        alt={`Nengoo, visuel ${index + 1}`}
                        className="w-full h-full object-cover"
                      />
                    </SwiperSlide>
                  ))}
                </Swiper>
              ) : (
                <img
                  src="https://images.unsplash.com/photo-1550041499-4c5857d2b508"
                  alt="Nengoo"
                  className="relative rounded-2xl w-full aspect-[4/3] object-cover"
                />
              )}
              <svg className="absolute z-10 -inset-x-[9%] -inset-y-[22%] w-[118%] h-[144%] pointer-events-none" viewBox="0 0 600 400" fill="none" aria-hidden="true">
                <g transform="rotate(-12 300 200)">
                  <path className="orbit-draw" pathLength="1" d="M10 200 A290 125 0 0 0 590 200" stroke="#FDE047" strokeWidth="6" strokeLinecap="round" />
                </g>
              </svg>
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
      {(categoriesLoading || visibleCategories.length > 0) && (
        <section className="pt-10 lg:pt-14">
          <div className="container mx-auto px-4">
            <div className="flex items-baseline justify-between gap-4 mb-5">
              <h2 className="text-2xl sm:text-3xl font-extrabold">{t.shopByCategory}</h2>
              <Link to="/catalog" className="shrink-0 text-sm font-semibold text-purple-700 hover:text-purple-900 hover:underline underline-offset-4">
                {t.viewAll}
              </Link>
            </div>

            <ul className="flex md:grid md:grid-cols-4 lg:grid-cols-6 gap-3 overflow-x-auto md:overflow-visible hide-scrollbar -mx-4 px-4 md:mx-0 md:px-0 pb-1">
              {categoriesLoading
                ? [...Array(6)].map((_, i) => (
                  <li key={i} className="shrink-0 w-36 md:w-auto h-[7.5rem] rounded-xl loading-shimmer" />
                ))
                : visibleCategories.map(cat => (
                  <li key={cat.id} className="shrink-0 w-36 md:w-auto">
                    <Link
                      to={`/catalog/${encodeURIComponent(cat.name)}`}
                      className="flex flex-col h-full p-3 rounded-xl bg-white border border-gray-200 hover:border-purple-400 hover:bg-purple-50 transition-colors"
                    >
                      <span className="w-11 h-11 rounded-full bg-purple-100 flex items-center justify-center text-2xl" aria-hidden="true">
                        {categoryIcons[cat.name] || '📦'}
                      </span>
                      <span className="mt-3 font-semibold text-sm leading-tight line-clamp-2">{cat.name}</span>
                      {typeof cat.productCount === 'number' && (
                        <span className="mt-auto pt-1 text-xs text-gray-500">{t.productCount(cat.productCount)}</span>
                      )}
                    </Link>
                  </li>
                ))}
            </ul>
          </div>
        </section>
      )}

      {/* Featured Products */}
      <section className="pt-10 pb-14 lg:pt-14 lg:pb-20">
        <div className="container mx-auto px-4">
          <div className="flex items-baseline justify-between gap-4 mb-5">
            <h2 className="text-2xl sm:text-3xl font-extrabold">{t.allProducts}</h2>
            <Link to="/catalog" className="shrink-0 text-sm font-semibold text-purple-700 hover:text-purple-900 hover:underline underline-offset-4">
              {t.browseCatalog}
            </Link>
          </div>
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
            <ProductGridSkeleton label={t.loadingProducts} />
          ) : featuredProducts.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-5">
              {featuredProducts.map(product => (
                <ProductCard key={product.id} product={product} language={language} addToCart={addToCart} />
              ))}
            </div>
          ) : (
            <div className="py-14 px-6 bg-white rounded-xl border border-dashed border-gray-300 text-center">
              <h3 className="text-xl font-bold mb-2">{t.noProducts}</h3>
              <p className="text-gray-600 mb-5 max-w-md mx-auto">{t.noProductsText}</p>
              <Link to="/catalog" className="inline-flex items-center h-11 px-5 rounded-full bg-purple-700 text-white font-semibold hover:bg-purple-800">
                {t.browseCatalog}
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
    </>
  );
};

export default Homepage;
