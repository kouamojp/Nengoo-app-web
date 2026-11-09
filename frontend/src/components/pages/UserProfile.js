
import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import Header from '../layout/Header';
import Footer from '../layout/Footer';
import NotificationList from '../ui/NotificationList';
import { translations } from '../../lib/translations';
import { orderStatusLabel, orderStatusTone } from '../../lib/orderStatuses';
import UserSupportThread from '../support/UserSupportThread';
import { useSupportUnread } from '../../lib/support';

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

const BuyerMessages = ({ user, language }) => {
    const [conversations, setConversations] = useState([]);
    const [selectedConversation, setSelectedConversation] = useState(null);
    const [messages, setMessages] = useState([]);
    const [reply, setReply] = useState('');
    const [loadingConversations, setLoadingConversations] = useState(true);
    const [loadingMessages, setLoadingMessages] = useState(false);
  
    const fetchConversations = async () => {
      if (user) {
        try {
          setLoadingConversations(true);
          const response = await fetch(`${API_BASE_URL}/conversations`, {
            headers: {
              'user_id': user.id,
              'user_type': user.type,
            }
          });
          if (!response.ok) {
            throw new Error('Failed to fetch conversations');
          }
          const data = await response.json();
          setConversations(data);
        } catch (error) {
          console.error('Error fetching conversations:', error);
        } finally {
          setLoadingConversations(false);
        }
      }
    };
  
    useEffect(() => {
      fetchConversations();
    }, [user]);
  
    const handleConversationClick = async (conversation) => {
      setSelectedConversation(conversation);
      setLoadingMessages(true);
      try {
        const response = await fetch(`${API_BASE_URL}/conversations/${conversation.id}/messages`);
        if (!response.ok) {
          throw new Error('Failed to fetch messages');
        }
        const data = await response.json();
        setMessages(data);
      } catch (error) {
        console.error('Error fetching messages:', error);
      } finally {
        setLoadingMessages(false);
      }
    };
  
    const sendReply = async (e) => {
      e.preventDefault();
      if (reply.trim() && selectedConversation) {
        try {
          const response = await fetch(`${API_BASE_URL}/messages`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'sender_id': user.id,
              'sender_type': user.type,
            },
            body: JSON.stringify({
              receiver_id: selectedConversation.seller_id,
              message: reply,
              product_id: selectedConversation.product_id,
            }),
          });
          if (!response.ok) {
            throw new Error('Failed to send reply');
          }
          const newMessage = await response.json();
          setMessages([...messages, newMessage]);
          setReply('');
          fetchConversations();
        } catch (error) {
          console.error('Error sending reply:', error);
          alert(`Erreur: ${error.message}`);
        }
      }
    };
  
    const unreadCount = conversations.filter(c => c.buyer_unread).length;
  
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold">Mes messages</h2>
          {unreadCount > 0 && (
            <div className="bg-red-100 text-red-800 px-4 py-2 rounded-full font-semibold">
              {unreadCount} non lu(s)
            </div>
          )}
        </div>
  
        <div className="space-y-4">
          {loadingConversations ? <p>Chargement des conversations...</p> : conversations.map(conversation => (
            <div
              key={conversation.id}
              className={`bg-white rounded-lg shadow-lg p-6 cursor-pointer transition-all hover:shadow-xl ${
                conversation.buyer_unread ? 'border-l-4 border-purple-500' : ''
              }`}
              onClick={() => handleConversationClick(conversation)}
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-4">
                  <div>
                    <h3 className="font-bold text-lg">{conversation.seller_id}</h3>
                    <p className="text-gray-600">Produit: {conversation.product_id}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-500">{new Date(conversation.last_message_timestamp).toLocaleString()}</p>
                  {conversation.buyer_unread && (
                    <span className="inline-block w-3 h-3 bg-red-500 rounded-full mt-2"></span>
                  )}
                </div>
              </div>
              <p className="text-gray-700 line-clamp-2">{conversation.last_message_preview}</p>
            </div>
          ))}
        </div>
  
        {conversations.length === 0 && !loadingConversations && (
          <div className="text-center py-16">
            <div className="text-6xl mb-4">💬</div>
            <h3 className="text-xl font-semibold mb-2">Aucune conversation</h3>
            <p className="text-gray-600">Vous n'avez pas encore de conversations.</p>
          </div>
        )}
  
        {selectedConversation && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
              <div className="p-6 border-b">
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-bold">Conversation avec {selectedConversation.seller_id}</h3>
                  <button
                    onClick={() => setSelectedConversation(null)}
                    className="text-gray-400 hover:text-gray-600 text-2xl"
                  >
                    ×
                  </button>
                </div>
                <p className="text-gray-600 mt-2">À propos du produit: {selectedConversation.product_id}</p>
              </div>
              
              <div className="p-6 flex-grow overflow-y-auto">
                {loadingMessages ? <p>Chargement des messages...</p> : messages.map(msg => (
                  <div key={msg.id} className={`flex ${msg.sender_type === 'buyer' ? 'justify-end' : 'justify-start'} mb-4`}>
                    <div className={`rounded-lg px-4 py-2 ${msg.sender_type === 'buyer' ? 'bg-purple-600 text-white' : 'bg-gray-200'}`}>
                      <p>{msg.message}</p>
                      <p className="text-xs mt-1 text-right">{new Date(msg.timestamp).toLocaleTimeString()}</p>
                    </div>
                  </div>
                ))}
              </div>
              
              <div className="p-6 border-t">
                <form onSubmit={sendReply}>
                  <div className="flex items-center">
                    <textarea
                      value={reply}
                      onChange={(e) => setReply(e.target.value)}
                      placeholder="Tapez votre réponse ici..."
                      rows={1}
                      required
                      className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                    <button
                      type="submit"
                      className="ml-4 bg-purple-600 hover:bg-purple-700 text-white px-6 py-2 rounded-lg font-semibold transition-colors"
                    >
                      Envoyer
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}
      </div>
    );
};

const UserProfile = (props) => {
    const { language, user, cartItems, setUser } = props;
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState('profile');
    // Onglet demandé dans l'URL (lien d'une notification : /profile?tab=support)
    const [searchParams] = useSearchParams();
    const requestedTab = searchParams.get('tab');
    useEffect(() => {
      if (requestedTab) setActiveTab(requestedTab);
    }, [requestedTab]);
    const supportUnread = useSupportUnread(user);
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
    const t = translations[language];
    
    // Real data state
    const [savedAddresses, setSavedAddresses] = useState([]);
    const [favoritePickupPoints, setFavoritePickupPoints] = useState([]);
    const [loadingInfo, setLoadingInfo] = useState(false);
  
    // Mock payment methods (keep as mock for now unless requested)
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

    const handleNavigate = (tab) => {
        setActiveTab(tab);
        setTimeout(() => {
            const section = document.getElementById(`${tab}-section`);
            if (section) {
                section.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        }, 0);
    };

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
        
        const fetchSavedInfo = async () => {
            if (user && user.id) {
                setLoadingInfo(true);
                try {
                    const response = await fetch(`${API_BASE_URL}/buyers/${user.id}/saved-info`, {
                         headers: {
                            'X-User-Id': user.id
                        }
                    });
                    if (!response.ok) {
                        throw new Error('Failed to fetch saved info');
                    }
                    const data = await response.json();
                    
                    // Transform addresses
                    const addresses = data.addresses.map((addr, index) => ({
                        id: index,
                        label: index === 0 ? 'Dernière adresse utilisée' : `Adresse ${index + 1}`,
                        name: user.name, // Assuming the buyer name is constant for now
                        address: addr.address,
                        city: addr.city,
                        phone: addr.phone,
                        isDefault: index === 0
                    }));
                    setSavedAddresses(addresses);

                    // Transform pickup points
                    setFavoritePickupPoints(data.pickupPoints);

                } catch (error) {
                    console.error("Error fetching saved info:", error);
                } finally {
                    setLoadingInfo(false);
                }
            }
        };

        if (activeTab === 'orders' || activeTab === 'qrcode') {
            fetchOrders();
        } else if (activeTab === 'addresses' || activeTab === 'pickup') {
            fetchSavedInfo();
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
  
    // Statuts de commande communs au site (lib/orderStatuses)
    const getStatusColor = (status) => orderStatusTone(status);
    const getStatusText = (status) => orderStatusLabel(status, language);
  
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
                    onClick={() => handleNavigate('profile')}
                    className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${
                      activeTab === 'profile' ? 'bg-purple-100 text-purple-700' : 'hover:bg-gray-100'
                    }`}
                  >
                    <span className="text-xl">👤</span>
                    <span className="font-medium">Mes informations</span>
                  </button>
                  
                  <button
                    onClick={() => handleNavigate('orders')}
                    className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${
                      activeTab === 'orders' ? 'bg-purple-100 text-purple-700' : 'hover:bg-gray-100'
                    }`}
                  >
                    <span className="text-xl">📦</span>
                    <span className="font-medium">Mes commandes</span>
                  </button>

                  <button
                    onClick={() => handleNavigate('messages')}
                    className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${
                      activeTab === 'messages' ? 'bg-purple-100 text-purple-700' : 'hover:bg-gray-100'
                    }`}
                  >
                    <span className="text-xl">💬</span>
                    <span className="font-medium">Mes messages</span>
                  </button>

                  <button
                    onClick={() => handleNavigate('support')}
                    className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${
                      activeTab === 'support' ? 'bg-purple-100 text-purple-700' : 'hover:bg-gray-100'
                    }`}
                  >
                    <span className="text-xl">🛟</span>
                    <span className="font-medium flex-1 text-left">Équipe Nengoo</span>
                    {supportUnread > 0 && (
                      <span className="min-w-[1.5rem] h-6 px-1.5 rounded-full bg-purple-700 text-white text-xs font-bold flex items-center justify-center" aria-label={`${supportUnread} non lu${supportUnread > 1 ? 's' : ''}`}>
                        {supportUnread}
                      </span>
                    )}
                  </button>

                  <button
                    onClick={() => handleNavigate('notifications')}
                    className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${
                      activeTab === 'notifications' ? 'bg-purple-100 text-purple-700' : 'hover:bg-gray-100'
                    }`}
                  >
                    <span className="text-xl">🔔</span>
                    <span className="font-medium">Notifications</span>
                  </button>
                  
                  <button
                    onClick={() => handleNavigate('addresses')}
                    className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${
                      activeTab === 'addresses' ? 'bg-purple-100 text-purple-700' : 'hover:bg-gray-100'
                    }`}
                  >
                    <span className="text-xl">📍</span>
                    <span className="font-medium">Mes adresses</span>
                  </button>
                  
                  <button
                    onClick={() => handleNavigate('pickup')}
                    className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${
                      activeTab === 'pickup' ? 'bg-purple-100 text-purple-700' : 'hover:bg-gray-100'
                    }`}
                  >
                    <span className="text-xl">📍</span>
                    <span className="font-medium">Points de retrait</span>
                  </button>

                  <button
                    onClick={() => handleNavigate('qrcode')}
                    className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${
                      activeTab === 'qrcode' ? 'bg-purple-100 text-purple-700' : 'hover:bg-gray-100'
                    }`}
                  >
                    <span className="text-xl">📱</span>
                    <span className="font-medium">Mon QR Code</span>
                  </button>

                  <button
                      onClick={() => {
                          setUser(null);
                          localStorage.removeItem('nengoo-user');
                          navigate('/'); // Redirect to home page
                      }}
                      className="w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors"
                  >
                    <span className="text-xl">🔌</span>
                    <span className="font-medium">{t.logout}</span>
                  </button>

                </nav>
              </div>
            </div>
  
            {/* Main Content */}
            <div id="user-content-area" className="lg:col-span-3 space-y-8">
              {/* Personal Information Tab */}
              <div id="profile-section" className={`${activeTab === 'profile' ? '' : 'hidden'}`}>
                <div className="bg-white rounded-lg shadow-md p-6">
                  <div className="flex justify-between items-center mb-6">
                    <h2 className="text-lg md:text-2xl font-bold">Informations personnelles</h2>
                    <button
                      onClick={() => setEditMode(!editMode)}
                      className="text-purple-600 hover:text-purple-700 font-semibold"
                    >
                      {editMode ? '✕ Annuler' : '✏️ Modifier'}
                    </button>
                  </div>
  
                  <div className="space-y-4 text-left ">
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
              </div>

              <div id="messages-section" className={`${activeTab === 'messages' ? '' : 'hidden'}`}>
                <BuyerMessages user={user} language={language} />
              </div>

              <div id="support-section" className={`${activeTab === 'support' ? '' : 'hidden'}`}>
                <div className="bg-white rounded-lg shadow-md overflow-hidden">
                  <div className="p-6 border-b border-gray-100">
                    <h2 className="text-2xl font-bold">Équipe Nengoo</h2>
                    <p className="mt-1 text-gray-600">Une question sur une commande, une livraison ou votre compte ? Écrivez-nous, nous vous répondons ici.</p>
                  </div>
                  {activeTab === 'support' && <UserSupportThread user={user} className="h-[32rem]" />}
                </div>
              </div>

              {/* Notifications Tab */}
              <div id="notifications-section" className={`${activeTab === 'notifications' ? '' : 'hidden'}`}>
                <div className="bg-white rounded-lg shadow-md overflow-hidden">
                    <div className="p-6 border-b border-gray-100">
                        <h2 className="text-2xl font-bold">Historique des notifications</h2>
                    </div>
                    <div className="w-full">
                        <NotificationList 
                            userId={user.id} 
                            userType={user.type} 
                            onClose={() => {}} 
                            isFullPage={true} 
                        />
                    </div>
                </div>
              </div>
  
              {/* Orders History Tab */}
              <div id="orders-section" className={`${activeTab === 'orders' ? '' : 'hidden'}`}>
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
              </div>
  
              {/* Delivery Addresses Tab */}
              <div id="addresses-section" className={`${activeTab === 'addresses' ? '' : 'hidden'}`}>
                <div className="bg-white rounded-lg shadow-md p-6">
                  <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-bold">Adresses de livraison</h2>
                    {/* We can hide 'Add' button since it's auto-generated from orders for now */}
                  </div>
  
                  {loadingInfo ? <p>Chargement des adresses...</p> : savedAddresses.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {savedAddresses.map((address) => (
                      <div key={address.id} className="border rounded-lg p-4 relative">
                        {address.isDefault && (
                          <span className="absolute top-2 right-2 bg-purple-100 text-purple-700 text-xs px-2 py-1 rounded-full font-medium">
                            Dernière utilisée
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
                  ) : (
                    <p className="text-gray-500">Aucune adresse enregistrée. Vos adresses de livraison apparaîtront ici après votre première commande.</p>
                  )}
                </div>
              </div>
  
              {/* Favorite Pickup Points Tab */}
              <div id="pickup-section" className={`${activeTab === 'pickup' ? '' : 'hidden'}`}>
                <div className="bg-white rounded-lg shadow-md p-6">
                  <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-bold">Points de retrait récents</h2>
                    {/* Hide add button */}
                  </div>
  
                  {loadingInfo ? <p>Chargement des points de retrait...</p> : favoritePickupPoints.length > 0 ? (
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
                            {/* <span className="inline-block mt-2 text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">
                              {point.city}
                            </span> */}
                          </div>
                          <button className="text-red-600 hover:text-red-700">
                            <span className="text-xl">🗑️</span>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                  ) : (
                    <p className="text-gray-500">Aucun point de retrait utilisé récemment.</p>
                  )}
                </div>
              </div>

              {/* QR Code Tab */}
              <div id="qrcode-section" className={`${activeTab === 'qrcode' ? '' : 'hidden'}`}>
                <div className="bg-white rounded-lg shadow-md p-6 flex flex-col items-center">
                    <h2 className="text-2xl font-bold mb-6">Mon Code QR</h2>
                    {loadingOrders ? (
                        <div className="flex flex-col items-center">
                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mb-4"></div>
                            <p>Chargement des données...</p>
                        </div>
                    ) : (
                        <>
                            <div className="p-4 border-4 border-black rounded-xl bg-white shadow-lg">
                                <QRCodeSVG
                                    value={`PROFIL NENGOO\n` +
                                           `Nom: ${user.name}\n` +
                                           `ID: ${user.id}\n` +
                                           `WhatsApp: ${user.whatsapp}\n\n` +
                                           `DERNIERES COMMANDES:\n` +
                                           userOrders.slice(0, 5).map(o => 
                                             `#${o.id} - ${o.status}\n` +
                                             `Date: ${new Date(o.orderedDate).toLocaleDateString()}\n` +
                                             `Total: ${o.totalAmount} FCFA\n` +
                                             `Produits: ${o.products.map(p => `${p.quantity}x ${p.name}`).join(', ')}`
                                           ).join('\n---\n')}
                                    size={256}
                                    level={"M"}
                                    includeMargin={true}
                                />
                            </div>
                            <div className="mt-8 text-center max-w-lg">
                                <h3 className="text-lg font-bold mb-2">{user.name}</h3>
                                <p className="text-gray-600 mb-4">{user.whatsapp}</p>
                                <p className="text-sm text-gray-500 bg-gray-100 p-4 rounded-lg">
                                    Scannez ce code pour voir les informations du profil et les dernières commandes en format texte simple.
                                </p>
                            </div>
                        </>
                    )}
                </div>
              </div>
  
              {/* Payment Methods Tab */}
              <div id="payment-section" className={`${activeTab === 'payment' ? '' : 'hidden'}`}>
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
              </div>
            </div>
          </div>
        </div>
        
        <Footer language={language} />
      </div>
    );
};  
  export default UserProfile;
