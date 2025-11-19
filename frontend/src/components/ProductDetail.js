
import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { translations, mockProducts, mockSellerData, openWhatsApp, generateProductWhatsAppMessage } from './common';
import { getPublicProduct, getPublicProducts } from '../services/api';
import Header from './Header';
import Footer from './Footer';
import ProductCard from './ProductCard';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:8001/api';

// Product Detail Component
export const ProductDetail = (props) => {
  const { language, addToCart } = props;
  const { id } = useParams();
  const navigate = useNavigate();
  const [selectedImage, setSelectedImage] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [product, setProduct] = useState(null);
  const [relatedProducts, setRelatedProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const t = translations[language];

  useEffect(() => {
    loadProduct();
  }, [id]);

  const loadProduct = async () => {
    setLoading(true);
    setError(null);

    try {
      const productData = await getPublicProduct(id);

      // Adapter les données pour le composant
      const adaptedProduct = {
        id: productData.id,
        name: { fr: productData.name, en: productData.name },
        description: { fr: productData.description || '', en: productData.description || '' },
        price: productData.price,
        category: productData.category,
        images: productData.images?.map(img =>
          `${API_BASE_URL.replace('/api', '')}${img}`
        ) || [],
        image: productData.images?.[0]
          ? `${API_BASE_URL.replace('/api', '')}${productData.images[0]}`
          : '/placeholder-product.jpg',
        rating: productData.rating || 4.5,
        reviews: productData.reviews || 0,
        inStock: productData.stock > 0,
        sellerWhatsApp: productData.seller?.whatsapp || '',
        seller: productData.seller
      };

      setProduct(adaptedProduct);

      // Charger les produits similaires
      const allProducts = await getPublicProducts({ category: productData.category, limit: 20 });
      const similarProducts = allProducts
        .filter(p => p.id !== id)
        .slice(0, 4)
        .map(p => ({
          id: p.id,
          name: { fr: p.name, en: p.name },
          price: p.price,
          image: p.images?.[0]
            ? `${API_BASE_URL.replace('/api', '')}${p.images[0]}`
            : '/placeholder-product.jpg',
          category: p.category,
          inStock: p.stock > 0,
          sellerWhatsApp: p.seller?.whatsapp
        }));

      setRelatedProducts(similarProducts);
      setLoading(false);
    } catch (err) {
      console.error('Error loading product:', err);
      setError(err.message);
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header {...props} />
        <div className="container mx-auto px-4 py-16 text-center">
          <div className="text-4xl mb-4">⏳</div>
          <h2 className="text-2xl font-bold mb-4">Chargement...</h2>
        </div>
        <Footer language={language} />
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header {...props} />
        <div className="container mx-auto px-4 py-16 text-center">
          <h2 className="text-2xl font-bold mb-4">Produit non trouvé</h2>
          <p className="text-gray-600 mb-4">{error || 'Ce produit n\'existe pas ou a été supprimé.'}</p>
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

  const handleWhatsAppContact = () => {
    const message = generateProductWhatsAppMessage(product, language);
    openWhatsApp(product.sellerWhatsApp, message);
  };

  const handleBuyNow = () => {
    // Ajouter le produit au panier avec la quantité sélectionnée
    addToCart(product, quantity);
    // Rediriger vers la page checkout
    navigate('/checkout');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header {...props} />
      
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
                  className="w-full h-96 md:h-[38.75rem] object-cover rounded-lg"
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
              {/* <div className="flex items-center mb-4">
                <div className="flex mr-2">
                  {[...Array(5)].map((_, i) => (
                    <span key={i} className={`text-lg ${i < Math.floor(product.rating) ? 'text-yellow-400' : 'text-gray-300'}`}>
                      ⭐
                    </span>
                  ))}
                </div>
                <span className="text-gray-600">({product.reviews} {t.reviews})</span>
              </div> */}
              
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
                  onClick={handleBuyNow}
                  disabled={!product.inStock}
                  className="w-full bg-red-600 hover:bg-red-700 disabled:bg-gray-400 text-white py-3 px-6 rounded-lg font-semibold transition-colors"
                >
                  {t.buyNow}
                </button>
                
                {/* WhatsApp Contact Button */}
                {product.sellerWhatsApp && (
                  <button
                    onClick={handleWhatsAppContact}
                    className="w-full bg-green-500 hover:bg-green-600 text-white py-3 px-6 rounded-lg font-semibold flex items-center justify-center space-x-2 transition-colors"
                  >
                    <span>📱</span>
                    <span>Contacter le vendeur sur WhatsApp</span>
                  </button>
                )}
              </div>
              
              {/* Seller Info Card */}
              {product.seller && (
                <div className="mt-8 bg-gray-50 rounded-lg p-6">
                  <h3 className="text-lg font-semibold mb-4">Informations Vendeur</h3>
                  <div className="flex max-sm:flex-col items-center space-x-4">
                    <div className="w-16 h-16 rounded-full bg-purple-100 flex items-center justify-center text-2xl">
                      🏪
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold text-lg">
                        {product.seller.businessName || product.seller.name || 'Vendeur'}
                      </h4>
                      {product.seller.city && (
                        <p className="text-sm text-gray-600">📍 {product.seller.city}</p>
                      )}

                      {/* WhatsApp Contact */}
                      {/* {product.seller.whatsapp && (
                        <div className="flex space-x-3 mt-3">
                          <button
                            onClick={() => openWhatsApp(product.seller.whatsapp)}
                            className="bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600 transition-colors flex items-center space-x-2"
                            title="WhatsApp"
                          >
                            <span>📱</span>
                            <span>Contacter sur WhatsApp</span>
                          </button>
                        </div>
                      )} */}
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
