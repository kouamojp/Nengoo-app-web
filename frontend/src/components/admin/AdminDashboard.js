
import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { adminMockData } from '../../lib/mockData';
import ProductManagement from './ProductManagement';
import SellerManagement from './SellerManagement';
import PickupPointManagement from './PickupPointManagement';
import BuyerManagement from './BuyerManagement';
import OrderManagement from './OrderManagement';
import CategoryManagement from './CategoryManagement';
import ShippingSettingsManagement from './ShippingSettingsManagement';
import HomepageManagement from './HomepageManagement'; // Importer le nouveau composant
import AboutPageManagement from './AboutPageManagement';
import WhatsAppAnalytics from './WhatsAppAnalytics';
import { translations } from '../../lib/translations';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://127.0.0.1:8001/api';

const AdminDashboard = (props) => {
    const { language, user, setUser } = props;
    const navigate = useNavigate();
    const [activeSection, setActiveSection] = useState('dashboard');
    const t = translations[language];
    
    // State that remains in the dashboard
    const [buyers, setBuyers] = useState(adminMockData.buyers); // Mock data for buyers
    const [orders, setOrders] = useState([]); // Fetched from backend
    const [showProfileEdit, setShowProfileEdit] = useState(false);
    const [profileData, setProfileData] = useState({
      name: user?.name || '',
      email: user?.email || '',
      currentCode: '',
      newCode: '',
      confirmCode: ''
    });
    const [editingBuyer, setEditingBuyer] = useState(null);
    const [editingOrder, setEditingOrder] = useState(null);

    const handleNavigate = (sectionId) => {
        setActiveSection(sectionId);
        setTimeout(() => {
            const section = document.getElementById(`${sectionId}-section`);
            if (section) {
                section.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        }, 0); 
    };

    const fetchOrders = async () => {
        if (!user || !user.role) return; // Ensure user and role are available
        try {
            const response = await fetch(`${API_BASE_URL}/orders`, {
                headers: { 'X-Admin-Role': user.role } // Use actual user role
            });
            if (!response.ok) throw new Error('Failed to fetch orders');
            const data = await response.json();
            setOrders(data);
        } catch (error) {
            console.error("Error fetching orders:", error);
        }
    };

    useEffect(() => {
        if (user && user.type === 'admin') { // Check if any admin type is logged in
            fetchOrders();
        }
    }, [user]); // Re-fetch when user changes


    if (!user || user.type !== 'admin') {
      return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <div className="text-6xl mb-4">🚫</div>
            <h2 className="text-2xl font-bold mb-4">Accès Refusé</h2>
            <p className="text-gray-600 mb-6">Vous n'avez pas les permissions nécessaires.</p>
            <Link to="/admin/login" className="bg-purple-600 text-white px-6 py-3 rounded-lg font-semibold">
              Se connecter en tant qu'admin
            </Link>
          </div>
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
    
    const handleProfileChange = (e) => {
      setProfileData({
        ...profileData,
        [e.target.name]: e.target.value
      });
    };
  
    const handleProfileUpdate = () => {
      alert('La mise à jour du profil sera bientôt connectée au backend!');
    };

    return (
      <div className="min-h-screen bg-gray-50">
        <header className="bg-gradient-to-r from-purple-700 to-red-600 text-white shadow-lg">
            <div className="container mx-auto px-4 py-4">
                <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                        <div className="bg-white rounded-lg p-2"><span className="text-2xl font-bold text-purple-700">🔧</span></div>
                        <div className="text-left">
                            <h1 className="text-2xl font-bold max-md:text-xl">Panneau Administrateur</h1>
                            <p className="text-sm opacity-90">Gestion de Nengoo</p>
                        </div>
                    </div>
                    <div className="flex items-center space-x-4 max-md:hidden">
                        <Link to="/" className="bg-white text-purple-600 hover:bg-gray-100 px-4 py-2 rounded-lg font-semibold transition-colors text-sm">
                            ← Retour au site
                        </Link>
                    </div>
                </div>
            </div>
        </header>

        <div className="container mx-auto px-4 py-8">
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
                <div className="lg:col-span-1">
                    <div className="bg-white rounded-lg shadow-md p-4 sticky top-24">
                        <nav className="space-y-2 text-left">
                            <button onClick={() => handleNavigate('dashboard')} className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${activeSection === 'dashboard' ? 'bg-purple-100 text-purple-700' : 'hover:bg-gray-100'}`}>
                                <span className="text-xl">📊</span><span className="font-medium text-sm">Tableau de bord</span>
                            </button>
                            <button onClick={() => handleNavigate('sellers')} className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${activeSection === 'sellers' ? 'bg-purple-100 text-purple-700' : 'hover:bg-gray-100'}`}>
                                <span className="text-xl">🏪</span><span className="font-medium text-sm">Vendeurs</span>
                            </button>
                             <button onClick={() => handleNavigate('buyers')} className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${activeSection === 'buyers' ? 'bg-purple-100 text-purple-700' : 'hover:bg-gray-100'}`}>
                                <span className="text-xl">👥</span><span className="font-medium text-sm">Acheteurs</span>
                            </button>
                            <button onClick={() => handleNavigate('products')} className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${activeSection === 'products' ? 'bg-purple-100 text-purple-700' : 'hover:bg-gray-100'}`}>
                                <span className="text-xl">📦</span><span className="font-medium text-sm">Produits</span>
                            </button>
                            <button onClick={() => handleNavigate('orders')} className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${activeSection === 'orders' ? 'bg-purple-100 text-purple-700' : 'hover:bg-gray-100'}`}>
                                <span className="text-xl">🛒</span><span className="font-medium text-sm">Commandes</span>
                            </button>
                            <button onClick={() => handleNavigate('pickupPoints')} className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${activeSection === 'pickupPoints' ? 'bg-purple-100 text-purple-700' : 'hover:bg-gray-100'}`}>
                                <span className="text-xl">📍</span><span className="font-medium text-sm">Points de retrait</span>
                            </button>
                            <button onClick={() => handleNavigate('whatsappAnalytics')} className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${activeSection === 'whatsappAnalytics' ? 'bg-purple-100 text-purple-700' : 'hover:bg-gray-100'}`}>
                                <span className="text-xl">📈</span><span className="font-medium text-sm">Analytics WhatsApp</span>
                            </button>
                            {user.type === 'admin' && (
                                <button onClick={() => handleNavigate('categories')} className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${activeSection === 'categories' ? 'bg-purple-100 text-purple-700' : 'hover:bg-gray-100'}`}>
                                    <span className="text-xl">🏷️</span><span className="font-medium text-sm">Catégories</span>
                                </button>
                            )}
                            {user.role === 'super_admin' && (
                                <>
                                    <button onClick={() => handleNavigate('homepage')} className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${activeSection === 'homepage' ? 'bg-purple-100 text-purple-700' : 'hover:bg-gray-100'}`}>
                                        <span className="text-xl">🏠</span><span className="font-medium text-sm">Gestion Page d'accueil</span>
                                    </button>
                                    <button onClick={() => handleNavigate('shipping')} className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${activeSection === 'shipping' ? 'bg-purple-100 text-purple-700' : 'hover:bg-gray-100'}`}>
                                        <span className="text-xl">🚚</span><span className="font-medium text-sm">Frais de livraison</span>
                                    </button>
                                    <button onClick={() => handleNavigate('about')} className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${activeSection === 'about' ? 'bg-purple-100 text-purple-700' : 'hover:bg-gray-100'}`}>
                                        <span className="text-xl">ℹ️</span><span className="font-medium text-sm">Gestion Page À propos</span>
                                    </button>
                                    <Link to="/admin/privacy-policy" className="w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors hover:bg-gray-100">
                                        <span className="text-xl">🔒</span><span className="font-medium text-sm">Politique de confidentialité</span>
                                    </Link>
                                </>
                            )}
                            <div className="border-t border-gray-200 my-2"></div>
                            <Link to="/admin/management" className="w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors hover:bg-purple-50 border-2 border-purple-300 bg-purple-50">
                                <span className="text-xl">👑</span><span className="font-medium text-sm text-purple-700">Administrateurs</span>
                            </Link>
                            <div className="flex items-start flex-col gap-4 md:hidden">
                                <Link to="/" className="w-fullbg-white text-purple-600 hover:bg-gray-100 px-4 py-2 rounded-lg font-semibold transition-colors text-sm">
                                    ← Retour au site
                                </Link>
                                </div>
                            <div className="border-t border-gray-200 my-2">
                                <button
                                    onClick={() => {
                                        setUser(null);
                                        localStorage.removeItem('nengoo-user');
                                        navigate('/'); // Redirect to home page
                                    }}
                                    className="flex items-center space-x-3 p-3 rounded-lg hover:bg-gray-50 text-gray-700 transition-colors"
                                    >  <span className="text-xl">🔌</span><span className="font-medium text-sm">{t.logout}</span>
                                </button>
                            </div>
                        </nav>
                    </div>
                </div>

                <div className="lg:col-span-4 space-y-8">
                    <div id="dashboard-section" className={`${activeSection === 'dashboard' ? '' : 'hidden'}`}>
                        <div>
                            <h2 className="text-3xl font-bold mb-6">Tableau de bord</h2>
                        </div>
                    </div>
                    <div id="sellers-section" className={`${activeSection === 'sellers' ? '' : 'hidden'}`}>
                        <SellerManagement {...props} />
                    </div>
                    <div id="products-section" className={`${activeSection === 'products' ? '' : 'hidden'}`}>
                        <ProductManagement {...props} />
                    </div>
                    <div id="pickupPoints-section" className={`${activeSection === 'pickupPoints' ? '' : 'hidden'}`}>
                        <PickupPointManagement {...props} />
                    </div>
                    <div id="whatsappAnalytics-section" className={`${activeSection === 'whatsappAnalytics' ? '' : 'hidden'}`}>
                        <WhatsAppAnalytics {...props} />
                    </div>
                    <div id="buyers-section" className={`${activeSection === 'buyers' ? '' : 'hidden'}`}>
                        <BuyerManagement {...props} />
                    </div>
                    <div id="orders-section" className={`${activeSection === 'orders' ? '' : 'hidden'}`}>
                        <OrderManagement {...props} orders={orders} onOrderUpdate={fetchOrders} />
                    </div>
                    <div id="categories-section" className={`${activeSection === 'categories' ? '' : 'hidden'}`}>
                        <CategoryManagement {...props} />
                    </div>
                    <div id="shipping-section" className={`${activeSection === 'shipping' ? '' : 'hidden'}`}>
                        <ShippingSettingsManagement {...props} />
                    </div>
                    <div id="homepage-section" className={`${activeSection === 'homepage' ? '' : 'hidden'}`}>
                        <HomepageManagement {...props} />
                    </div>
                    <div id="about-section" className={`${activeSection === 'about' ? '' : 'hidden'}`}>
                        <AboutPageManagement {...props} />
                    </div>
                </div>
            </div>
        </div>
      </div>
    );
};

export default AdminDashboard;
