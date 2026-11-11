import React, { useState, useEffect, useMemo } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import Header from '../layout/Header';
import Footer from '../layout/Footer';
import ProductCard from '../product/ProductCard';
import ProductGridSkeleton from '../ui/ProductGridSkeleton';
import { RichText } from '../ui/RichText';
import { PinIcon, WhatsAppIcon, SearchIcon, BoxIcon, ClockIcon, ExternalIcon } from '../ui/Icons';
import { openWhatsApp } from '../../lib/utils';
import { translations } from '../../lib/translations';
import { cardImage } from '../../lib/productImages';
import { isBlank, safeLink, toPlainText } from '../../lib/richText';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://127.0.0.1:8001/api';
const SITE_URL = 'https://www.nengoo.com';
// Au-delà, la présentation est repliée derrière « Lire la suite »
const LONG_DESCRIPTION = 420;

const effectivePrice = (p) => (p.promoPrice && p.promoPrice < p.price ? p.promoPrice : p.price) || 0;

const SORTS = {
  recent: (a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0),
  priceLow: (a, b) => effectivePrice(a) - effectivePrice(b),
  priceHigh: (a, b) => effectivePrice(b) - effectivePrice(a),
};

const normalize = (text) =>
  (text || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

const Monogram = ({ seller, className }) => (
  <div
    className={`shrink-0 rounded-2xl bg-white text-purple-800 flex items-center justify-center font-display overflow-hidden ring-4 ring-white/15 ${className}`}
    aria-hidden="true"
  >
    {seller.logoUrl ? (
      <img src={seller.logoUrl} alt="" className="w-full h-full object-cover" />
    ) : (
      seller.businessName.charAt(0).toUpperCase()
    )}
  </div>
);

const SellerShop = (props) => {
  const { id: sellerId } = useParams();
  const { language, addToCart } = props;
  const t = translations[language];
  const [seller, setSeller] = useState(null);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState('recent');
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    if (!sellerId) return;
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setNotFound(false);
      try {
        const sellerResponse = await fetch(`${API_BASE_URL}/sellers/${sellerId}`);
        if (!sellerResponse.ok) throw new Error('not found');
        const sellerData = await sellerResponse.json();
        const productsResponse = await fetch(`${API_BASE_URL}/products?status=approved&seller_id=${sellerId}`);
        const productsData = productsResponse.ok ? await productsResponse.json() : [];
        if (cancelled) return;
        setSeller(sellerData);
        setProducts(
          productsData.map((p) => ({
            ...p,
            rawName: p.name,
            name: { [language]: p.name },
            description: { [language]: p.description },
            image: cardImage(p),
            inStock: p.kind === 'service' || p.stock > 0,
            sellerWhatsApp: p.sellerWhatsapp,
            reviews: p.reviewsCount || 0,
            rating: p.rating || 0,
          }))
        );
      } catch {
        if (!cancelled) setNotFound(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [sellerId, language]);

  const visibleProducts = useMemo(() => {
    const wanted = normalize(query.trim());
    const list = wanted
      ? products.filter((p) => normalize(`${p.rawName} ${(p.tags || []).join(' ')} ${p.brand || ''}`).includes(wanted))
      : products;
    return [...list].sort(SORTS[sort]);
  }, [products, query, sort]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header {...props} />
        <div className="bg-purple-900 h-56 sm:h-64 animate-pulse" aria-hidden="true" />
        <main className="container mx-auto px-4 py-10">
          <ProductGridSkeleton count={8} label={t.shopLoading} />
        </main>
        <Footer language={language} />
      </div>
    );
  }

  if (notFound || !seller) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Helmet>
          <title>{`${t.shopNotFound} - Nengoo`}</title>
          <meta name="robots" content="noindex" />
        </Helmet>
        <Header {...props} />
        <main className="container mx-auto px-4 py-20 max-w-xl text-left">
          <h1 className="font-display text-4xl sm:text-5xl text-purple-950">{t.shopNotFound}</h1>
          <p className="mt-4 text-gray-700">{t.shopNotFoundText}</p>
          <Link to="/catalog" className="mt-8 inline-flex items-center h-12 px-6 rounded-xl bg-purple-700 hover:bg-purple-800 text-white font-bold">
            {t.browseCatalog}
          </Link>
        </main>
        <Footer language={language} />
      </div>
    );
  }

  const place = [seller.city, seller.region].filter(Boolean).join(', ');
  const since = seller.createdAt ? new Date(seller.createdAt).getFullYear() : null;
  const descriptionText = toPlainText(seller.description);
  const hasDescription = !isBlank(seller.description);
  const isLong = descriptionText.length > LONG_DESCRIPTION;
  const facebook = safeLink(seller.socialMedia?.facebook);
  const canonicalUrl = `${SITE_URL}/seller/${seller.id}`;
  const metaDescription = (descriptionText || `Découvrez les produits de ${seller.businessName} sur Nengoo.`).slice(0, 160);
  const storeSchema = {
    '@context': 'https://schema.org',
    '@type': 'Store',
    name: seller.businessName,
    url: canonicalUrl,
    ...(seller.logoUrl && { image: seller.logoUrl }),
    ...(descriptionText && { description: descriptionText.slice(0, 500) }),
    ...(seller.city && {
      address: { '@type': 'PostalAddress', addressLocality: seller.city, addressRegion: seller.region, addressCountry: 'CM' },
    }),
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Helmet>
        <title>{`${seller.businessName} - Boutique sur Nengoo`}</title>
        <meta name="description" content={metaDescription} />
        <link rel="canonical" href={canonicalUrl} />
        <meta property="og:type" content="website" />
        <meta property="og:title" content={seller.businessName} />
        <meta property="og:description" content={metaDescription} />
        <meta property="og:url" content={canonicalUrl} />
        {seller.logoUrl && <meta property="og:image" content={seller.logoUrl} />}
        <script type="application/ld+json">{JSON.stringify(storeSchema)}</script>
      </Helmet>

      <Header {...props} />

      {/* Enseigne */}
      <header className="shop-awning on-dark bg-purple-900 text-white">
        <div className="container mx-auto px-4 pt-8 sm:pt-12 pb-12 sm:pb-14 text-left">
          <div className="flex items-start gap-4 sm:gap-6">
            <Monogram seller={seller} className="w-16 h-16 sm:w-24 sm:h-24 text-4xl sm:text-6xl" />
            <div className="min-w-0 flex-1 text-left">
              <h1 className="font-display text-[2.6rem] sm:text-6xl lg:text-7xl break-words [text-wrap:balance]">
                {seller.businessName}
              </h1>
              <ul className="mt-3 flex flex-wrap gap-x-5 gap-y-1.5 text-sm sm:text-base text-purple-100">
                {place && (
                  <li className="inline-flex items-center gap-1.5">
                    <PinIcon className="w-4 h-4" /> {place}
                  </li>
                )}
                <li className="inline-flex items-center gap-1.5">
                  <BoxIcon className="w-4 h-4" /> {t.shopProductCount(products.length)}
                </li>
                {since && (
                  <li className="inline-flex items-center gap-1.5">
                    <ClockIcon className="w-4 h-4" /> {t.shopSince(since)}
                  </li>
                )}
              </ul>
            </div>
          </div>
          {seller.whatsapp && (
            <div className="mt-6 sm:mt-8 sm:pl-[7.5rem]">
              <button
                type="button"
                onClick={() => openWhatsApp(seller.whatsapp)}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 h-12 px-6 rounded-xl bg-green-600 hover:bg-green-700 text-white font-bold transition-colors"
              >
                <WhatsAppIcon className="w-5 h-5" />
                {t.contactWhatsApp}
              </button>
            </div>
          )}
        </div>
      </header>

      <main className="container mx-auto px-4 pt-10 sm:pt-12 pb-16">
        {/* À propos + contact */}
        <div className="grid lg:grid-cols-[minmax(0,1fr)_20rem] gap-6 lg:gap-10 text-left">
          <section aria-labelledby="about-title" className="min-w-0">
            <h2 id="about-title" className="text-2xl font-extrabold text-purple-950">{t.aboutShop}</h2>
            {hasDescription ? (
              <div className="mt-3 max-w-[68ch] text-gray-700">
                <div className={isLong && !expanded ? 'relative max-h-48 overflow-hidden' : ''}>
                  <RichText value={seller.description} />
                  {isLong && !expanded && (
                    <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-gray-50 to-transparent" aria-hidden="true" />
                  )}
                </div>
                {isLong && (
                  <button
                    type="button"
                    onClick={() => setExpanded((v) => !v)}
                    aria-expanded={expanded}
                    className="!min-h-0 mt-2 py-2 font-semibold text-purple-800 hover:underline underline-offset-4"
                  >
                    {expanded ? t.readLess : t.readMore}
                  </button>
                )}
              </div>
            ) : (
              <p className="mt-3 text-gray-600">{t.noShopDescription}</p>
            )}
          </section>

          {(seller.address || facebook) && (
            <aside className="self-start rounded-2xl border border-gray-200 bg-white p-5 space-y-4" aria-label={seller.businessName}>
              {seller.address && (
                <div className="flex gap-3">
                  <PinIcon className="w-5 h-5 mt-0.5 shrink-0 text-purple-700" />
                  <p className="text-gray-800">
                    {seller.address}
                    {seller.city && <span className="block text-sm text-gray-600">{place}</span>}
                  </p>
                </div>
              )}
              {facebook && (
                <a
                  href={facebook}
                  target="_blank"
                  rel="noopener noreferrer nofollow"
                  className="flex items-center gap-3 font-semibold text-purple-800 hover:underline underline-offset-4"
                >
                  <ExternalIcon className="w-5 h-5 shrink-0" />
                  {t.shopFacebook}
                </a>
              )}
            </aside>
          )}
        </div>

        {/* Produits */}
        <section aria-labelledby="products-title" className="mt-12 sm:mt-14">
          <div className="flex flex-wrap items-end justify-between gap-4 mb-5 text-left">
            <h2 id="products-title" className="text-2xl font-extrabold text-purple-950">
              {t.shopProductsTitle}
              <span className="ml-2 text-base font-semibold text-gray-500">{products.length}</span>
            </h2>
            {products.length > 1 && (
              <div className="flex flex-wrap gap-3 w-full sm:w-auto">
                <label className="relative flex-1 sm:w-72">
                  <span className="sr-only">{t.shopSearch}</span>
                  <SearchIcon className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
                  <input
                    type="search"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder={t.shopSearch}
                    className="w-full h-11 !rounded-xl border border-gray-300 bg-white pl-10 pr-3 text-base focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </label>
                <label className="flex items-center gap-2 text-sm text-gray-700">
                  <span className="sr-only sm:not-sr-only">{t.sortLabel}</span>
                  <select
                    value={sort}
                    onChange={(e) => setSort(e.target.value)}
                    className="h-11 !rounded-xl border border-gray-300 bg-white px-3 text-base text-gray-900 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  >
                    <option value="recent">{t.sortRecent}</option>
                    <option value="priceLow">{t.sortPriceLow}</option>
                    <option value="priceHigh">{t.sortPriceHigh}</option>
                  </select>
                </label>
              </div>
            )}
          </div>

          {products.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-gray-300 bg-white px-6 py-12 text-left sm:text-center">
              <p className="text-gray-700">{t.shopNoProducts}</p>
              <Link to="/catalog" className="mt-4 inline-flex font-semibold text-purple-800 hover:underline underline-offset-4">
                {t.browseCatalog}
              </Link>
            </div>
          ) : visibleProducts.length === 0 ? (
            <div className="rounded-2xl bg-white border border-gray-200 px-6 py-10 text-left sm:text-center" role="status">
              <p className="text-gray-700">{t.shopNoMatch(query.trim())}</p>
              <button
                type="button"
                onClick={() => setQuery('')}
                className="!min-h-0 mt-3 py-2 font-semibold text-purple-800 hover:underline underline-offset-4"
              >
                {t.clearSearch}
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-5">
              {visibleProducts.map((product) => (
                <ProductCard key={product.id} product={product} language={language} addToCart={addToCart} />
              ))}
            </div>
          )}
        </section>
      </main>

      <Footer language={language} />
    </div>
  );
};

export default SellerShop;
