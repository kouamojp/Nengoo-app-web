
import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { translations } from '../../lib/translations';
import { openWhatsApp, generateProductWhatsAppMessage } from '../../lib/utils';
import Header from '../layout/Header';
import Footer from '../layout/Footer';
import ProductCard from '../product/ProductCard';
import { CartIcon, WhatsAppIcon, PinIcon } from '../ui/Icons';
import Lightbox from "yet-another-react-lightbox";
import "yet-another-react-lightbox/styles.css";

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://127.0.0.1:8001/api';
const SITE_URL = 'https://www.nengoo.com';

const formatPrice = (price) => {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'XAF',
    minimumFractionDigits: 0,
  }).format(price);
};

const StarRating = ({ rating, setRating, interactive = true, size = 'text-2xl' }) => {
    const [hover, setHover] = useState(0);
    if (!interactive) {
        return (
            <span className={`inline-flex ${size} leading-none`} role="img" aria-label={`${rating} / 5`}>
                {[...Array(5)].map((_, index) => (
                    <span key={index} className={index < Math.round(rating) ? 'text-yellow-400' : 'text-gray-300'}>★</span>
                ))}
            </span>
        );
    }
    return (
        <div className="flex gap-1" role="radiogroup">
            {[...Array(5)].map((_, index) => {
                const starValue = index + 1;
                return (
                    <button
                        type="button"
                        key={starValue}
                        role="radio"
                        aria-checked={rating === starValue}
                        aria-label={`${starValue} / 5`}
                        className={`!min-h-0 !min-w-0 ${size} leading-none cursor-pointer`}
                        onClick={() => setRating(starValue)}
                        onMouseEnter={() => setHover(starValue)}
                        onMouseLeave={() => setHover(0)}
                    >
                        <span className={starValue <= (hover || rating) ? 'text-yellow-400' : 'text-gray-300'}>
                            ★
                        </span>
                    </button>
                );
            })}
        </div>
    );
};

const adaptProduct = (p, language) => ({
  ...p,
  name: { [language]: p.name },
  description: { [language]: p.description },
  image: p.images && p.images.length > 0 ? p.images[0] : process.env.PUBLIC_URL + '/images/logo-nengoo.png',
  images: p.images || [],
  inStock: p.stock > 0,
  reviews: p.reviewsCount || 0,
  rating: p.rating || 0,
});

const ProductDetail = (props) => {
  const { language, addToCart, user } = props;
  const { idOrSlug } = useParams();
  const navigate = useNavigate();
  const [selectedImage, setSelectedImage] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [product, setProduct] = useState(null);
  const [relatedProducts, setRelatedProducts] = useState([]);
  const [category, setCategory] = useState(null);
  const [seller, setSeller] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showSendMessageModal, setShowSendMessageModal] = useState(false);
  const [messageToSend, setMessageToSend] = useState('');
  const [open, setOpen] = React.useState(false);
  const [reviews, setReviews] = useState([]);
  const [canReview, setCanReview] = useState(false);
  const [hasAlreadyReviewed, setHasAlreadyReviewed] = useState(false);
  const [newReviewRating, setNewReviewRating] = useState(0);
  const [newReviewComment, setNewReviewComment] = useState('');

  const t = translations[language];

  const fetchProductData = async () => {
    try {
      setLoading(true);

      // Fetch product details
      const productResponse = await fetch(`${API_BASE_URL}/products/${idOrSlug}`);
      if (!productResponse.ok) {
        if (productResponse.status === 404) setProduct(null);
        else throw new Error(`HTTP error! status: ${productResponse.status}`);
        return;
      }
      const productData = await productResponse.json();
      setProduct(adaptProduct(productData, language));
      setSelectedImage(0);
      setQuantity(1);

      // Fetch related info
      if (productData.category) {
        fetchRelatedProducts(productData.category, productData.id);
        fetchCategory(productData.category);
      }
      if (productData.sellerId) fetchSeller(productData.sellerId);

      // Fetch reviews
      const reviewsResponse = await fetch(`${API_BASE_URL}/products/${idOrSlug}/reviews`);
      if (reviewsResponse.ok) {
        const reviewsData = await reviewsResponse.json();
        setReviews(reviewsData);
      }

      // Check if user can review
      if (user && user.type === 'buyer') {
        const canReviewResponse = await fetch(`${API_BASE_URL}/products/${idOrSlug}/can-review`, {
          headers: { 'X-Buyer-Id': user.id }
        });
        if (canReviewResponse.ok) {
          const canReviewData = await canReviewResponse.json();
          setCanReview(canReviewData.canReview);
          setHasAlreadyReviewed(canReviewData.hasAlreadyReviewed);
        }
      }

    } catch (error) {
      console.error("❌ [ProductDetail] Error fetching product data:", error);
      setProduct(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProductData();
  }, [idOrSlug, language, user]);

  const fetchRelatedProducts = async (categoryId, currentProductId) => {
      try {
        const response = await fetch(`${API_BASE_URL}/products`);

        if (!response.ok) return;

        const data = await response.json();
        const filtered = data
          .filter(p => p.category === categoryId && p.id !== currentProductId)
          .slice(0, 4)
          .map(p => adaptProduct(p, language));

        setRelatedProducts(filtered);
      } catch (error) {
        console.error("❌ [ProductDetail] Erreur produits similaires:", error);
      }
    };

  // Le produit référence sa catégorie par id : on récupère son nom pour le fil d'Ariane
  const fetchCategory = async (categoryId) => {
      try {
        const response = await fetch(`${API_BASE_URL}/categories`);
        if (!response.ok) return;
        const data = await response.json();
        setCategory(data.find(cat => cat.id === categoryId) || null);
      } catch (error) {
        console.error("❌ [ProductDetail] Erreur récupération catégorie:", error);
      }
    };

  const fetchSeller = async (sellerId) => {
      try {
        const response = await fetch(`${API_BASE_URL}/sellers/${sellerId}`);

        if (!response.ok) {
          console.warn("⚠️ [ProductDetail] Vendeur non trouvé");
          return;
        }

        const data = await response.json();
        setSeller(data);
      } catch (error) {
        console.error("❌ [ProductDetail] Erreur récupération vendeur:", error);
      }
    };
  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!user) {
        alert("Veuillez vous connecter pour envoyer un message.");
        return;
    }
    try {
        const response = await fetch(`${API_BASE_URL}/messages`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'sender-id': user.id,
                'sender-type': user.type,
            },
            body: JSON.stringify({
                receiver_id: seller.id,
                message: messageToSend,
                product_id: product.id,
            }),
        });
        if (!response.ok) {
            throw new Error('Failed to send message');
        }
        setShowSendMessageModal(false);
        setMessageToSend('');
        alert('Message envoyé avec succès!');
    } catch (error) {
        console.error('Error sending message:', error);
        alert(`Erreur: ${error.message}`);
    }
  };

  const handleWhatsAppClick = async () => {
    // Record the click without blocking WhatsApp if the API fails or is slow
    try {
        fetch(`${API_BASE_URL}/analytics/whatsapp-click`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                productId: product.id,
                productName: product.name[language],
                sellerId: seller.id,
                sellerName: seller.businessName
            }),
        }).catch(err => console.error("Error recording WhatsApp click:", err));
    } catch (error) {
        console.error("Error recording WhatsApp click:", error);
    }

    // Open WhatsApp
    openWhatsApp(seller.whatsapp, generateProductWhatsAppMessage(product, language));
  };

  const handleSubmitReview = async (e) => {
    e.preventDefault();
    if (newReviewRating === 0) {
        alert("Veuillez sélectionner une note.");
        return;
    }
    try {
        const response = await fetch(`${API_BASE_URL}/products/${idOrSlug}/reviews`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Buyer-Id': user.id,
            },
            body: JSON.stringify({
                rating: newReviewRating,
                comment: newReviewComment,
            }),
        });
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.detail || 'Failed to submit review');
        }
        // Refresh product data to show new review and rating
        fetchProductData();
        setNewReviewRating(0);
        setNewReviewComment('');
    } catch (error) {
        console.error('Error submitting review:', error);
        alert(`Erreur: ${error.message}`);
    }
  };

  if (loading) {
      return (
        <div className="min-h-screen bg-gray-50 text-left">
          <Header {...props} />
          <div className="container mx-auto px-4 pt-6 pb-14" aria-busy="true">
            <div className="h-4 w-64 max-w-full rounded loading-shimmer mb-6" />
            <div className="grid lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)] gap-8 lg:gap-12">
              <div className="aspect-square rounded-2xl loading-shimmer" />
              <div className="space-y-4">
                <div className="h-10 w-4/5 rounded loading-shimmer" />
                <div className="h-12 w-1/2 rounded loading-shimmer" />
                <div className="h-12 w-full rounded-xl loading-shimmer" />
                <div className="h-32 w-full rounded-xl loading-shimmer" />
              </div>
            </div>
          </div>
        </div>
      );
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-gray-50 text-left">
        <Header {...props} />
        <main className="container mx-auto px-4 py-16">
          <div className="max-w-lg mx-auto py-12 px-6 bg-white rounded-xl border border-dashed border-gray-300 text-center">
            <h1 className="text-2xl font-extrabold mb-3">{t.productNotFound}</h1>
            <p className="text-gray-600 mb-6">{t.productNotFoundText}</p>
            <Link to="/catalog" className="inline-flex items-center h-11 px-5 rounded-full bg-purple-700 text-white font-semibold hover:bg-purple-800">
              {t.browseCatalog}
            </Link>
          </div>
        </main>
        <Footer language={language} />
      </div>
    );
  }

  const name = product.name[language];
  const images = product.images.length > 0 ? product.images : [process.env.PUBLIC_URL + '/images/logo-nengoo.png'];
  const lightboxSlides = images.map(img => ({ src: img }));

  const hasPromo = product.promoPrice && product.promoPrice > 0;
  const discountPercentage = hasPromo && product.price > product.promoPrice
    ? Math.round(((product.price - product.promoPrice) / product.price) * 100)
    : 0;

  const getAbsoluteImageUrl = (url) => {
    if (!url) return '';
    if (url.startsWith('http')) return url;
    return `${SITE_URL}${url.startsWith('/') ? '' : '/'}${url}`;
  };

  const ogImageUrl = getAbsoluteImageUrl(images[0]);
  // Les robots qui visitent cette URL reçoivent l'aperçu Open Graph du backend (voir .htaccess)
  const canonicalUrl = `${SITE_URL}/product/${product.slug || product.id}`;
  const categoryUrl = category ? `/catalog/${encodeURIComponent(category.name)}` : '/catalog';

  const jsonLd = {
    '@context': 'https://schema.org/',
    '@type': 'Product',
    name,
    description: product.description[language],
    image: images,
    url: canonicalUrl,
    ...(seller && {
      brand: {
        '@type': 'Brand',
        name: seller.businessName || seller.name,
      },
    }),
    offers: {
      '@type': 'Offer',
      url: canonicalUrl,
      priceCurrency: 'XAF',
      price: product.promoPrice || product.price,
      availability: product.inStock
        ? 'https://schema.org/InStock'
        : 'https://schema.org/OutOfStock',
      seller: seller
        ? { '@type': 'Organization', name: seller.businessName || seller.name }
        : undefined,
    },
    ...(product.reviewsCount > 0 && {
      aggregateRating: {
        '@type': 'AggregateRating',
        ratingValue: product.rating,
        reviewCount: product.reviewsCount,
        bestRating: 5,
        worstRating: 1,
      },
    }),
  };

  const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Accueil', item: `${SITE_URL}/` },
      { '@type': 'ListItem', position: 2, name: 'Catalogue', item: `${SITE_URL}/catalog` },
      ...(category ? [{ '@type': 'ListItem', position: 3, name: category.name, item: `${SITE_URL}${categoryUrl}` }] : []),
      { '@type': 'ListItem', position: category ? 4 : 3, name, item: canonicalUrl },
    ],
  };

  const secondaryButton = 'inline-flex items-center justify-center gap-2 h-11 px-4 rounded-xl border border-gray-300 bg-white text-gray-900 text-sm font-semibold hover:border-purple-400 transition-colors';

  return (
    <>
      <Helmet>
        <title>{name} — Nengoo</title>
        <meta name="description" content={product.description[language]?.slice(0, 160)} />
        <link rel="canonical" href={canonicalUrl} />

        {/* Open Graph / Facebook / WhatsApp */}
        <meta property="og:type" content="product" />
        <meta property="og:site_name" content="Nengoo" />
        <meta property="og:title" content={name} />
        <meta property="og:description" content={product.description[language]} />
        <meta property="og:image" content={ogImageUrl} />
        <meta property="og:image:secure_url" content={ogImageUrl} />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />
        <meta property="og:url" content={canonicalUrl} />
        <meta property="og:price:amount" content={product.promoPrice || product.price} />
        <meta property="og:price:currency" content="XAF" />

        {/* Twitter */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:url" content={canonicalUrl} />
        <meta name="twitter:title" content={name} />
        <meta name="twitter:description" content={product.description[language]} />
        <meta name="twitter:image" content={ogImageUrl} />

        {/* JSON-LD Structured Data */}
        <script type="application/ld+json">{JSON.stringify(jsonLd)}</script>
        <script type="application/ld+json">{JSON.stringify(breadcrumbJsonLd)}</script>
      </Helmet>
      <div className="min-h-screen bg-gray-50 text-left">
        <Header {...props} />

        <main className="container mx-auto px-4 pt-5 sm:pt-8 pb-14">
          {/* Breadcrumb */}
          <nav aria-label="Fil d'Ariane" className="mb-5 sm:mb-8 text-sm text-gray-500">
            <ol className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <li><Link to="/" className="hover:text-purple-700 hover:underline underline-offset-4">Accueil</Link></li>
              <li aria-hidden="true">/</li>
              <li><Link to="/catalog" className="hover:text-purple-700 hover:underline underline-offset-4">{t.catalogTitle}</Link></li>
              {category && (
                <>
                  <li aria-hidden="true">/</li>
                  <li><Link to={categoryUrl} className="hover:text-purple-700 hover:underline underline-offset-4">{category.name}</Link></li>
                </>
              )}
              <li aria-hidden="true" className="max-sm:hidden">/</li>
              <li className="max-sm:hidden text-gray-800 truncate max-w-[24ch]" aria-current="page">{name}</li>
            </ol>
          </nav>

          <div className="grid lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)] gap-8 lg:gap-12 items-start">
            {/* Photos */}
            <div className="lg:sticky lg:top-24">
              <button
                type="button"
                onClick={() => setOpen(true)}
                aria-label={t.zoomPhoto}
                className="relative block w-full !min-h-0 aspect-square rounded-2xl bg-white border border-gray-200 overflow-hidden cursor-zoom-in"
              >
                <img
                  src={images[selectedImage]}
                  alt={name}
                  className="w-full h-full object-contain"
                  onError={(e) => {
                    e.target.onerror = null;
                    e.target.src = process.env.PUBLIC_URL + '/images/logo-nengoo-web.png';
                  }}
                />
                {discountPercentage > 0 && (
                  <span className="price absolute top-3 left-3 bg-red-600 text-white px-2.5 py-1 text-base rounded-lg">
                    -{discountPercentage} %
                  </span>
                )}
              </button>
              {images.length > 1 && (
                <div className="mt-3 flex gap-2 overflow-x-auto hide-scrollbar">
                  {images.map((img, index) => (
                    <button
                      key={index}
                      type="button"
                      onClick={() => setSelectedImage(index)}
                      aria-label={t.photoOf(index + 1)}
                      aria-pressed={selectedImage === index}
                      className={`shrink-0 !min-h-0 !min-w-0 w-[4.5rem] h-[4.5rem] rounded-lg overflow-hidden bg-white border-2 transition-colors ${
                        selectedImage === index ? 'border-purple-600' : 'border-transparent hover:border-gray-300'
                      }`}
                    >
                      <img
                        src={img}
                        alt=""
                        className="w-full h-full object-cover"
                        loading="lazy"
                        onError={(e) => {
                          e.target.onerror = null;
                          e.target.src = process.env.PUBLIC_URL + '/images/logo-nengoo-web.png';
                        }}
                      />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Infos et achat */}
            <div>
              {category && (
                <Link to={categoryUrl} className="text-sm font-semibold text-purple-700 hover:underline underline-offset-4">
                  {category.name}
                </Link>
              )}
              <h1 className="mt-1 text-3xl sm:text-4xl font-extrabold">{name}</h1>

              {product.reviewsCount > 0 && (
                <a href="#avis" className="mt-2 inline-flex items-center gap-2 text-sm text-gray-600 hover:text-purple-700">
                  <StarRating rating={product.rating} interactive={false} size="text-lg" />
                  <span>{t.reviewsCount(product.reviewsCount)}</span>
                </a>
              )}

              {/* Price */}
              <div className="mt-5 flex flex-wrap items-baseline gap-x-3 gap-y-1">
                {hasPromo ? (
                  <>
                    <span className="price text-4xl sm:text-5xl text-red-600">
                      {formatPrice(product.promoPrice)}
                    </span>
                    <span className="text-lg text-gray-500 line-through">
                      {formatPrice(product.price)}
                    </span>
                  </>
                ) : (
                  <span className="price text-4xl sm:text-5xl text-purple-800">
                    {formatPrice(product.price)}
                  </span>
                )}
              </div>

              <p className={`mt-3 inline-flex items-center gap-2 text-sm font-semibold ${product.inStock ? 'text-green-700' : 'text-gray-500'}`}>
                <span className={`w-2 h-2 rounded-full ${product.inStock ? 'bg-green-600' : 'bg-gray-400'}`} aria-hidden="true" />
                {product.inStock ? t.inStock : t.outOfStock}
              </p>

              {/* Quantité et panier */}
              <div className="mt-6 flex flex-wrap gap-3">
                <div className="inline-flex items-center h-12 rounded-xl border border-gray-300 bg-white" role="group" aria-label={t.quantity}>
                  <button
                    type="button"
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    aria-label="-1"
                    className="!min-h-0 w-11 h-full text-xl text-gray-700 hover:text-purple-700"
                  >
                    −
                  </button>
                  <span className="price w-10 text-center text-lg" aria-live="polite">{quantity}</span>
                  <button
                    type="button"
                    onClick={() => setQuantity(quantity + 1)}
                    aria-label="+1"
                    className="!min-h-0 w-11 h-full text-xl text-gray-700 hover:text-purple-700"
                  >
                    +
                  </button>
                </div>
                <button
                  onClick={() => addToCart(product, quantity)}
                  disabled={!product.inStock}
                  className="flex-1 min-w-[12rem] h-12 rounded-xl bg-purple-700 hover:bg-purple-800 disabled:bg-gray-300 disabled:text-gray-600 text-white font-bold inline-flex items-center justify-center gap-2 transition-colors"
                >
                  <CartIcon className="w-5 h-5" strokeWidth={2.2} />
                  {t.addToCart}
                </button>
              </div>
              <button
                onClick={() => {
                  addToCart(product, quantity);
                  navigate('/checkout');
                }}
                disabled={!product.inStock}
                className="mt-3 w-full h-12 rounded-xl border-2 border-purple-700 text-purple-800 hover:bg-purple-50 disabled:border-gray-300 disabled:text-gray-500 disabled:bg-transparent font-bold transition-colors"
              >
                {t.buyNow}
              </button>

              {/* Vendeur */}
              {seller && (
                <section className="mt-8 p-5 rounded-xl bg-white border border-gray-200" aria-label={t.soldBy}>
                  <div className="flex items-center gap-4">
                    <div className="shrink-0 w-12 h-12 rounded-full bg-purple-100 text-purple-800 flex items-center justify-center text-xl font-extrabold" aria-hidden="true">
                      {seller.businessName.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs text-gray-500">{t.soldBy}</p>
                      <Link to={`/seller/${seller.id}`} className="block font-bold text-lg leading-tight hover:text-purple-700 truncate">
                        {seller.businessName}
                      </Link>
                      {(seller.city || seller.region) && (
                        <p className="mt-0.5 flex items-center gap-1 text-sm text-gray-600">
                          <PinIcon className="w-4 h-4 shrink-0" />
                          {[seller.city, seller.region].filter(Boolean).join(', ')}
                        </p>
                      )}
                    </div>
                  </div>
                  {seller.description && (
                    <p className="mt-3 text-sm text-gray-600">{seller.description}</p>
                  )}
                  <div className="mt-4 grid sm:grid-cols-2 gap-2">
                    {seller.whatsapp && (
                      <button
                        onClick={handleWhatsAppClick}
                        className="inline-flex items-center justify-center gap-2 h-11 px-4 rounded-xl bg-green-600 hover:bg-green-700 text-white text-sm font-semibold transition-colors"
                      >
                        <WhatsAppIcon className="w-5 h-5" />
                        {t.contactWhatsApp}
                      </button>
                    )}
                    <button onClick={() => setShowSendMessageModal(true)} className={secondaryButton}>
                      {t.sendMessage}
                    </button>
                  </div>
                </section>
              )}

              {/* Partage */}
              <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
                <span className="text-gray-500">{t.share}</span>
                <a
                  href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(canonicalUrl)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-semibold text-gray-800 hover:text-purple-700 hover:underline underline-offset-4"
                >
                  Facebook
                </a>
                <a
                  href={`https://api.whatsapp.com/send?text=${encodeURIComponent(`${name} ${canonicalUrl}`)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-semibold text-gray-800 hover:text-purple-700 hover:underline underline-offset-4"
                >
                  WhatsApp
                </a>
              </div>

              {/* Description */}
              {product.description[language] && (
                <section className="mt-10">
                  <h2 className="text-xl font-extrabold mb-3">{t.description}</h2>
                  <p className="text-gray-700 leading-relaxed whitespace-pre-line max-w-[68ch]">
                    {product.description[language]}
                  </p>
                </section>
              )}
            </div>
          </div>

          {/* Avis */}
          <section id="avis" className="mt-14 scroll-mt-24 max-w-3xl">
            <h2 className="text-2xl font-extrabold mb-5">{t.reviewsTitle}</h2>
            {canReview && !hasAlreadyReviewed && (
              <form onSubmit={handleSubmitReview} className="mb-6 p-5 rounded-xl bg-white border border-gray-200">
                <h3 className="text-lg font-bold mb-4">{t.leaveReview}</h3>
                <fieldset className="mb-4">
                  <legend className="block text-sm font-semibold mb-2">{t.yourRating}</legend>
                  <StarRating rating={newReviewRating} setRating={setNewReviewRating} size="text-3xl" />
                </fieldset>
                <label className="block text-sm font-semibold mb-2" htmlFor="review-comment">{t.yourComment}</label>
                <textarea
                  id="review-comment"
                  value={newReviewComment}
                  onChange={(e) => setNewReviewComment(e.target.value)}
                  className="w-full !rounded-xl border border-gray-300 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  rows="4"
                />
                <button type="submit" className="mt-4 inline-flex items-center h-11 px-5 rounded-full bg-purple-700 hover:bg-purple-800 text-white font-semibold">
                  {t.submitReview}
                </button>
              </form>
            )}
            {hasAlreadyReviewed && (
              <p className="mb-6 p-4 rounded-xl bg-purple-50 text-purple-900 text-sm">{t.alreadyReviewed}</p>
            )}
            {reviews.length > 0 ? (
              <ul className="divide-y divide-gray-200 border-y border-gray-200">
                {reviews.map(review => (
                  <li key={review.id} className="py-5">
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                      <StarRating rating={review.rating} interactive={false} size="text-base" />
                      <span className="font-bold">{review.buyerName}</span>
                      <time className="text-xs text-gray-500" dateTime={review.createdAt}>
                        {new Date(review.createdAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
                      </time>
                    </div>
                    {review.comment && <p className="mt-2 text-gray-700">{review.comment}</p>}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-gray-600">{t.noReviews}</p>
            )}
          </section>

          {/* Related Products */}
          {relatedProducts.length > 0 && (
            <section className="mt-14">
              <div className="flex items-baseline justify-between gap-4 mb-5">
                <h2 className="text-2xl font-extrabold">{t.relatedProducts}</h2>
                {category && (
                  <Link to={categoryUrl} className="shrink-0 text-sm font-semibold text-purple-700 hover:text-purple-900 hover:underline underline-offset-4">
                    {t.viewAll}
                  </Link>
                )}
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-5">
                {relatedProducts.map(relatedProduct => (
                  <ProductCard key={relatedProduct.id} product={relatedProduct} language={language} addToCart={addToCart} />
                ))}
              </div>
            </section>
          )}
        </main>

        <Lightbox
            open={open}
            close={() => setOpen(false)}
            slides={lightboxSlides}
            index={selectedImage}
        />

        {showSendMessageModal && (
            <div
              className="fixed inset-0 z-50 bg-purple-950/60 flex items-end sm:items-center justify-center p-0 sm:p-4"
              onClick={() => setShowSendMessageModal(false)}
            >
                <div
                  className="bg-white w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl p-6 text-left"
                  role="dialog"
                  aria-modal="true"
                  aria-labelledby="message-title"
                  onClick={(e) => e.stopPropagation()}
                >
                    <h2 id="message-title" className="text-xl font-extrabold mb-4">{t.messageTo(seller.businessName)}</h2>
                    <form onSubmit={handleSendMessage}>
                        <textarea
                            className="w-full !rounded-xl border border-gray-300 px-4 py-3 mb-4 focus:outline-none focus:ring-2 focus:ring-purple-500"
                            rows="5"
                            placeholder={t.messagePlaceholder}
                            value={messageToSend}
                            onChange={(e) => setMessageToSend(e.target.value)}
                            autoFocus
                            required
                        ></textarea>
                        <div className="flex justify-end gap-3">
                            <button
                                type="button"
                                onClick={() => setShowSendMessageModal(false)}
                                className="h-11 px-5 rounded-full text-gray-800 font-semibold hover:bg-gray-100"
                            >
                                {t.cancel}
                            </button>
                            <button
                                type="submit"
                                className="h-11 px-5 rounded-full bg-purple-700 hover:bg-purple-800 text-white font-semibold"
                            >
                                {t.send}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        )}

        <Footer language={language} />
      </div>
    </>
  );
};

export default ProductDetail;
