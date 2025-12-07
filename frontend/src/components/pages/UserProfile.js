
import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Header from '../layout/Header';
import Footer from '../layout/Footer';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://127.0.0.1:8001/api';

const OrderDetailModal = ({ order, onClose, formatPrice }) => {
    if (!order) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-lg">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-xl font-bold">Détails de la commande #{order.id}</h3>
                    <button onClick={onClose} className="text-gray-500 hover:text-gray-800">
                        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </div>
                <div className="space-y-4">
                    <p><strong>Date:</strong> {new Date(order.orderedDate).toLocaleDateString()}</p>
                    <p><strong>Statut:</strong> {order.status}</p>
                    <p><strong>Vendeur:</strong> {order.sellerName}</p>
                    <p><strong>Moyen de livraison:</strong> {order.pickupPointName ? `Retrait à "${order.pickupPointName}"` : 'Livraison à domicile'}</p>
                    
                    <div>
                        <p className="font-bold">Produits:</p>
                        <ul className="list-disc list-inside space-y-2 mt-2">
                            {order.products.map(p => (
                                <li key={p.productId}>
                                    {p.name} (x{p.quantity}) - <span className="font-medium">{formatPrice(p.price * p.quantity)}</span>
                                </li>
                            ))}
                        </ul>
                    </div>

                    <div className="text-right font-bold text-lg border-t pt-4">
                        Total: {formatPrice(order.totalAmount)}
                    </div>
                </div>
            </div>
        </div>
    );
};

const UserProfile = (props) => {
    const { language, user, cartItems } = props;
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState('profile');
    const [editMode, setEditMode] = useState(false);
    const [profileData, setProfileData] = useState({
      name: user?.name || '',
      whatsapp: user?.whatsapp || '',
      email: user?.email || '',
      address: '',
      city: '',
      region: ''
    });

    const [userOrders, setUserOrders] = useState([]);
    const [selectedOrder, setSelectedOrder] = useState(null);
    const [loadingOrders, setLoadingOrders] = useState(true);
    
    // Mock saved addresses
    const [savedAddresses, setSavedAddresses] = useState([
      {
        id: 1,
        label: 'Domicile',
        name: 'Marie Kouam',
        address: 'Avenue de la Liberté, Akwa',
        city: 'Douala',
        phone: '+237655123456',
        isDefault: true
      },
      {
        id: 2,
        label: 'Bureau',
        name: 'Marie Kouam',
        address: 'Quartier des Affaires, Bonanjo',
        city: 'Douala',
        phone: '+237655123456',
        isDefault: false
      }
    ]);
  
    // Mock favorite pickup points
    const [favoritePickupPoints, setFavoritePickupPoints] = useState([
      {
        id: 1,
        name: 'Nengoo Point Douala Centre',
        address: 'Avenue de la Liberté, Douala',
        phone: '+237 233 456 789',
        hours: 'Lun-Sam: 8h-18h',
        city: 'Douala'
      },
      {
        id: 2,
        name: 'Nengoo Point Yaoundé Mvan',
        address: 'Quartier Mvan, Yaoundé',
        phone: '+237 222 345 678',
        hours: 'Lun-Sam: 8h-18h',
        city: 'Yaoundé'
      }
    ]);
  
    // Mock payment methods
    const [paymentMethods, setPaymentMethods] = useState([
      {
        id: 1,
        type: 'MTN Mobile Money',
        number: '+237 655 XXX 456',
        isDefault: true
      },
      {
        id: 2,
        type: 'Orange Money',
        number: '+237 699 XXX 789',
        isDefault: false
      }
    ]);

    useEffect(() => {
        const fetchOrders = async () => {
            if (user && user.id) {
                setLoadingOrders(true);
                try {
                    const response = await fetch(`${API_BASE_URL}/orders?buyer_id=${user.id}`);
                    if (!response.ok) {
                        throw new Error('Failed to fetch orders');
                    }
                    const data = await response.json();
                    setUserOrders(data);
                } catch (error) {
                    console.error("Error fetching user orders:", error);
                } finally {
                    setLoadingOrders(false);
                }
            }
        };

        if (activeTab === 'orders') {
            fetchOrders();
        }
    }, [user, activeTab]);
  
    const handleProfileUpdate = () => {
      setEditMode(false);
      alert('Profil mis à jour avec succès!');
    };
  
    const formatPrice = (price) => {
      return new Intl.NumberFormat('fr-FR', {
        style: 'currency',
        currency: 'XAF',
        minimumFractionDigits: 0,
      }).format(price);
    };
  
    const getStatusColor = (status) => {
      switch (status) {
        case 'delivered': return 'bg-green-100 text-green-800';
        case 'shipped': return 'bg-blue-100 text-blue-800';
        case 'processing': return 'bg-yellow-100 text-yellow-800';
        case 'cancelled': return 'bg-red-100 text-red-800';
        default: return 'bg-gray-100 text-gray-800';
      }
    };
  
    const getStatusText = (status) => {
      const statusTexts = {
        delivered: 'Livré',
        shipped: 'En transit',
        processing: 'En cours',
        cancelled: 'Annulé',
        pending: 'En attente'
      };
      return statusTexts[status] || status;
    };
  
    if (!user) {
      return (
        <div className="min-h-screen bg-gray-50">
          <Header {...props} />
          <div className="container mx-auto px-4 py-16 text-center">
            <div className="text-6xl mb-4">🔒</div>
            <h2 className="text-2xl font-bold mb-4">Accès refusé</h2>
            <p className="text-gray-600 mb-8">Veuillez vous connecter pour accéder à votre profil.</p>
            <Link to="/login" className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-lg font-semibold transition-colors">
              Se connecter
            </Link>
          </div>
          <Footer language={language} />
        </div>
      );
    }
    
    return (
      <div className="min-h-screen bg-gray-50">
        <Header {...props} />
        <OrderDetailModal order={selectedOrder} onClose={() => setSelectedOrder(null)} formatPrice={formatPrice} />
        
        <div className="container mx-auto px-4 py-8">
          {/* User Header */}
          <div className="bg-gradient-to-r from-purple-600 to-red-600 text-white rounded-lg p-6 sm:p-8 mb-8">
            <div className="flex flex-col sm:flex-row items-center space-y-4 sm:space-y-0 sm:space-x-6">
              <div className="w-20 h-20 sm:w-24 sm:h-24 bg-white rounded-full flex items-center justify-center">
                <span className="text-4xl sm:text-5xl">👤</span>
              </div>
              <div className="text-center sm:text-left flex-1">
                <h1 className="text-2xl sm:text-3xl font-bold mb-2">{user.name}</h1>
                <p className="opacity-90">{user.whatsapp}</p>
                <p className="text-sm opacity-75 mt-1">Membre depuis {new Date(user.joinDate).toLocaleDateString()}</p>
              </div>
              <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-4">
                {user.type === 'admin' && (
                  <Link to="/admin/dashboard" className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-2 rounded-lg font-semibold transition-colors text-center">
                    📊 Tableau de bord
                  </Link>
                )}
                <Link to="/catalog" className="bg-white text-purple-600 hover:bg-gray-100 px-6 py-2 rounded-lg font-semibold transition-colors text-center">
                  🛍️ Continuer mes achats
                </Link>
              </div>
            </div>
          </div>
  
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            {/* Sidebar Navigation */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-lg shadow-md p-4 sticky top-24">
                <nav className="space-y-2">
                  <button
                    onClick={() => setActiveTab('profile')}
                    className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${
                      activeTab === 'profile' ? 'bg-purple-100 text-purple-700' : 'hover:bg-gray-100'
                    }`}
                  >
                    <span className="text-xl">👤</span>
                    <span className="font-medium">Mes informations</span>
                  </button>
                  
                  <button
                    onClick={() => setActiveTab('orders')}
                    className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${
                      activeTab === 'orders' ? 'bg-purple-100 text-purple-700' : 'hover:bg-gray-100'
                    }`}
                  >
                    <span className="text-xl">📦</span>
                    <span className="font-medium">Mes commandes</span>
                  </button>
                  
                  <button
                    onClick={() => setActiveTab('addresses')}
                    className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${
                      activeTab === 'addresses' ? 'bg-purple-100 text-purple-700' : 'hover:bg-gray-100'
                    }`}
                  >
                    <span className="text-xl">📍</span>
                    <span className="font-medium">Mes adresses</span>
                  </button>
                  
                  <button
                    onClick={() => setActiveTab('pickup')}
                    className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${
                      activeTab === 'pickup' ? 'bg-purple-100 text-purple-700' : 'hover:bg-gray-100'
                    }`}
                  >
                    <span className="text-xl">📍</span>
                    <span className="font-medium">Points de retrait</span>
                  </button>
                  
                  {/* <button
                    onClick={() => setActiveTab('payment')}
                    className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${
                      activeTab === 'payment' ? 'bg-purple-100 text-purple-700' : 'hover:bg-gray-100'
                    }`}
                  >
                    <span className="text-xl">💳</span>
                    <span className="font-medium">Moyens de paiement</span>
                  </button> */}
                </nav>
              </div>
            </div>
  
            {/* Main Content */}
            <div className="lg:col-span-3">
              {/* Personal Information Tab */}
              {activeTab === 'profile' && (
                <div className="bg-white rounded-lg shadow-md p-6">
                  <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-bold">Informations personnelles</h2>
                    <button
                      onClick={() => setEditMode(!editMode)}
                      className="text-purple-600 hover:text-purple-700 font-semibold"
                    >
                      {editMode ? '✕ Annuler' : '✏️ Modifier'}
                    </button>
                  </div>
  
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Nom complet</label>
                      <input
                        type="text"
                        value={profileData.name}
                        onChange={(e) => setProfileData({ ...profileData, name: e.target.value })}
                        disabled={!editMode}
                        className="w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:bg-gray-100"
                      />
                    </div>
  
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Numéro WhatsApp</label>
                      <input
                        type="tel"
                        value={profileData.whatsapp}
                        onChange={(e) => setProfileData({ ...profileData, whatsapp: e.target.value })}
                        disabled={!editMode}
                        className="w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:bg-gray-100"
                      />
                    </div>
  
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                      <input
                        type="email"
                        value={profileData.email}
                        onChange={(e) => setProfileData({ ...profileData, email: e.target.value })}
                        disabled={!editMode}
                        placeholder="votre.email@exemple.com"
                        className="w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:bg-gray-100"
                      />
                    </div>
  
                    {editMode && (
                      <button
                        onClick={handleProfileUpdate}
                        className="w-full bg-purple-600 hover:bg-purple-700 text-white py-3 px-6 rounded-lg font-semibold transition-colors"
                      >
                        Enregistrer les modifications
                      </button>
                    )}
                  </div>
                </div>
              )}
  
              {/* Orders History Tab */}
              {activeTab === 'orders' && (
                <div className="bg-white rounded-lg shadow-md p-6">
                  <h2 className="text-2xl font-bold mb-6">Historique des commandes</h2>
                  
                  {loadingOrders ? <p>Chargement des commandes...</p> : userOrders.length > 0 ? (
                    <div className="space-y-4">
                      {userOrders.map((order) => (
                        <div key={order.id} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4">
                            <div>
                              <h3 className="font-bold text-lg">Commande #{order.id}</h3>
                              <p className="text-sm text-gray-600">Date: {new Date(order.orderedDate).toLocaleDateString()}</p>
                            </div>
                            <span className={`px-3 py-1 rounded-full text-sm font-medium mt-2 sm:mt-0 ${getStatusColor(order.status)}`}>
                              {getStatusText(order.status)}
                            </span>
                          </div>
                          
                          <div className="space-y-2 mb-4">
                            {order.products.map((item, idx) => (
                              <div key={idx} className="flex justify-between text-sm">
                                <span>{item.name} × {item.quantity}</span>
                                <span className="font-medium">{formatPrice(item.price * item.quantity)}</span>
                              </div>
                            ))}
                          </div>
                          
                          <div className="flex justify-between items-center pt-4 border-t">
                            <span className="font-bold text-lg">Total: {formatPrice(order.totalAmount)}</span>
                            <button onClick={() => setSelectedOrder(order)} className="text-purple-600 hover:text-purple-700 font-semibold text-sm">
                              Voir les détails →
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <div className="text-6xl mb-4">📦</div>
                      <p className="text-gray-600 mb-4">Aucune commande pour le moment</p>
                      <Link to="/catalog" className="text-purple-600 hover:text-purple-700 font-semibold">
                        Commencer vos achats →
                      </Link>
                    </div>
                  )}
                </div>
              )}
  
              {/* Delivery Addresses Tab */}
              {activeTab === 'addresses' && (
                <div className="bg-white rounded-lg shadow-md p-6">
                  <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-bold">Adresses de livraison</h2>
                    <button className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg font-semibold transition-colors text-sm">
                      + Ajouter une adresse
                    </button>
                  </div>
  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {savedAddresses.map((address) => (
                      <div key={address.id} className="border rounded-lg p-4 relative">
                        {address.isDefault && (
                          <span className="absolute top-2 right-2 bg-purple-100 text-purple-700 text-xs px-2 py-1 rounded-full font-medium">
                            Par défaut
                          </span>
                        )}
                        <div className="mb-4">
                          <div className="flex items-center space-x-2 mb-2">
                            <span className="text-xl">📍</span>
                            <h3 className="font-bold">{address.label}</h3>
                          </div>
                          <p className="text-sm font-medium">{address.name}</p>
                          <p className="text-sm text-gray-600">{address.address}</p>
                          <p className="text-sm text-gray-600">{address.city}</p>
                          <p className="text-sm text-gray-600">{address.phone}</p>
                        </div>
                        <div className="flex space-x-2">
                          <button className="flex-1 text-purple-600 hover:text-purple-700 text-sm font-semibold">
                            ✏️ Modifier
                          </button>
                          <button className="flex-1 text-red-600 hover:text-red-700 text-sm font-semibold">
                            🗑️ Supprimer
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
  
              {/* Favorite Pickup Points Tab */}
              {activeTab === 'pickup' && (
                <div className="bg-white rounded-lg shadow-md p-6">
                  <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-bold">Points de retrait favoris</h2>
                    <button className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg font-semibold transition-colors text-sm">
                      + Ajouter un point
                    </button>
                  </div>
  
                  <div className="space-y-4">
                    {favoritePickupPoints.map((point) => (
                      <div key={point.id} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                        <div className="flex items-start space-x-4">
                          <div className="text-3xl">📦</div>
                          <div className="flex-1">
                            <h3 className="font-bold text-lg mb-2">{point.name}</h3>
                            <p className="text-sm text-gray-600 mb-1">📍 {point.address}</p>
                            <p className="text-sm text-gray-600 mb-1">📞 {point.phone}</p>
                            <p className="text-sm text-gray-600 mb-1">🕐 {point.hours}</p>
                            <span className="inline-block mt-2 text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">
                              {point.city}
                            </span>
                          </div>
                          <button className="text-red-600 hover:text-red-700">
                            <span className="text-xl">🗑️</span>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
  
              {/* Payment Methods Tab */}
              {activeTab === 'payment' && (
                <div className="bg-white rounded-lg shadow-md p-6">
                  <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-bold">Méthodes de paiement</h2>
                    <button className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg font-semibold transition-colors text-sm">
                      + Ajouter un moyen
                    </button>
                  </div>
  
                  <div className="space-y-4">
                    {paymentMethods.map((method) => (
                      <div key={method.id} className="border rounded-lg p-4 flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                          <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-red-500 rounded-lg flex items-center justify-center text-white font-bold">
                            💳
                          </div>
                          <div>
                            <h3 className="font-bold">{method.type}</h3>
                            <p className="text-sm text-gray-600">{method.number}</p>
                            {method.isDefault && (
                              <span className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded-full font-medium mt-1 inline-block">
                                Par défaut
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex space-x-2">
                          <button className="text-purple-600 hover:text-purple-700 font-semibold text-sm">
                            ✏️ Modifier
                          </button>
                          <button className="text-red-600 hover:text-red-700 font-semibold text-sm">
                            🗑️ Supprimer
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
  
                  <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div className="flex items-start space-x-3">
                      <span className="text-2xl">ℹ️</span>
                      <div>
                        <h4 className="font-semibold text-blue-900 mb-1">Moyens de paiement acceptés</h4>
                        <p className="text-sm text-blue-800">
                          Nous acceptons MTN Mobile Money, Orange Money, les cartes bancaires et le paiement à la livraison.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
        
        <Footer language={language} />
      </div>
    );
  };
  
  export default UserProfile;
