import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import AdminSidebar from './AdminSidebar';
import { getAllBuyers, getAllSellers, getPendingSellers } from '../services/api';

export const AdminDashboard = (props) => {
  const { setUser } = props;
  const [stats, setStats] = useState({
    totalBuyers: 0,
    totalSellers: 0,
    pendingSellers: 0,
    approvedSellers: 0,
    totalProducts: 0,
    totalOrders: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const [buyers, sellers, pending] = await Promise.all([
        getAllBuyers(),
        getAllSellers(),
        getPendingSellers()
      ]);

      const approvedSellers = sellers.filter(s => s.status === 'approved').length;

      setStats({
        totalBuyers: buyers.length,
        totalSellers: sellers.length,
        pendingSellers: pending.length,
        approvedSellers: approvedSellers,
        totalProducts: 0, // TODO: Implement products count
        totalOrders: 0 // TODO: Implement orders count
      });
    } catch (error) {
      console.error('Error loading stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const statCards = [
    {
      title: 'Clients',
      value: stats.totalBuyers,
      icon: '👥',
      color: 'bg-blue-500',
      link: '/admin/buyers'
    },
    {
      title: 'Vendeurs',
      value: stats.totalSellers,
      icon: '🏪',
      color: 'bg-purple-500',
      link: '/admin/sellers'
    },
    {
      title: 'Vendeurs en attente',
      value: stats.pendingSellers,
      icon: '⏳',
      color: 'bg-yellow-500',
      link: '/admin/sellers'
    },
    {
      title: 'Vendeurs approuvés',
      value: stats.approvedSellers,
      icon: '✅',
      color: 'bg-green-500',
      link: '/admin/sellers'
    },
    {
      title: 'Produits',
      value: stats.totalProducts,
      icon: '📦',
      color: 'bg-indigo-500',
      link: '/admin/products'
    },
    {
      title: 'Commandes',
      value: stats.totalOrders,
      icon: '🛒',
      color: 'bg-pink-500',
      link: '/admin/orders'
    }
  ];

  return (
    <div className="flex min-h-screen bg-gray-100">
      <AdminSidebar setUser={setUser} />

      <div className="flex-1 p-8">
        <div className="max-w-7xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-800">Tableau de bord</h1>
            <p className="text-gray-600 mt-2">Vue d'ensemble de votre plateforme Nengoo</p>
          </div>

          {loading ? (
            <div className="text-center py-12">
              <div className="text-4xl mb-4">⏳</div>
              <p className="text-gray-600">Chargement des statistiques...</p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                {statCards.map((card, index) => (
                  <Link
                    key={index}
                    to={card.link}
                    className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-gray-600 text-sm font-medium">{card.title}</p>
                        <p className="text-3xl font-bold text-gray-800 mt-2">{card.value}</p>
                      </div>
                      <div className={`${card.color} w-16 h-16 rounded-full flex items-center justify-center text-3xl`}>
                        {card.icon}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>

              {stats.pendingSellers > 0 && (
                <div className="bg-yellow-50 border-l-4 border-yellow-400 p-6 rounded-lg mb-8">
                  <div className="flex items-center">
                    <span className="text-3xl mr-4">⚠️</span>
                    <div>
                      <h3 className="text-lg font-semibold text-yellow-800">
                        {stats.pendingSellers} vendeur(s) en attente d'approbation
                      </h3>
                      <p className="text-yellow-700 mt-1">
                        Veuillez examiner et approuver les nouveaux vendeurs
                      </p>
                      <Link
                        to="/admin/sellers"
                        className="inline-block mt-3 text-yellow-800 font-medium hover:underline"
                      >
                        Voir les vendeurs en attente →
                      </Link>
                    </div>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white rounded-lg shadow-md p-6">
                  <h2 className="text-xl font-bold text-gray-800 mb-4">Actions rapides</h2>
                  <div className="space-y-3">
                    <Link
                      to="/admin/sellers"
                      className="block p-4 bg-purple-50 hover:bg-purple-100 rounded-lg transition-colors"
                    >
                      <div className="flex items-center">
                        <span className="text-2xl mr-3">🏪</span>
                        <span className="font-medium text-gray-800">Gérer les vendeurs</span>
                      </div>
                    </Link>
                    <Link
                      to="/admin/buyers"
                      className="block p-4 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
                    >
                      <div className="flex items-center">
                        <span className="text-2xl mr-3">👥</span>
                        <span className="font-medium text-gray-800">Gérer les clients</span>
                      </div>
                    </Link>
                    <Link
                      to="/admin/products"
                      className="block p-4 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors"
                    >
                      <div className="flex items-center">
                        <span className="text-2xl mr-3">📦</span>
                        <span className="font-medium text-gray-800">Gérer les produits</span>
                      </div>
                    </Link>
                  </div>
                </div>

                <div className="bg-white rounded-lg shadow-md p-6">
                  <h2 className="text-xl font-bold text-gray-800 mb-4">Activité récente</h2>
                  <div className="space-y-3">
                    <p className="text-gray-600 text-center py-8">
                      Aucune activité récente
                    </p>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
