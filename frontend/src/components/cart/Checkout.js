
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { translations } from '../../lib/translations';
import { mockSellerData } from '../../lib/mockData';
import Header from '../layout/Header';
import Footer from '../layout/Footer';

const Checkout = (props) => {
  const { language, cartItems, clearCart } = props;
  const navigate = useNavigate();
  const t = translations[language];
  
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    region: '',
    postalCode: '',
    paymentMethod: 'mtnMoney',
    deliveryOption: 'home', // 'home' or 'pickup'
    selectedPickupPoint: ''
  });
  
  const formatPrice = (price) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'XAF',
      minimumFractionDigits: 0,
    }).format(price);
  };
  
  const subtotal = cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const shipping = formData.deliveryOption === 'pickup' ? 0 : (subtotal > 50000 ? 0 : 2500); // Free shipping for pickup or orders over 50,000 XAF
  const tax = 0;
  const total = subtotal + shipping;
  
  const handleInputChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };
  
  const handleSubmit = (e) => {
    e.preventDefault();
    // Mock order processing
    alert('Commande passée avec succès! Vous recevrez une confirmation par email.');
    clearCart();
    navigate('/');
  };
  
  if (cartItems.length === 0) {
    navigate('/cart');
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header {...props} />
      
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-8">Finaliser la commande</h1>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Checkout Form */}
          <div className="lg:col-span-2 space-y-8">
            <form onSubmit={handleSubmit}>
              {/* Billing Information */}
              <div className="bg-white rounded-lg shadow-md p-6 mb-8">
                <h3 className="text-xl font-bold mb-6">{t.billingInfo}</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <input
                    type="text"
                    name="firstName"
                    value={formData.firstName}
                    onChange={handleInputChange}
                    placeholder={t.firstName}
                    required
                    className="border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                  <input
                    type="text"
                    name="lastName"
                    value={formData.lastName}
                    onChange={handleInputChange}
                    placeholder={t.lastName}
                    required
                    className="border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    placeholder={t.email}
                    required
                    className="border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleInputChange}
                    placeholder={t.phone}
                    required
                    className="border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
              </div>
            
              {/* Shipping Information */}
              <div className="bg-white rounded-lg shadow-md p-6 mb-8">
                <h3 className="text-xl font-bold mb-6">{t.shippingInfo}</h3>
                
                {/* Delivery Options */}
                <div className="mb-6">
                  <label className="block text-sm font-medium mb-4">Option de Livraison</label>
                  <div className="space-y-3">
                    <label className="flex items-center p-4 border rounded-lg hover:bg-gray-50 cursor-pointer">
                      <input
                        type="radio"
                        name="deliveryOption"
                        value="home"
                        checked={formData.deliveryOption === 'home'}
                        onChange={handleInputChange}
                        className="mr-3"
                      />
                      <div className="flex items-center">
                        <span className="text-xl mr-3">🏠</span>
                        <div>
                          <span className="font-medium">Livraison à domicile</span>
                          <p className="text-sm text-gray-600">Livraison directe à votre adresse</p>
                        </div>
                      </div>
                    </label>
                    
                    <label className="flex items-center p-4 border rounded-lg hover:bg-gray-50 cursor-pointer">
                      <input
                        type="radio"
                        name="deliveryOption"
                        value="pickup"
                        checked={formData.deliveryOption === 'pickup'}
                        onChange={handleInputChange}
                        className="mr-3"
                      />
                      <div className="flex items-center">
                        <span className="text-xl mr-3">📍</span>
                        <div>
                          <span className="font-medium">Point de retrait</span>
                          <p className="text-sm text-gray-600">Retrait gratuit dans un point Nengoo</p>
                        </div>
                      </div>
                    </label>
                  </div>
                </div>

                {/* Pickup Points Selection */}
                {formData.deliveryOption === 'pickup' && (
                  <div className="mb-6">
                    <label className="block text-sm font-medium mb-3">Choisir un Point de Retrait</label>
                    <div className="space-y-3 max-h-64 overflow-y-auto">
                      {mockSellerData.pickupPoints.map(point => (
                        <label key={point.id} className="flex items-start p-4 border rounded-lg hover:bg-gray-50 cursor-pointer">
                          <input
                            type="radio"
                            name="selectedPickupPoint"
                            value={point.id.toString()}
                            checked={formData.selectedPickupPoint === point.id.toString()}
                            onChange={handleInputChange}
                            className="mr-3 mt-1"
                          />
                          <div className="flex-1">
                            <div className="font-medium text-purple-700">{point.name}</div>
                            <div className="text-sm text-gray-600 mt-1">{point.address}</div>
                            <div className="text-sm text-gray-500 mt-1">
                              📞 {point.phone} • 🕒 {point.hours}
                            </div>
                          </div>
                          <div className="text-xs px-2 py-1 bg-purple-100 text-purple-700 rounded-full">
                            {point.city}
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>
                )}

                {/* Home Delivery Address Fields */}
                {formData.deliveryOption === 'home' && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <input
                      type="text"
                      name="address"
                      value={formData.address}
                      onChange={handleInputChange}
                      placeholder={t.address}
                      required={formData.deliveryOption === 'home'}
                      className="sm:col-span-2 border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                    <input
                      type="text"
                      name="city"
                      value={formData.city}
                      onChange={handleInputChange}
                      placeholder={t.city}
                      required={formData.deliveryOption === 'home'}
                      className="border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                    <input
                      type="text"
                      name="region"
                      value={formData.region}
                      onChange={handleInputChange}
                      placeholder={t.region}
                      required={formData.deliveryOption === 'home'}
                      className="border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                  </div>
                )}
              </div>
            
              {/* Payment Method */}
              <div className="bg-white rounded-lg shadow-md p-6 mb-8">
                <h3 className="text-xl font-bold mb-6">{t.paymentMethod}</h3>
                <div className="space-y-3">
                  {[
                    /* { key: 'mtnMoney', label: t.mtnMoney, icon: '📱' },
                    { key: 'orangeMoney', label: t.orangeMoney, icon: '🍊' },
                    { key: 'creditCard', label: t.creditCard, icon: '💳' }, */
                    { key: 'cashOnDelivery', label: t.cashOnDelivery, icon: '💰' }
                  ].map(method => (
                    <label key={method.key} className="flex items-center p-4 border rounded-lg hover:bg-gray-50 cursor-pointer">
                      <input
                        type="radio"
                        name="paymentMethod"
                        value={method.key}
                        checked={formData.paymentMethod === method.key}
                        onChange={handleInputChange}
                        className="mr-3"
                      />
                      <span className="text-xl mr-3">{method.icon}</span>
                      <span className="font-medium">{method.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              <button
                type="submit"
                className="w-full bg-purple-600 hover:bg-purple-700 text-white py-3 px-6 rounded-lg font-semibold transition-colors"
              >
                {t.placeOrder}
              </button>
            </form>
          </div>
          
          {/* Order Summary */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-md p-6 sticky top-24">
              <h3 className="text-xl font-bold mb-6">Votre commande</h3>
              
              {/* Items */}
              <div className="space-y-4 mb-6">
                {cartItems.map(item => (
                  <div key={item.id} className="flex justify-between items-center">
                    <div className="flex items-center space-x-3">
                      <img src={item.image} alt={item.name[language]} className="w-12 h-12 object-cover rounded" />
                      <div>
                        <p className="font-medium text-sm">{item.name[language]}</p>
                        <p className="text-gray-600 text-xs">Qty: {item.quantity}</p>
                      </div>
                    </div>
                    <span className="font-medium">{formatPrice(item.price * item.quantity)}</span>
                  </div>
                ))}
              </div>
              
              <hr className="my-4" />
              
              {/* Totals */}
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span>{t.subtotal}</span>
                  <span>{formatPrice(subtotal)}</span>
                </div>
                <div className="flex justify-between">
                  <span>
                    {formData.deliveryOption === 'pickup' ? 'Retrait gratuit' : t.shipping}
                  </span>
                  <span>{shipping === 0 ? 'Gratuit' : formatPrice(shipping)}</span>
                </div>
                {formData.deliveryOption === 'pickup' && formData.selectedPickupPoint && (
                  <div className="pt-2 border-t">
                    <p className="text-sm font-medium text-purple-600">Point de retrait:</p>
                    <p className="text-sm text-gray-600">
                      {mockSellerData.pickupPoints.find(p => p.id.toString() === formData.selectedPickupPoint)?.name}
                    </p>
                  </div>
                )}
                <hr />
                <div className="flex justify-between text-lg font-bold">
                  <span>{t.total}</span>
                  <span>{formatPrice(total)}</span>
                </div>
              </div>
              
            </div>
          </div>
        </div>
      </div>
      
      <Footer language={language} />
    </div>
  );
};

export default Checkout;
