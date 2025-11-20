
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Header from './Header';
import Footer from './Footer';
import SellerSidebar from './SellerSidebar';
import SellerHeader from './SellerHeader';
import { getSellerOwnProducts, getSellerOrders } from '../services/api';

// Seller Dashboard Component
export const SellerDashboard = (props) => {
  const { language } = props;
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalOrders: 0,
    pendingOrders: 0,
    monthRevenue: 0,
    activeProducts: 0
  });
  const [recentOrders, setRecentOrders] = useState([]);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      const [products, orders] = await Promise.all([
        getSellerOwnProducts(),
        getSellerOrders()
      ]);

      // Calculate stats
      const activeProducts = products.filter(p => p.status === 'active').length;
      const pendingOrders = orders.filter(o => o.status === 'pending' || o.status === 'confirmed').length;

      // Calculate monthly revenue
      const now = new Date();
      const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const monthlyOrders = orders.filter(o => {
        const orderDate = new Date(o.createdDate);
        return orderDate >= firstDayOfMonth && (o.status === 'delivered' || o.status === 'shipped');
      });
      const monthRevenue = monthlyOrders.reduce((sum, order) => sum + (order.sellerTotal || 0), 0);

      setStats({
        totalOrders: orders.length,
        pendingOrders,
        monthRevenue,
        activeProducts
      });

      // Get recent 5 orders
      const sortedOrders = [...orders].sort((a, b) =>
        new Date(b.createdDate) - new Date(a.createdDate)
      );
      setRecentOrders(sortedOrders.slice(0, 5));
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const statsCards = [
    {
      title: "Commandes Totales",
      value: stats.totalOrders,
      icon: "💰",
      color: "from-green-400 to-green-600"
    },
    {
      title: "Commandes en Attente",
      value: stats.pendingOrders,
      icon: "📋",
      color: "from-yellow-400 to-orange-500"
    },
    {
      title: "Revenus du Mois",
      value: `${stats.monthRevenue.toLocaleString()} XAF`,
      icon: "📈",
      color: "from-blue-400 to-blue-600"
    },
    {
      title: "Produits Actifs",
      value: stats.activeProducts,
      icon: "📦",
      color: "from-purple-400 to-purple-600"
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <Header {...props} />
      
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Sidebar */}
          <div className="lg:col-span-1">
            <SellerSidebar currentPage="dashboard" language={language} />
          </div>
          
          {/* Main Content */}
          <div className="lg:col-span-3">
            <SellerHeader title="Tableau de Bord Vendeur" language={language} />
            
            {/* Statistics Cards */}
            {loading ? (
              <div className="text-center py-12">
                <div className="text-4xl mb-4">⏳</div>
                <p className="text-gray-600">Chargement des statistiques...</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                {statsCards.map((stat, index) => (
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
            )}
            
            {/* Recent Activity */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Recent Orders */}
              <div className="bg-white rounded-lg shadow-lg p-6">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-xl font-bold">Commandes Récentes</h2>
                  <Link to="/seller/orders" className="text-purple-600 hover:text-purple-700 text-sm font-medium">
                    Voir tout →
                  </Link>
                </div>
                
                <div className="space-y-4">
                  {recentOrders.length > 0 ? (
                    recentOrders.map(order => (
                      <div key={order.id} className="border-l-4 border-purple-500 pl-4 py-3">
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="font-semibold">#{order.id.slice(-6)}</p>
                            <p className="text-gray-600 text-sm">{order.buyerName || 'Client'}</p>
                            <p className="text-xs text-gray-500">
                              {new Date(order.createdDate).toLocaleDateString('fr-FR')}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="font-bold text-purple-600">
                              {(order.sellerTotal || order.total || 0).toLocaleString()} XAF
                            </p>
                            <span className={`text-xs px-2 py-1 rounded-full ${
                              order.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                              order.status === 'confirmed' ? 'bg-blue-100 text-blue-800' :
                              order.status === 'shipped' ? 'bg-purple-100 text-purple-800' :
                              order.status === 'delivered' ? 'bg-green-100 text-green-800' :
                              'bg-red-100 text-red-800'
                            }`}>
                              {order.status === 'pending' ? '⏳ En attente' :
                               order.status === 'confirmed' ? '✅ Confirmée' :
                               order.status === 'shipped' ? '🚚 Expédiée' :
                               order.status === 'delivered' ? '📦 Livrée' : '❌ Annulée'}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-gray-500 text-center py-4">Aucune commande récente</p>
                  )}
                </div>
              </div>
              
              {/* Quick Actions */}
              <div className="bg-white rounded-lg shadow-lg p-6">
                <h2 className="text-xl font-bold mb-6">Actions Rapides</h2>
                
                <div className="grid grid-cols-2 gap-4">
                  <Link
                    to="/seller/products"
                    className="bg-gradient-to-r from-green-400 to-green-600 text-white p-4 rounded-lg text-center hover:shadow-lg transition-shadow"
                  >
                    <div className="text-2xl mb-2">➕</div>
                    <div className="font-semibold text-sm">Ajouter Produit</div>
                  </Link>
                  
                  <Link
                    to="/seller/orders"
                    className="bg-gradient-to-r from-blue-400 to-blue-600 text-white p-4 rounded-lg text-center hover:shadow-lg transition-shadow"
                  >
                    <div className="text-2xl mb-2">📋</div>
                    <div className="font-semibold text-sm">Gérer Commandes</div>
                  </Link>
                  
                  <Link
                    to="/seller/analytics"
                    className="bg-gradient-to-r from-purple-400 to-purple-600 text-white p-4 rounded-lg text-center hover:shadow-lg transition-shadow"
                  >
                    <div className="text-2xl mb-2">📊</div>
                    <div className="font-semibold text-sm">Voir Analyses</div>
                  </Link>
                  
                  <Link
                    to="/seller/messages"
                    className="bg-gradient-to-r from-red-400 to-red-600 text-white p-4 rounded-lg text-center hover:shadow-lg transition-shadow"
                  >
                    <div className="text-2xl mb-2">💬</div>
                    <div className="font-semibold text-sm">Messages</div>
                  </Link>
                </div>
              </div>
            </div>
            
            {/* Performance Chart */}
           {/*  <div className="bg-white rounded-lg shadow-lg p-6 mt-8">
              <h2 className="text-xl font-bold mb-6">Évolution des Ventes (7 derniers jours)</h2>
              <div className="h-64 bg-gradient-to-t from-purple-50 to-transparent rounded-lg flex items-end justify-around p-4">
                {[120, 150, 80, 200, 180, 250, 300].map((value, index) => (
                  <div key={index} className="flex flex-col items-center">
                    <div 
                      className="bg-gradient-to-t from-purple-500 to-purple-300 rounded-t w-8"
                      style={{ height: `${(value / 300) * 200}px` }}
                    ></div>
                    <span className="text-xs mt-2 text-gray-600">
                      {new Date(Date.now() - (6-index) * 24 * 60 * 60 * 1000).toLocaleDateString('fr-FR', { weekday: 'short' })}
                    </span>
                  </div>
                ))}
              </div>
            </div> */}
          </div>
        </div>
      </div>
      
      <Footer language={language} />
    </div>
  );
};

export default SellerDashboard;
