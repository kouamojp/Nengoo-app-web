
import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { translations } from '../../lib/translations';
import { openWhatsApp, generateProductWhatsAppMessage } from '../../lib/utils';
import Header from '../layout/Header';
import Footer from '../layout/Footer';
import ProductCard from '../product/ProductCard';
import Lightbox from "yet-another-react-lightbox";
import "yet-another-react-lightbox/styles.css";

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://127.0.0.1:8001/api';

const StarRating = ({ rating, setRating, interactive = true }) => {
    const [hover, setHover] = useState(0);
    return (
        <div className="flex space-x-1">
            {[...Array(5)].map((_, index) => {
                const starValue = index + 1;
                return (
                    <button
                        type="button"
                        key={starValue}
                        className={`text-2xl ${interactive ? 'cursor-pointer' : ''}`}
                        onClick={() => interactive && setRating(starValue)}
                        onMouseEnter={() => interactive && setHover(starValue)}
                        onMouseLeave={() => interactive && setHover(0)}
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

const ProductDetail = (props) => {
  const { language, addToCart, user } = props;
  const { id } = useParams();
  const navigate = useNavigate();
  const [selectedImage, setSelectedImage] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [product, setProduct] = useState(null);
  const [relatedProducts, setRelatedProducts] = useState([]);
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
      const productResponse = await fetch(`${API_BASE_URL}/products/${id}`);
      if (!productResponse.ok) {
        if (productResponse.status === 404) setProduct(null);
        else throw new Error(`HTTP error! status: ${productResponse.status}`);
        return;
      }
      const productData = await productResponse.json();
      const adaptedProduct = {
        ...productData,
        name: { [language]: productData.name },
        description: { [language]: productData.description },
        image: productData.images && productData.images.length > 0 ? productData.images[0] : process.env.PUBLIC_URL + '/images/logo-nengoo.png',
        images: productData.images || [],
        inStock: productData.stock > 0,
        reviews: productData.reviewsCount || 0,
        rating: productData.rating || 0,
      };
      setProduct(adaptedProduct);

      // Fetch related info
      if (productData.category) fetchRelatedProducts(productData.category, productData.id);
      if (productData.sellerId) fetchSeller(productData.sellerId);
      
      // Fetch reviews
      const reviewsResponse = await fetch(`${API_BASE_URL}/products/${id}/reviews`);
      if (reviewsResponse.ok) {
        const reviewsData = await reviewsResponse.json();
        setReviews(reviewsData);
      }

      // Check if user can review
      if (user && user.type === 'buyer') {
        const canReviewResponse = await fetch(`${API_BASE_URL}/products/${id}/can-review`, {
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
  }, [id, language, user]);
  
  const fetchRelatedProducts = async (category, currentProductId) => {
      try {
        const response = await fetch(`${API_BASE_URL}/products`);

        if (!response.ok) return;

        const data = await response.json();
        const filtered = data
          .filter(p => p.category === category && p.id !== currentProductId)
          .slice(0, 4)
          .map(p => ({
            ...p,
            name: { [language]: p.name },
            description: { [language]: p.description },
            image: p.images && p.images.length > 0 ? p.images[0] : process.env.PUBLIC_URL + '/images/logo-nengoo.png',
            inStock: p.stock > 0,
            reviews: p.reviewsCount || 0,
            rating: p.rating || 0,
          }));

        setRelatedProducts(filtered);
      } catch (error) {
        console.error("❌ [ProductDetail] Erreur produits similaires:", error);
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

  const handleSubmitReview = async (e) => {
    e.preventDefault();
    if (newReviewRating === 0) {
        alert("Veuillez sélectionner une note.");
        return;
    }
    try {
        const response = await fetch(`${API_BASE_URL}/products/${id}/reviews`, {
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
      return <div>Chargement...</div>;
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header {...props} />
        <div className="container mx-auto px-4 py-16 text-center">
          <h2 className="text-2xl font-bold mb-4">Produit non trouvé</h2>
          <Link to="/catalog" className="text-purple-600 hover:text-purple-700">
            ← Retour au catalogue
          </Link>
        </div>
        <Footer language={language} />
      </div>
    );
  }
  
  const formatPrice = (price) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'XAF',
      minimumFractionDigits: 0,
    }).format(price);
  };

  const images = product.images.length > 0 ? product.images : [process.env.PUBLIC_URL + '/images/logo-nengoo.png'];
  const lightboxSlides = images.map(img => ({ src: img }));

  const discountPercentage = product.promoPrice && product.price > product.promoPrice
    ? Math.round(((product.price - product.promoPrice) / product.price) * 100)
    : 0;

  const getAbsoluteImageUrl = (url) => {
    if (!url) return '';
    if (url.startsWith('http')) return url;
    return `${window.location.origin}${url.startsWith('/') ? '' : '/'}${url}`;
  };

  const ogImageUrl = getAbsoluteImageUrl(images[0]);

  return (
    <>
      <Helmet>
        <title>{product.name[language]}</title>
        <meta name="description" content={product.description[language]} />
        
        {/* Open Graph / Facebook / WhatsApp */}
        <meta property="og:type" content="product" />
        <meta property="og:site_name" content="Nengoo" />
        <meta property="og:title" content={product.name[language]} />
        <meta property="og:description" content={product.description[language]} />
        <meta property="og:image" content={ogImageUrl} />
        <meta property="og:image:secure_url" content={ogImageUrl} />
        <meta property="og:url" content={window.location.href} />
        <meta property="og:price:amount" content={product.promoPrice || product.price} />
        <meta property="og:price:currency" content="XAF" />
        
        {/* Twitter */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={product.name[language]} />
        <meta name="twitter:description" content={product.description[language]} />
        <meta name="twitter:image" content={ogImageUrl} />
      </Helmet>
      <div className="min-h-screen bg-gray-50">
        <Header {...props} />
        
        {/* Modal, Breadcrumb, etc. */}
        
        <div className="container mx-auto px-4 py-8">
          {/* Breadcrumb */}
          <nav className="mb-8 text-sm">
            <Link to="/" className="text-purple-600 hover:text-purple-700">Accueil</Link>
            <span className="mx-2">›</span>
            <Link to="/catalog" className="text-purple-600 hover:text-purple-700">Catalogue</Link>
            <span className="mx-2">›</span>
            <Link to={`/catalog/${product.category}`} className="text-purple-600 hover:text-purple-700">{t[product.category]}</Link>
            <span className="mx-2">›</span>
            <span className="text-gray-600">{product.name[language]}</span>
          </nav>
          
          <div className="bg-white rounded-lg shadow-lg overflow-hidden">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Product Images */}
              <div className="p-6">
                <div className="mb-4" onClick={() => setOpen(true)} style={{ cursor: 'pointer' }}>
                    <img
                        src={images[selectedImage]}
                        alt={product.name[language]}
                        className="w-full h-96 md:h-[30rem] object-cover rounded-lg"
                        onError={(e) => {
                            e.target.onerror = null;
                            e.target.src = process.env.PUBLIC_URL + '/images/logo-nengoo.png';
                        }}
                    />
                </div>
                {images.length > 1 && (
                  <div className="flex space-x-2 overflow-x-auto">
                    {images.map((img, index) => (
                      <img
                        key={index}
                        src={img}
                        alt={`${product.name[language]} ${index + 1}`}
                        className={`w-20 h-20 object-cover rounded cursor-pointer border-2 ${
                          selectedImage === index ? 'border-purple-500' : 'border-gray-200'
                        }`}
                        onClick={() => setSelectedImage(index)}
                        onError={(e) => {
                          e.target.onerror = null;
                          e.target.src = process.env.PUBLIC_URL + '/images/logo-nengoo.png';
                        }}
                      />
                    ))}
                  </div>
                )}
              </div>
              
              {/* Product Info */}
              <div className="p-6">
                <h1 className="text-3xl font-bold mb-4">{product.name[language]}</h1>
                        
                <div className="flex items-center mb-4">
                    <StarRating rating={product.rating} interactive={false} />
                    <span className="text-gray-600 ml-2">({product.reviewsCount} avis)</span>
                </div>

                {/* Price */}
                <div className="mb-6 flex items-baseline">
                  {product.promoPrice && product.promoPrice > 0 ? (
                    <>
                      <span className="text-5xl font-bold text-red-600 mr-4">
                        {formatPrice(product.promoPrice)}
                      </span>
                      <span className="text-2xl text-gray-500 line-through">
                        {formatPrice(product.price)}
                      </span>
                      {discountPercentage > 0 && (
                        <span className="ml-4 px-3 py-1 bg-red-500 text-white text-lg font-semibold rounded-lg">
                          -{discountPercentage}%
                        </span>
                      )}
                    </>
                  ) : (
                    <span className="text-4xl font-bold text-purple-600">
                      {formatPrice(product.price)}
                    </span>
                  )}
                </div>
                
                {/* Stock Status */}
                <div className="mb-6">
                  {product.inStock ? (
                    <span className="inline-flex items-center px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium">
                      ✅ {t.inStock}
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-3 py-1 bg-red-100 text-red-800 rounded-full text-sm font-medium">
                      ❌ {t.outOfStock}
                    </span>
                  )}
                </div>
                
                {/* Quantity Selector */}
                <div className="mb-6">
                  <label className="block text-sm font-medium mb-2">{t.quantity}</label>
                  <div className="flex items-center space-x-3">
                    <button
                      onClick={() => setQuantity(Math.max(1, quantity - 1))}
                      className="bg-gray-200 hover:bg-gray-300 w-10 h-10 rounded-lg flex items-center justify-center"
                    >
                      -
                    </button>
                    <span className="text-xl font-semibold w-12 text-center">{quantity}</span>
                    <button
                      onClick={() => setQuantity(quantity + 1)}
                      className="bg-gray-200 hover:bg-gray-300 w-10 h-10 rounded-lg flex items-center justify-center"
                    >
                      +
                    </button>
                  </div>
                </div>
                
                {/* Action Buttons */}
                <div className="space-y-4">
                  <button
                    onClick={() => addToCart(product, quantity)}
                    disabled={!product.inStock}
                    className="w-full bg-purple-600 hover:bg-purple-700 disabled:bg-gray-400 text-white py-3 px-6 rounded-lg font-semibold transition-colors"
                  >
                    {t.addToCart}
                  </button>
                  <button
                    onClick={() => {
                      //addToCart(product, quantity);
                      navigate('/checkout');
                    }}
                    disabled={!product.inStock}
                    className="w-full bg-red-600 hover:bg-red-700 disabled:bg-gray-400 text-white py-3 px-6 rounded-lg font-semibold transition-colors"
                  >
                    {t.buyNow}
                  </button>
                  
                  {/* WhatsApp Contact Button */}
                  {seller && seller.whatsapp && (
                    <button
                      onClick={() => openWhatsApp(seller.whatsapp, generateProductWhatsAppMessage(product, language))}
                      className="w-full bg-green-500 hover:bg-green-600 text-white py-3 px-6 rounded-lg font-semibold flex items-center justify-center space-x-2 transition-colors"
                    >
                      <span>📱</span>
                      <span>Contacter le vendeur sur WhatsApp</span>
                    </button>
                  )}

                  {seller && (
                    <button
                      onClick={() => setShowSendMessageModal(true)}
                      className="w-full bg-blue-500 hover:bg-blue-600 text-white py-3 px-6 rounded-lg font-semibold flex items-center justify-center space-x-2 transition-colors"
                    >
                      <span>✉️</span>
                      <span>Contacter le vendeur</span>
                    </button>
                  )}
                  
                  {/* Share Buttons */}
                  <div className="flex space-x-2 mt-4">
                    <a
                      href={`https://www.facebook.com/sharer/sharer.php?u=${window.location.href}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-3 px-6 rounded-lg font-semibold flex items-center justify-center space-x-2 transition-colors"
                    >
                      <span>📤</span>
                      <span>Facebook</span>
                    </a>
                    <a
                      href={`https://api.whatsapp.com/send?text=${encodeURIComponent(product.name[language])}%20${encodeURIComponent(window.location.href)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 bg-green-500 hover:bg-green-600 text-white py-3 px-6 rounded-lg font-semibold flex items-center justify-center space-x-2 transition-colors"
                    >
                      <span>📤</span>
                      <span>WhatsApp</span>
                    </a>
                  </div>
                </div>
                
                {/* Seller Info Card */}
                {seller && (
                  <div className="mt-8 bg-gray-50 rounded-lg p-6 text-left">
                    {/* <h3 className="text-lg font-semibold mb-4">Informations Vendeur</h3> */}
                    <div className="flex flex-col gap-4 ">
                      <div className="w-16 h-16 rounded-full bg-purple-600 flex items-center justify-center text-white text-2xl font-bold">
                        {seller.businessName.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1">
                        <h4 className="font-semibold text-lg">{seller.businessName}</h4>
                        <p className="text-sm text-gray-600">{seller.name}</p>
                        <div className="flex items-center space-x-4 text-sm text-gray-600 mt-1">
                          <span className="flex items-center">
                            📍 {seller.city}, {seller.region}
                          </span>
                        </div>

                        {/* Seller Contact */}
                        <div className="flex space-x-3 mt-3">
                          {seller.whatsapp && (
                            <button
                              onClick={() => openWhatsApp(seller.whatsapp)}
                              className="bg-green-500 text-white px-3 py-1 rounded-lg hover:bg-green-600 transition-colors text-sm flex items-center space-x-1"
                              title="WhatsApp"
                            >
                              <span>📱</span>
                              <span>WhatsApp</span>
                            </button>
                          )}
                          {seller.email && (
                            <a
                              href={`mailto:${seller.email}`}
                              className="bg-blue-500 text-white px-3 py-1 rounded-lg hover:bg-blue-600 transition-colors text-sm flex items-center space-x-1"
                              title="Email"
                            >
                              <span>✉️</span>
                              <span>Email</span>
                            </a>
                          )}
                        </div>

                        {/* Seller Description */}
                        {seller.description && (
                          <p className="text-sm text-gray-600 mt-3">{seller.description}</p>
                        )}
                      </div>
                    </div>
                  </div>
                )}
                
                {/* Product Description */}
                <div className="mt-8">
                  <h3 className="text-xl font-semibold mb-4">{t.description}</h3>
                  <p className="text-gray-700 leading-relaxed">
                    {product.description[language]}
                  </p>
                </div>
              </div>
            </div>
          </div>

            {/* Reviews Section */}
            <div className="mt-16">
                <h3 className="text-2xl font-bold mb-8">Avis des clients</h3>
                {canReview && !hasAlreadyReviewed && (
                    <div className="bg-white rounded-lg shadow-md p-6 mb-8">
                        <h4 className="text-xl font-semibold mb-4">Laissez votre avis</h4>
                        <form onSubmit={handleSubmitReview}>
                            <div className="mb-4">
                                <label className="block text-sm font-medium mb-2">Votre note</label>
                                <StarRating rating={newReviewRating} setRating={setNewReviewRating} />
                            </div>
                            <div className="mb-4">
                                <label className="block text-sm font-medium mb-2">Votre commentaire</label>
                                <textarea
                                    value={newReviewComment}
                                    onChange={(e) => setNewReviewComment(e.target.value)}
                                    className="w-full border border-gray-300 rounded-lg px-4 py-2"
                                    rows="4"
                                />
                            </div>
                            <button type="submit" className="bg-purple-600 text-white px-6 py-2 rounded-lg">
                                Soumettre l'avis
                            </button>
                        </form>
                    </div>
                )}
                {hasAlreadyReviewed && (
                    <div className="bg-blue-50 border border-blue-200 text-blue-800 rounded-lg p-4 mb-8">
                        Vous avez déjà laissé un avis pour ce produit.
                    </div>
                )}
                <div className="space-y-6">
                    {reviews.length > 0 ? (
                        reviews.map(review => (
                            <div key={review.id} className="bg-white rounded-lg shadow-md p-6">
                                <div className="flex items-center mb-2">
                                    <StarRating rating={review.rating} interactive={false} />
                                    <span className="font-bold ml-4">{review.buyerName}</span>
                                </div>
                                <p className="text-gray-600">{review.comment}</p>
                                <p className="text-xs text-gray-400 mt-2">{new Date(review.createdAt).toLocaleDateString()}</p>
                            </div>
                        ))
                    ) : (
                        <p>Aucun avis pour ce produit pour le moment.</p>
                    )}
                </div>
            </div>
          
          {/* Related Products */}
          {relatedProducts.length > 0 && (
            <div className="mt-16">
              <h3 className="text-2xl font-bold mb-8">Produits similaires</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {relatedProducts.map(relatedProduct => (
                  <ProductCard key={relatedProduct.id} product={relatedProduct} language={language} addToCart={addToCart} />
                ))}
              </div>
            </div>
          )}
        </div>
        
        <Lightbox
            open={open}
            close={() => setOpen(false)}
            slides={lightboxSlides}
            initialIndex={selectedImage}
        />

        {showSendMessageModal && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
                <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-md">
                    <h2 className="text-2xl font-bold mb-4">Contacter {seller.businessName}</h2>
                    <form onSubmit={handleSendMessage}>
                        <textarea
                            className="w-full border border-gray-300 rounded-lg p-2 mb-4"
                            rows="5"
                            placeholder="Votre message..."
                            value={messageToSend}
                            onChange={(e) => setMessageToSend(e.target.value)}
                            required
                        ></textarea>
                        <div className="flex justify-end gap-4">
                            <button
                                type="button"
                                onClick={() => setShowSendMessageModal(false)}
                                className="bg-gray-300 hover:bg-gray-400 text-black py-2 px-4 rounded-lg"
                            >
                                Annuler
                            </button>
                            <button
                                type="submit"
                                className="bg-purple-600 hover:bg-purple-700 text-white py-2 px-4 rounded-lg"
                            >
                                Envoyer
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
