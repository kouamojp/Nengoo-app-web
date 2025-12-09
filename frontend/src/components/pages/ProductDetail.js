
import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { translations } from '../../lib/translations';
import { openWhatsApp, generateProductWhatsAppMessage } from '../../lib/utils';
import Header from '../layout/Header';
import Footer from '../layout/Footer';
import ProductCard from '../product/ProductCard';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://127.0.0.1:8001/api';

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

  const t = translations[language];

  useEffect(() => {
    const fetchProduct = async () => {
      try {
        setLoading(true);
        console.log("🔍 [ProductDetail] Récupération du produit ID:", id);
        console.log("🔍 [ProductDetail] API URL:", `${API_BASE_URL}/products/${id}`);

        const response = await fetch(`${API_BASE_URL}/products/${id}`);

        if (!response.ok) {
          if (response.status === 404) {
            console.warn("⚠️ [ProductDetail] Produit non trouvé");
            setProduct(null);
            return;
          }
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        console.log("✅ [ProductDetail] Produit récupéré:", data);

        // Adapter les données pour le frontend
        const adaptedProduct = {
          ...data,
          name: { [language]: data.name },
          description: { [language]: data.description },
          image: data.images && data.images.length > 0 ? data.images[0] : 'https://via.placeholder.com/300',
          images: data.images || [data.images && data.images.length > 0 ? data.images[0] : 'https://via.placeholder.com/300'],
          inStock: data.stock > 0,
          reviews: data.reviewsCount || 0,
          rating: data.rating || 0,
        };

        setProduct(adaptedProduct);

        // Récupérer les produits similaires (même catégorie)
        if (data.category) {
          fetchRelatedProducts(data.category, data.id);
        }

        // Récupérer les informations du vendeur
        if (data.sellerId) {
          fetchSeller(data.sellerId);
        }
      } catch (error) {
        console.error("❌ [ProductDetail] Erreur lors de la récupération du produit:", error);
        setProduct(null);
      } finally {
        setLoading(false);
      }
    };

    const fetchRelatedProducts = async (category, currentProductId) => {
      try {
        console.log("🔍 [ProductDetail] Récupération des produits similaires catégorie:", category);
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
            image: p.images && p.images.length > 0 ? p.images[0] : 'https://via.placeholder.com/300',
            inStock: p.stock > 0,
            reviews: p.reviewsCount || 0,
            rating: p.rating || 0,
          }));

        console.log("✅ [ProductDetail] Produits similaires trouvés:", filtered.length);
        setRelatedProducts(filtered);
      } catch (error) {
        console.error("❌ [ProductDetail] Erreur produits similaires:", error);
      }
    };

    const fetchSeller = async (sellerId) => {
      try {
        console.log("🔍 [ProductDetail] Récupération des infos vendeur ID:", sellerId);
        const response = await fetch(`${API_BASE_URL}/sellers/${sellerId}`);

        if (!response.ok) {
          console.warn("⚠️ [ProductDetail] Vendeur non trouvé");
          return;
        }

        const data = await response.json();
        console.log("✅ [ProductDetail] Vendeur récupéré:", data);
        setSeller(data);
      } catch (error) {
        console.error("❌ [ProductDetail] Erreur récupération vendeur:", error);
      }
    };

    fetchProduct();
  }, [id, language]);
  
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
                'sender_id': user.id,
                'sender_type': user.type,
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

  const images = product.images || [product.image];

  return (
    <div className="min-h-screen bg-gray-50">
      <Header {...props} />
      
      {showSendMessageModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-lg">
            <div className="p-4 border-b flex justify-between items-center">
              <h3 className="text-xl font-bold">Contacter {seller.businessName}</h3>
              <button onClick={() => setShowSendMessageModal(false)} className="text-gray-400 hover:text-gray-600 text-2xl">✕</button>
            </div>
            <div className="p-4">
              <form onSubmit={handleSendMessage}>
                <div className="mb-4">
                  <label className="block text-sm font-medium mb-2">Votre message</label>
                  <textarea
                    value={messageToSend}
                    onChange={(e) => setMessageToSend(e.target.value)}
                    placeholder="Tapez votre message ici..."
                    rows={6}
                    required
                    className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
                <div className="flex justify-end">
                  <button
                    type="submit"
                    className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-lg font-semibold transition-colors"
                  >
                    Envoyer
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

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
              <div className="mb-4">
                <img
                  src={images[selectedImage]}
                  alt={product.name[language]}
                  className="w-full h-96 object-cover rounded-lg"
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
                    />
                  ))}
                </div>
              )}
            </div>
            
            {/* Product Info */}
            <div className="p-6">
              <h1 className="text-3xl font-bold mb-4">{product.name[language]}</h1>
              
              {/* Rating */}
             {/*  <div className="flex items-center mb-4">
                <div className="flex mr-2">
                  {[...Array(5)].map((_, i) => (
                    <span key={i} className={`text-lg ${i < Math.floor(product.rating) ? 'text-yellow-400' : 'text-gray-300'}`}>
                      ⭐
                    </span>
                  ))}
                </div>
                <span className="text-gray-600">({product.reviews} {t.reviews})</span>
              </div>
               */}
              {/* Price */}
              <div className="mb-6">
                <span className="text-4xl font-bold text-purple-600">
                  {formatPrice(product.price)}
                </span>
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
              </div>
              
              {/* Seller Info Card */}
              {seller && (
                <div className="mt-8 bg-gray-50 rounded-lg p-6 text-left">
                  <h3 className="text-lg font-semibold mb-4">Informations Vendeur</h3>
                  <div className="flex items-center space-x-4">
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
        
        {/* Related Products */}
        {relatedProducts.length > 0 && (
          <div className="mt-16">
            <h3 className="text-2xl font-bold mb-8">Produits similaires</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {relatedProducts.map(relatedProduct => (
                <ProductCard key={relatedProduct.id} product={relatedProduct} language={language} addToCart={addToCart} />
              ))}
            </div>
          </div>
        )}
      </div>
      
      <Footer language={language} />
    </div>
  );
};

export default ProductDetail;
