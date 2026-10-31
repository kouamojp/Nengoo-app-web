import React, { useState, useEffect, useRef } from 'react';
import { Helmet } from 'react-helmet-async';
import { useParams, useNavigate } from 'react-router-dom';
import { translations } from '../../lib/translations';
import Header from '../layout/Header';
import Footer from '../layout/Footer';
import ProductCard from '../product/ProductCard';
import ProductGridSkeleton from '../ui/ProductGridSkeleton';
import { FilterIcon } from '../ui/Icons';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://127.0.0.1:8001/api';

const formatPrice = (price) => new Intl.NumberFormat('fr-FR', {
  style: 'currency',
  currency: 'XAF',
  minimumFractionDigits: 0,
}).format(price);

const ProductCatalog = (props) => {
  const { language, addToCart } = props;
  const { category } = useParams();
  const navigate = useNavigate();
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [sortBy, setSortBy] = useState('recent');
  const [maxAllowedPrice, setMaxAllowedPrice] = useState(2000000); // Default max price
  const [maxPrice, setMaxPrice] = useState(2000000);
  const productListRef = useRef(null);

  // La catégorie vient de l'URL : les liens du pied de page et de l'accueil fonctionnent aussi depuis cette page
  const selectedCategory = category || 'all';
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
          setMaxPrice(fetchedMaxPrice);
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
        setLoadError(false);
        const response = await fetch(`${API_BASE_URL}/products?status=approved`);

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();

        // Mélanger les produits de manière aléatoire
        const shuffledData = data.sort(() => Math.random() - 0.5);

        // Adapt backend data to frontend component structure
        const adaptedProducts = shuffledData.map(p => ({
          ...p,
          name: { [language]: p.name }, // Adapt name to be an object
          image: p.images && p.images.length > 0 ? p.images[0] : process.env.PUBLIC_URL + '/images/logo-nengoo.png', // Use first image
          inStock: p.stock > 0,
          reviews: p.reviewsCount || 0,
          rating: p.rating || 0,
        }));

        setProducts(adaptedProducts);
      } catch (error) {
        console.error("❌ Erreur lors de la récupération des produits:", error);
        setLoadError(true);
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, [language, reloadKey]);

  const selectCategory = (name) => {
    navigate(name === 'all' ? '/catalog' : `/catalog/${encodeURIComponent(name)}`);
  };

  // L'URL porte le nom de la catégorie ; les produits référencent son id
  const selectedCategoryId = categories.find(cat => cat.name === selectedCategory)?.id;

  // Nombre de produits par id de catégorie, calculé sur les produits chargés
  const countByCategory = products.reduce((acc, p) => {
    acc[p.category] = (acc[p.category] || 0) + 1;
    return acc;
  }, {});

  // Catégories proposées : celles qui ont des produits (et la catégorie courante), les plus fournies d'abord
  const categoryOptions = categories
    .filter(cat => countByCategory[cat.id] > 0 || cat.name === selectedCategory)
    .sort((a, b) => (countByCategory[b.id] || 0) - (countByCategory[a.id] || 0));

  const filteredProducts = products
    .filter(p => selectedCategory === 'all' || p.category === selectedCategoryId)
    .filter(p => p.price <= maxPrice)
    .sort((a, b) => {
      switch (sortBy) {
        case 'recent': {
          // Utiliser 0 comme fallback si updatedAt est null ou undefined
          const dateA = a.updatedAt ? new Date(a.updatedAt) : new Date(0);
          const dateB = b.updatedAt ? new Date(b.updatedAt) : new Date(0);
          return dateB - dateA;
        }
        case 'price-low': return a.price - b.price;
        case 'price-high': return b.price - a.price;
        default:
          if (a.name[language] && b.name[language]) {
            return a.name[language].localeCompare(b.name[language]);
          }
          return 0;
      }
    });

  const filtersActive = selectedCategory !== 'all' || maxPrice < maxAllowedPrice;

  const resetFilters = () => {
    setMaxPrice(maxAllowedPrice);
    selectCategory('all');
  };

  const pageTitle = selectedCategory !== 'all'
    ? `${selectedCategory} — Catalogue Nengoo`
    : 'Catalogue — Nengoo Marketplace Cameroun';

  const pageDescription = selectedCategory !== 'all'
    ? `Découvrez tous les produits de la catégorie ${selectedCategory} sur Nengoo, la marketplace camerounaise de confiance.`
    : 'Parcourez des milliers de produits locaux et internationaux sur Nengoo, votre marketplace camerounaise. Livraison au Cameroun.';

  const chipClass = (active) => `shrink-0 inline-flex items-center gap-1.5 h-9 !min-h-0 px-4 rounded-full text-sm font-semibold border transition-colors ${
    active
      ? 'bg-purple-700 border-purple-700 text-white'
      : 'bg-white border-gray-300 text-gray-800 hover:border-purple-400'
  }`;

  const priceFilter = (
    <div>
      <label htmlFor="max-price" className="flex items-baseline justify-between gap-2 font-semibold">
        <span>{t.maxPrice}</span>
        <span className="price text-purple-800">{formatPrice(maxPrice)}</span>
      </label>
      <input
        id="max-price"
        type="range"
        min="0"
        max={maxAllowedPrice}
        step="1000"
        value={maxPrice}
        onChange={(e) => setMaxPrice(parseInt(e.target.value, 10))}
        className="w-full mt-3 accent-purple-700"
      />
      <div className="flex justify-between text-xs text-gray-500">
        <span>{formatPrice(0)}</span>
        <span>{formatPrice(maxAllowedPrice)}</span>
      </div>
    </div>
  );

  return (
    <>
      <Helmet>
        <title>{pageTitle}</title>
        <meta name="description" content={pageDescription} />
        <link rel="canonical" href={
          selectedCategory !== 'all'
            ? `https://www.nengoo.com/catalog/${encodeURIComponent(selectedCategory)}`
            : 'https://www.nengoo.com/catalog'
        } />
      </Helmet>
    <div className="min-h-screen bg-gray-50 text-left">
      <Header {...props} />

      <main className="container mx-auto px-4 pt-6 sm:pt-10 pb-14">
        <div className="mb-5 sm:mb-8">
          <h1 className="font-display text-4xl sm:text-5xl text-purple-950">
            {selectedCategory === 'all' ? t.catalogTitle : selectedCategory}
          </h1>
          {!loading && !loadError && !(selectedCategory !== 'all' && categoriesLoading) && (
            <p className="mt-2 text-gray-600">{t.productCount(filteredProducts.length)}</p>
          )}
        </div>

        {/* Catégories (mobile et tablette) */}
        <div className="lg:hidden -mx-4 px-4 mb-4 flex gap-2 overflow-x-auto hide-scrollbar">
          <button type="button" onClick={() => selectCategory('all')} aria-pressed={selectedCategory === 'all'} className={chipClass(selectedCategory === 'all')}>
            {t.allCategories}
          </button>
          {categoryOptions.map(cat => (
            <button
              key={cat.id}
              type="button"
              onClick={() => selectCategory(cat.name)}
              aria-pressed={selectedCategory === cat.name}
              className={chipClass(selectedCategory === cat.name)}
            >
              {cat.name}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[15rem_minmax(0,1fr)] gap-8">
          {/* Filtres (ordinateur) */}
          <aside className="hidden lg:block">
            <div className="sticky top-24 space-y-8">
              <nav aria-label={t.categories}>
                <h2 className="text-lg font-bold mb-3">{t.categories}</h2>
                <ul className="space-y-0.5">
                  {[{ id: 'all', name: 'all', label: t.allCategories, count: products.length }, ...categoryOptions.map(cat => ({ id: cat.id, name: cat.name, label: cat.name, count: countByCategory[cat.id] || 0 }))].map(item => {
                    const active = selectedCategory === item.name;
                    return (
                      <li key={item.id}>
                        <button
                          type="button"
                          onClick={() => selectCategory(item.name)}
                          aria-current={active ? 'true' : undefined}
                          className={`w-full !min-h-0 flex items-baseline justify-between gap-3 px-3 py-2 rounded-lg text-left text-sm transition-colors ${
                            active ? 'bg-purple-100 text-purple-900 font-semibold' : 'text-gray-700 hover:bg-gray-100'
                          }`}
                        >
                          <span>{item.label}</span>
                          <span className={`tabular-nums text-xs ${active ? 'text-purple-700' : 'text-gray-400'}`}>{item.count}</span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </nav>

              {priceFilter}

              {filtersActive && (
                <button type="button" onClick={resetFilters} className="!min-h-0 text-sm font-semibold text-purple-700 hover:text-purple-900 hover:underline underline-offset-4">
                  {t.resetFilters}
                </button>
              )}
            </div>
          </aside>

          <section ref={productListRef} className="scroll-mt-20 min-w-0">
            {/* Barre d'outils : prix (mobile) et tri */}
            <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
              <details className="lg:hidden group">
                <summary className="list-none cursor-pointer inline-flex items-center gap-2 h-10 px-4 rounded-full bg-white border border-gray-300 text-sm font-semibold">
                  <FilterIcon className="w-4 h-4" strokeWidth={2.2} />
                  {maxPrice < maxAllowedPrice ? t.upTo(formatPrice(maxPrice)) : t.filters}
                </summary>
                <div className="mt-3 p-4 w-[min(22rem,calc(100vw-2rem))] bg-white rounded-xl border border-gray-200">
                  {priceFilter}
                  {filtersActive && (
                    <button type="button" onClick={resetFilters} className="mt-4 !min-h-0 text-sm font-semibold text-purple-700 hover:underline underline-offset-4">
                      {t.resetFilters}
                    </button>
                  )}
                </div>
              </details>

              <label className="ml-auto flex items-center gap-2 text-sm text-gray-600">
                <span className="max-sm:sr-only">{t.sortLabel}</span>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="h-10 pl-3 pr-8 !rounded-full border border-gray-300 bg-white text-gray-900 font-semibold focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  <option value="recent">{t.sortRecent}</option>
                  <option value="name">{t.sortName}</option>
                  <option value="price-low">{t.sortPriceLow}</option>
                  <option value="price-high">{t.sortPriceHigh}</option>
                </select>
              </label>
            </div>

            {loading || (selectedCategory !== 'all' && categoriesLoading) ? (
              <ProductGridSkeleton count={9} className="grid grid-cols-2 md:grid-cols-3 gap-3 sm:gap-5" label={t.loadingProducts} />
            ) : loadError ? (
              <div className="py-14 px-6 bg-white rounded-xl border border-gray-200 text-center" role="alert">
                <p className="text-gray-800 max-w-md mx-auto">{t.loadError}</p>
                <button type="button" onClick={() => setReloadKey(k => k + 1)} className="mt-5 inline-flex items-center h-11 px-5 rounded-full bg-purple-700 text-white font-semibold hover:bg-purple-800">
                  {t.retry}
                </button>
              </div>
            ) : filteredProducts.length > 0 ? (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 sm:gap-5">
                {filteredProducts.map(product => (
                  <ProductCard key={product.id} product={product} language={language} addToCart={addToCart} />
                ))}
              </div>
            ) : (
              <div className="py-14 px-6 bg-white rounded-xl border border-dashed border-gray-300 text-center">
                <h2 className="text-xl font-bold mb-2">{products.length === 0 ? t.noProducts : t.noMatch}</h2>
                <p className="text-gray-600 max-w-md mx-auto">{products.length === 0 ? t.noProductsText : t.noMatchText}</p>
                {filtersActive && (
                  <button type="button" onClick={resetFilters} className="mt-5 inline-flex items-center h-11 px-5 rounded-full bg-purple-700 text-white font-semibold hover:bg-purple-800">
                    {t.resetFilters}
                  </button>
                )}
              </div>
            )}
          </section>
        </div>
      </main>

      <Footer language={language} />
    </div>
    </>
  );
};

export default ProductCatalog;
