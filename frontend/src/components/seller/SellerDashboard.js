
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Header from '../layout/Header';
import Footer from '../layout/Footer';
import SellerSidebar from './SellerSidebar';
import SellerHeader from './SellerHeader';
import SellerProducts from './SellerProducts';
import SellerOrders from './SellerOrders';
import SellerAnalytics from './SellerAnalytics';
import SellerMessages from './SellerMessages';
import SellerProfile from './SellerProfile';

const SellerDashboard = (props) => {
  const { language, user } = props;
  const [activeSection, setActiveSection] = useState('dashboard');
  const [stats, setStats] = useState([
    { title: "Ventes Totales", value: "0", icon: "💰", color: "from-green-400 to-green-600", change: "+0%" },
    { title: "Commandes en Attente", value: "0", icon: "📋", color: "from-yellow-400 to-orange-500", change: "+0" },
    { title: "Revenus du Mois", value: "0 XAF", icon: "📈", color: "from-blue-400 to-blue-600", change: "+0%" },
    { title: "Produits Actifs", value: "0", icon: "📦", color: "from-purple-400 to-purple-600", change: "+0" }
  ]);
  const [recentOrders, setRecentOrders] = useState([]);

  const handleNavigate = (sectionId) => {
    setActiveSection(sectionId);
    setTimeout(() => {
        const section = document.getElementById(`${sectionId}-section`);
        if (section) {
            section.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    }, 0); 
  };

  useEffect(() => {
    const fetchOrders = async () => {
      if (!user) return;

      try {
        const sellerId = user.id;
        const response = await fetch(`http://localhost:8000/api/orders?seller_id=${sellerId}`);
        if (!response.ok) {
          throw new Error('Failed to fetch orders');
        }
        const orders = await response.json();
        setRecentOrders(orders.slice(0, 5));
        
        const totalSales = orders.length;
        const pendingOrders = orders.filter(o => o.status === 'pending').length;
        const monthlyRevenue = orders.reduce((acc, o) => acc + o.totalAmount, 0);
        const activeProducts = 0; 

        setStats([
          { title: "Ventes Totales", value: totalSales, icon: "💰", color: "from-green-400 to-green-600", change: "" },
          { title: "Commandes en Attente", value: pendingOrders, icon: "📋", color: "from-yellow-400 to-orange-500", change: "" },
          { title: "Revenus du Mois", value: `${monthlyRevenue.toLocaleString()} XAF`, icon: "📈", color: "from-blue-400 to-blue-600", change: "" },
          { title: "Produits Actifs", value: activeProducts, icon: "📦", color: "from-purple-400 to-purple-600", change: "" }
        ]);

      } catch (error) {
        console.error("Error fetching orders:", error);
      }
    };

    fetchOrders();
  }, [user]);

  return (
    <div className="min-h-screen bg-gray-50">
      <Header {...props} />
      
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          <div className="lg:col-span-1">
            <SellerSidebar onNavigate={handleNavigate} currentPage={activeSection} language={language} user={user} />
          </div>
          
          <div id="seller-content-area" className="lg:col-span-3 space-y-8">
            <div id="dashboard-section" className={`${activeSection === 'dashboard' ? '' : 'hidden'}`}>
                <div>
                    <SellerHeader title="Tableau de Bord Vendeur" language={language} user={user} />
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                      {stats.map((stat, index) => (
                        <div key={index} className={`bg-gradient-to-r ${stat.color} text-white rounded-lg p-6 shadow-lg`}>
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm opacity-90">{stat.title}</p>
                              <p className="text-2xl font-bold">{stat.value}</p>
                            </div>
                            <div className="text-3xl">{stat.icon}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                </div>
            </div>

            <div id="products-section" className={`${activeSection === 'products' ? '' : 'hidden'}`}>
                <SellerProducts {...props} />
            </div>
            <div id="orders-section" className={`${activeSection === 'orders' ? '' : 'hidden'}`}>
                <SellerOrders {...props} />
            </div>
            <div id="analytics-section" className={`${activeSection === 'analytics' ? '' : 'hidden'}`}>
                <SellerAnalytics {...props} />
            </div>
            <div id="messages-section" className={`${activeSection === 'messages' ? '' : 'hidden'}`}>
                <SellerMessages {...props} />
            </div>
            <div id="profile-section" className={`${activeSection === 'profile' ? '' : 'hidden'}`}>
                <SellerProfile {...props} />
            </div>

          </div>
        </div>
      </div>
      
      <Footer language={language} />
    </div>
  );
};

export default SellerDashboard;
