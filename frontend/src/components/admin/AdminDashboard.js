
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

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://127.0.0.1:8001/api';

const AdminDashboard = (props) => {
    const { language, user, setUser } = props;
    const navigate = useNavigate();
    const [activeSection, setActiveSection] = useState('dashboard');
    
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
    
    // const isSuperAdmin = user && user.whatsapp === '+237600000000'; // No longer needed directly

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
    
    // --- Handlers that remain in the dashboard ---
    
    const handleProfileChange = (e) => {
      setProfileData({
        ...profileData,
        [e.target.name]: e.target.value
      });
    };
  
    const handleProfileUpdate = () => {
      // Mock logic for profile update
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
                        {/* <span className="text-sm">👤 {user.name}</span> */}
                        {/* <button onClick={() => setShowProfileEdit(true)} className="bg-yellow-400 hover:bg-yellow-500 text-black px-4 py-2 rounded-lg font-semibold transition-colors text-sm flex items-center justify-center space-x-2">
                            <span>✏️</span><span>Modifier Profil</span>
                        </button> */}
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
                            <button onClick={() => setActiveSection('dashboard')} className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${activeSection === 'dashboard' ? 'bg-purple-100 text-purple-700' : 'hover:bg-gray-100'}`}>
                                <span className="text-xl">📊</span><span className="font-medium text-sm">Tableau de bord</span>
                            </button>
                            <button onClick={() => setActiveSection('sellers')} className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${activeSection === 'sellers' ? 'bg-purple-100 text-purple-700' : 'hover:bg-gray-100'}`}>
                                <span className="text-xl">🏪</span><span className="font-medium text-sm">Vendeurs</span>
                            </button>
                             <button onClick={() => setActiveSection('buyers')} className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${activeSection === 'buyers' ? 'bg-purple-100 text-purple-700' : 'hover:bg-gray-100'}`}>
                                <span className="text-xl">👥</span><span className="font-medium text-sm">Acheteurs</span>
                            </button>
                            <button onClick={() => setActiveSection('products')} className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${activeSection === 'products' ? 'bg-purple-100 text-purple-700' : 'hover:bg-gray-100'}`}>
                                <span className="text-xl">📦</span><span className="font-medium text-sm">Produits</span>
                            </button>
                            <button onClick={() => setActiveSection('orders')} className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${activeSection === 'orders' ? 'bg-purple-100 text-purple-700' : 'hover:bg-gray-100'}`}>
                                <span className="text-xl">🛒</span><span className="font-medium text-sm">Commandes</span>
                            </button>
                            <button onClick={() => setActiveSection('pickupPoints')} className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${activeSection === 'pickupPoints' ? 'bg-purple-100 text-purple-700' : 'hover:bg-gray-100'}`}>
                                <span className="text-xl">📍</span><span className="font-medium text-sm">Points de retrait</span>
                            </button>
                            {user.type === 'admin' && (
                                <button onClick={() => setActiveSection('categories')} className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${activeSection === 'categories' ? 'bg-purple-100 text-purple-700' : 'hover:bg-gray-100'}`}>
                                    <span className="text-xl">🏷️</span><span className="font-medium text-sm">Catégories</span>
                                </button>
                            )}
                            {user.role === 'super_admin' && (
                                <button onClick={() => setActiveSection('shipping')} className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${activeSection === 'shipping' ? 'bg-purple-100 text-purple-700' : 'hover:bg-gray-100'}`}>
                                    <span className="text-xl">🚚</span><span className="font-medium text-sm">Frais de livraison</span>
                                </button>
                            )}
                            <div className="border-t border-gray-200 my-2"></div>
                            <Link to="/admin/management" className="w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors hover:bg-purple-50 border-2 border-purple-300 bg-purple-50">
                                <span className="text-xl">👑</span><span className="font-medium text-sm text-purple-700">Administrateurs</span>
                            </Link>
                            <div className="flex items-start flex-col gap-4 md:hidden">
                               {/*  <button onClick={() => setShowProfileEdit(true)} className=" bg-yellow-400 hover:bg-yellow-500 text-black px-4 py-2 rounded-lg font-semibold transition-colors text-sm flex space-x-2">
                                    <span>✏️</span><span>Modifier Profil</span>
                                </button> */}
                                <Link to="/" className="w-fullbg-white text-purple-600 hover:bg-gray-100 px-4 py-2 rounded-lg font-semibold transition-colors text-sm">
                                    ← Retour au site
                                </Link>
                            </div>
                            
                        </nav>
                    </div>
                </div>

                <div className="lg:col-span-4">
                    {activeSection === 'dashboard' && (
                        <div>
                            <h2 className="text-3xl font-bold mb-6">Tableau de bord</h2>
                            {/* Dashboard stats cards can be re-implemented here with fetched data */}
                        </div>
                    )}

                    {activeSection === 'sellers' && <SellerManagement {...props} />}
                    {activeSection === 'products' && <ProductManagement {...props} />}
                    {activeSection === 'pickupPoints' && <PickupPointManagement {...props} />}
                    {activeSection === 'buyers' && <BuyerManagement {...props} />}
                    {activeSection === 'orders' && <OrderManagement {...props} orders={orders} onOrderUpdate={fetchOrders} />}
                    {activeSection === 'categories' && <CategoryManagement {...props} />}
                    {activeSection === 'shipping' && <ShippingSettingsManagement {...props} />}
                </div>
            </div>
        </div>
      </div>
    );
};

export default AdminDashboard;
