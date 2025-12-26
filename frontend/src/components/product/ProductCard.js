
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { translations } from '../../lib/translations';
import { openWhatsApp, generateProductWhatsAppMessage, createSlug } from '../../lib/utils';

const ProductCard = ({ product, language, addToCart }) => {
  const navigate = useNavigate();
  const t = translations[language];

  const handleProductClick = () => {
    navigate(`/product/${product.slug || product.id}`);
  };

  const truncateProductName = (name, maxLength) => {
    if (name.length > maxLength) {
      return name.substring(0, maxLength) + '...';
    }
    return name;
  };
  
  const formatPrice = (price) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'XAF',
      minimumFractionDigits: 0,
    }).format(price);
  };

  const handleWhatsAppContact = () => {
    const message = generateProductWhatsAppMessage(product, language);
    openWhatsApp(product.sellerWhatsApp, message);
  };

  const isNew = (creationDate) => {
    if (!creationDate) return false;
    const twoDaysAgo = new Date();
    twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
    return new Date(creationDate) > twoDaysAgo;
  };

  const isProductNew = isNew(product.createdAt);
  const discountPercentage = product.promoPrice && product.price > product.promoPrice
    ? Math.round(((product.price - product.promoPrice) / product.price) * 100)
    : 0;

  return (
    <div className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow overflow-hidden group">
      <div className="relative overflow-hidden">
        <img
          src={product.image}
          alt={product.name[language]}
          className="w-full h-48 object-cover group-hover:scale-105 transition-transform duration-300 cursor-pointer"
          onClick={handleProductClick}
          onError={(e) => {
            e.target.onerror = null; // Prevent infinite loop if fallback also fails
            e.target.src = process.env.PUBLIC_URL + '/images/logo-nengoo.png';
          }}
        />
        {isProductNew ? (
          <span className="absolute top-2 left-2 bg-blue-500 text-white px-2 py-1 text-xs rounded">
            New
          </span>
        ) : product.inStock ? (
          <span className="absolute top-2 left-2 bg-green-500 text-white px-2 py-1 text-xs rounded">
            {t.inStock}
          </span>
        ) : (
          <span className="absolute top-2 left-2 bg-red-500 text-white px-2 py-1 text-xs rounded">
            {t.outOfStock}
          </span>
        )}
        {discountPercentage > 0 && (
          <span className="absolute top-2 right-2 bg-red-500 text-white px-2 py-1 text-xs rounded">
            -{discountPercentage}%
          </span>
        )}
        {/* <div className="absolute top-2 right-2 flex space-x-1">
          {[...Array(5)].map((_, i) => (
            <span key={i} className={`text-sm ${i < Math.floor(product.rating) ? 'text-yellow-400' : 'text-gray-300'}`}>
              ⭐
            </span>
          ))}
        </div> */}
      </div>
            
      <div className="p-4">
                <h3
                  className="font-semibold tracking-[.01rem] text-[.95rem] leading-[1.3rem] line- sm:text-lg mb-2 cursor-pointer hover:text-purple-600 transition-colors max-sm:min-h-10"
                  onClick={handleProductClick}
                >
                  {truncateProductName(product.name[language], 25)}
                </h3>        {/* <p className="text-gray-600 text-sm mb-2">
          {product.reviews} {t.reviews} • {product.rating} ⭐
        </p> */}
        <div className="max-sm:flex-col flex justify-between items-center mb-3 mt-3">
          <div className="flex items-baseline">
            {product.promoPrice && product.promoPrice > 0 ? (
              <>
                <span className="text-xl max-md:text-[1rem] font-bold text-red-600 mr-2">
                  {formatPrice(product.promoPrice)}
                </span>
                <span className="text-sm max-md:text-[.6rem] text-gray-500 line-through">
                  {formatPrice(product.price)}
                </span>
              </>
            ) : (
              <span className="text-xl font-bold text-purple-600">
                {formatPrice(product.price)}
              </span>
            )}
          </div>
          <button
            onClick={() => addToCart(product)}
            disabled={!product.inStock}
            className="bg-purple-600 max-sm:mt-4 hover:bg-purple-700 disabled:bg-gray-400 text-white px-3 py-1.5 text-sm rounded-lg transition-colors"
          >
            {t.addToCart}
          </button>
        </div>
        {/* WhatsApp Contact Button */}
        {product.sellerWhatsApp && (
          <button
            onClick={handleWhatsAppContact}
            className="w-full bg-green-500 hover:bg-green-600 text-white px-3 py-2 text-sm rounded-lg flex items-center justify-center space-x-2 transition-colors"
          >
            <span>📱</span>
            <span>Contacter sur WhatsApp</span>
          </button>
        )}
      </div>
    </div>
  );
};

export default ProductCard;
