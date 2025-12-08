
import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { translations } from '../../lib/translations';
import Header from '../layout/Header';
import Footer from '../layout/Footer';

const ShoppingCart = (props) => {
  const { language, cartItems, updateCartQuantity, removeFromCart, clearCart } = props;
  const navigate = useNavigate();
  const t = translations[language];
  
  const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://127.0.0.1:8001/api';
  const [backendShippingPrice, setBackendShippingPrice] = useState(2500);

  useEffect(() => {
    const fetchShippingPrice = async () => {
        try {
            const response = await fetch(`${API_BASE_URL}/settings/shipping`);
            if (response.ok) {
                const data = await response.json();
                setBackendShippingPrice(data.price);
            } else {
                console.error('Failed to fetch shipping price');
            }
        } catch (error) {
            console.error('Error fetching shipping price:', error);
        }
    };
    fetchShippingPrice();
  }, []);
  
  const formatPrice = (price) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'XAF',
      minimumFractionDigits: 0,
    }).format(price);
  };
  
  const subtotal = cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const shipping = subtotal > 50000 ? 0 : backendShippingPrice; // Free shipping over 50,000 XAF
  const tax = 0; // 10% tax
  const total = subtotal + shipping + tax;

  if (cartItems.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header {...props} />
        <div className="container mx-auto px-4 py-16">
          <div className="text-center">
            <div className="text-6xl mb-4">🛒</div>
            <h2 className="text-2xl font-bold mb-4">{t.emptyCart}</h2>
            <p className="text-gray-600 mb-8">Découvrez nos produits et ajoutez-les à votre panier.</p>
            <Link
              to="/catalog"
              className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-lg font-semibold transition-colors"
            >
              {t.continueShipping}
            </Link>
          </div>
        </div>
        <Footer language={language} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header {...props} />
      
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-8">{t.shoppingCart}</h1>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Cart Items */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow-md">
              {cartItems.map((item, index) => (
                <div key={item.id} className={`p-6 ${index !== cartItems.length - 1 ? 'border-b' : ''}`}>
                  <div className="flex flex-col sm:flex-row items-center space-y-4 sm:space-y-0 sm:space-x-4">
                    <img
                      src={item.image}
                      alt={item.name[language]}
                      className="w-20 h-20 object-cover rounded-lg"
                    />
                    
                    <div className="flex-1 text-center sm:text-left">
                      <h3 className="font-semibold text-lg">{item.name[language]}</h3>
                      <p className="text-gray-600">{formatPrice(item.price)}</p>
                    </div>
                    
                    <div className="flex items-center space-x-3">
                      <button
                        onClick={() => updateCartQuantity(item.id, item.quantity - 1)}
                        className="bg-gray-200 hover:bg-gray-300 w-8 h-8 rounded-lg flex items-center justify-center"
                      >
                        -
                      </button>
                      <span className="font-semibold w-8 text-center">{item.quantity}</span>
                      <button
                        onClick={() => updateCartQuantity(item.id, item.quantity + 1)}
                        className="bg-gray-200 hover:bg-gray-300 w-8 h-8 rounded-lg flex items-center justify-center"
                      >
                        +
                      </button>
                    </div>
                    
                    <div className="text-right">
                      <p className="font-semibold text-lg">
                        {formatPrice(item.price * item.quantity)}
                      </p>
                      <button
                        onClick={() => removeFromCart(item.id)}
                        className="text-red-500 hover:text-red-700 text-sm mt-1"
                      >
                        {t.removeItem}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
              
              <div className="p-6">
                <button
                  onClick={clearCart}
                  className="text-red-500 hover:text-red-700 font-semibold"
                >
                  Vider le panier
                </button>
              </div>
            </div>
          </div>
          
          {/* Order Summary */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-md p-6 sticky top-24">
              <h3 className="text-xl font-bold mb-6">Résumé de commande</h3>
              
              <div className="space-y-4">
                <div className="flex justify-between">
                  <span>{t.subtotal}</span>
                  <span>{formatPrice(subtotal)}</span>
                </div>
                
                <div className="flex justify-between">
                  <span>{t.shipping}</span>
                  <span>{shipping === 0 ? 'Gratuit' : formatPrice(shipping)}</span>
                </div>
                
                <hr />
                
                <div className="flex justify-between text-xl font-bold">
                  <span>{t.total}</span>
                  <span>{formatPrice(total)}</span>
                </div>
              </div>
              
              <button
                onClick={() => navigate('/checkout')}
                className="w-full bg-purple-600 hover:bg-purple-700 text-white py-3 px-6 rounded-lg font-semibold mt-6 transition-colors"
              >
                {t.checkout}
              </button>
              
              <Link
                to="/catalog"
                className="block text-center text-purple-600 hover:text-purple-700 mt-4"
              >
                {t.continueShipping}
              </Link>
            </div>
          </div>
        </div>
      </div>
      
      <Footer language={language} />
    </div>
  );
};

export default ShoppingCart;
