
import React, { useState, useEffect } from 'react';
import CityDatalist from '../ui/CityDatalist';
import { CITIES_DATALIST_ID } from '../../lib/cities';
import { Link, useNavigate } from 'react-router-dom';
import { translations } from '../../lib/translations';
import Header from '../layout/Header';
import Footer from '../layout/Footer';

const inputClass = 'w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-purple-500';

// Champ avec libellé visible (pas de libellé dans le placeholder)
const Field = ({ label, hint, required, className = '', children }) => (
  <label className={`block text-left ${className}`}>
    <span className="block text-sm font-semibold text-gray-800 mb-1">
      {label}{required && <span className="text-red-600" aria-hidden="true"> *</span>}
    </span>
    {children}
    {hint && <span className="block text-xs text-gray-500 mt-1">{hint}</span>}
  </label>
);

const Checkout = (props) => {
  const { language, cartItems, clearCart, user } = props;
  const navigate = useNavigate();
  const t = translations[language];

  // Commande sans compte : un nom et un téléphone suffisent
  const [formData, setFormData] = useState({
    firstName: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    neighborhood: '',
    landmark: '',
    paymentMethod: 'cashOnDelivery',
    deliveryOption: 'home', // 'home' or 'pickup'
    selectedPickupPoint: ''
  });
  const [pickupPoints, setPickupPoints] = useState([]);
  const [shippingCost, setShippingCost] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  // Commandes créées : écran de confirmation avec leurs numéros
  const [placedOrders, setPlacedOrders] = useState(null);

  const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://127.0.0.1:8001/api';

  useEffect(() => {
    if (user) {
      setFormData(prevData => ({
        ...prevData,
        firstName: user.name || '',
        email: user.email || '',
        phone: user.whatsapp || ''
      }));
    }
  }, [user]);

  useEffect(() => {
    const fetchAndCalculateShipping = async () => {
      if (formData.deliveryOption === 'pickup') {
        setShippingCost(0);
        return;
      }

      // 1. Get unique seller IDs from cart
      const sellerIds = [...new Set(cartItems.map(item => item.sellerId))];

      // 2. Fetch each seller and determine their shipping cost
      const sellerShippingPromises = sellerIds.map(async (sellerId) => {
        try {
          const sellerRes = await fetch(`${API_BASE_URL}/sellers/${sellerId}`);
          if (sellerRes.ok) {
            const seller = await sellerRes.json();
            // Use seller's price if it exists as a number and is greater than 0
            if (typeof seller.deliveryPrice === 'number' && seller.deliveryPrice > 0) {
              return seller.deliveryPrice;
            }
          }
          return 0; // Fallback for this seller
        } catch (e) {
          console.error(`Could not fetch seller ${sellerId}`, e);
          return 0; // Fallback on error
        }
      });

      // 3. Sum up all shipping costs
      const shippingCosts = await Promise.all(sellerShippingPromises);
      const totalShipping = shippingCosts.reduce((acc, cost) => acc + cost, 0);

      setShippingCost(totalShipping);
    };

    fetchAndCalculateShipping();
  }, [cartItems, formData.deliveryOption, API_BASE_URL]);

  useEffect(() => {
    const fetchPickupPoints = async () => {
      try {
        // Liste publique : aucun en-tête d'identité
        const response = await fetch(`${API_BASE_URL}/pickup-points`);
        if (response.ok) {
          const data = await response.json();
          setPickupPoints(data);
        } else {
          console.error('Failed to fetch pickup points');
        }
      } catch (error) {
        console.error('Error fetching pickup points:', error);
      }
    };
    fetchPickupPoints();
  }, [API_BASE_URL]);

  const formatPrice = (price) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'XAF',
      minimumFractionDigits: 0,
    }).format(price);
  };

  const subtotal = cartItems.reduce((sum, item) => {
    const priceToUse = (item.promoPrice && item.promoPrice > 0) ? item.promoPrice : item.price;
    return sum + (priceToUse * item.quantity);
  }, 0);
  const total = subtotal + shippingCost;

  const handleInputChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (formData.deliveryOption === 'pickup' && !formData.selectedPickupPoint) {
      setError('Choisissez un point de retrait.');
      return;
    }
    setError('');
    setSubmitting(true);

    // Map cartItems to the format expected by the backend
    const preparedCartItems = cartItems.map(item => ({
      id: item.id.toString(), // Ensure id is a string
      quantity: item.quantity
    }));

    const checkoutPayload = {
      ...formData,
      email: formData.email.trim() || null,
      cartItems: preparedCartItems
    };

    try {
      const response = await fetch(`${API_BASE_URL}/checkout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(checkoutPayload),
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.detail || 'La commande a échoué. Réessayez.');
      }

      setPlacedOrders(data);
      clearCart();
      window.scrollTo({ top: 0 });
    } catch (error) {
      setError(error.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (placedOrders) {
    const trackUrl = (order) => `/suivi-commande?commande=${encodeURIComponent(order.id)}&tel=${encodeURIComponent(formData.phone)}`;
    return (
      <div className="min-h-screen bg-gray-50">
        <Header {...props} />
        <main className="container mx-auto px-4 py-10 max-w-xl">
          <div className="bg-white rounded-2xl border border-gray-200 p-6 sm:p-8 text-left">
            <h1 className="text-3xl font-bold text-purple-950">{t.orderPlaced}</h1>
            <p className="mt-2 text-gray-700">{t.orderPlacedText(placedOrders.length)}</p>
            <ul className="mt-6 divide-y divide-gray-200 border-y border-gray-200">
              {placedOrders.map(order => (
                <li key={order.id} className="py-4 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-xs text-gray-500">{t.orderNumber} · {order.sellerName}</p>
                    <p className="text-lg font-bold tabular-nums">{order.id}</p>
                    <p className="text-sm text-gray-600">{formatPrice(order.totalAmount)}</p>
                  </div>
                  <Link to={trackUrl(order)} className="text-sm font-semibold text-purple-700 hover:underline underline-offset-4">
                    {t.trackOrder}
                  </Link>
                </li>
              ))}
            </ul>
            <p className="mt-6 text-gray-700">{t.orderNextStep}</p>
            <button
              type="button"
              onClick={() => navigate('/')}
              className="mt-6 w-full bg-purple-600 hover:bg-purple-700 text-white py-3 px-6 rounded-lg font-semibold transition-colors"
            >
              {t.continueShopping}
            </button>
          </div>
        </main>
        <Footer language={language} />
      </div>
    );
  }

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
              {/* Coordonnées */}
              <div className="bg-white rounded-lg shadow-md p-6 mb-8">
                <h3 className="text-xl font-bold mb-6 text-left">{t.yourDetails}</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Field label={t.fullName} required>
                    <input type="text" name="firstName" value={formData.firstName} onChange={handleInputChange}
                      autoComplete="name" required className={inputClass} />
                  </Field>
                  <Field label={t.phone} required hint={t.phoneHint}>
                    <input type="tel" name="phone" value={formData.phone} onChange={handleInputChange}
                      autoComplete="tel" placeholder="+237 6XX XX XX XX" required readOnly={!!user?.whatsapp} className={inputClass} />
                  </Field>
                  <Field label={t.emailOptional} className="sm:col-span-2">
                    <input type="email" name="email" value={formData.email} onChange={handleInputChange}
                      autoComplete="email" className={inputClass} />
                  </Field>
                </div>
              </div>

              {/* Shipping Information */}
              <div className="bg-white rounded-lg shadow-md p-6 mb-8">
                <h3 className="text-xl font-bold mb-6 text-left">{t.shippingInfo}</h3>

                {/* Delivery Options */}
                <div className="mb-6">
                  <div className="space-y-3">
                    <label className="flex items-center p-4 border rounded-lg hover:bg-gray-50 cursor-pointer text-left">
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

                    <label className="flex items-center p-4 border rounded-lg hover:bg-gray-50 cursor-pointer text-left">
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
                    <p className="block text-sm font-medium mb-3 text-left">Choisir un Point de Retrait</p>
                    <div className="space-y-3 max-h-64 overflow-y-auto">
                      {pickupPoints.map(point => (
                        <label key={point.id} className="flex items-start p-4 border rounded-lg hover:bg-gray-50 cursor-pointer">
                          <input
                            type="radio"
                            name="selectedPickupPoint"
                            value={point.id.toString()}
                            checked={formData.selectedPickupPoint === point.id.toString()}
                            onChange={handleInputChange}
                            className="mr-3 mt-1"
                          />
                          <div className="flex-1 text-left">
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

                {/* Adresse : ville, quartier et point de repère suffisent */}
                {formData.deliveryOption === 'home' && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Field label={t.city} required>
                      <input type="text" name="city" list={CITIES_DATALIST_ID} autoComplete="address-level2"
                        value={formData.city} onChange={handleInputChange} required className={inputClass} />
                      <CityDatalist />
                    </Field>
                    <Field label={t.neighborhood} required>
                      <input type="text" name="neighborhood" value={formData.neighborhood} onChange={handleInputChange}
                        autoComplete="address-level3" required className={inputClass} />
                    </Field>
                    <Field label={t.landmark} hint={t.landmarkHint} className="sm:col-span-2">
                      <input type="text" name="landmark" value={formData.landmark} onChange={handleInputChange}
                        className={inputClass} />
                    </Field>
                    <Field label={t.addressOptional} className="sm:col-span-2">
                      <input type="text" name="address" value={formData.address} onChange={handleInputChange}
                        autoComplete="street-address" className={inputClass} />
                    </Field>
                  </div>
                )}
              </div>

              {/* Payment Method */}
              <div className="bg-white rounded-lg shadow-md p-6 mb-8">
                <h3 className="text-xl font-bold mb-6 text-left">{t.paymentMethod}</h3>
                <div className="flex items-center p-4 border rounded-lg">
                  <span className="text-xl mr-3" aria-hidden="true">💰</span>
                  <span className="font-medium">{t.cashOnDelivery}</span>
                </div>
              </div>

              {error && (
                <p role="alert" className="mb-4 p-4 rounded-lg bg-red-50 border border-red-200 text-red-800 text-left">{error}</p>
              )}
              <button
                type="submit"
                disabled={submitting}
                className="w-full bg-purple-600 hover:bg-purple-700 disabled:opacity-60 text-white py-3 px-6 rounded-lg font-semibold transition-colors"
              >
                {submitting ? '…' : `${t.placeOrder} · ${formatPrice(total)}`}
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
                    <span className="font-medium">
                      {formatPrice(((item.promoPrice && item.promoPrice > 0) ? item.promoPrice : item.price) * item.quantity)}
                    </span>
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
                  <span>{shippingCost === 0 ? 'Gratuit' : formatPrice(shippingCost)}</span>
                </div>
                {formData.deliveryOption === 'pickup' && formData.selectedPickupPoint && (
                  <div className="pt-2 border-t">
                    <p className="text-sm font-medium text-purple-600">Point de retrait:</p>
                    <p className="text-sm text-gray-600">
                      {pickupPoints.find(p => p.id.toString() === formData.selectedPickupPoint)?.name}
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
