
import React, { useState, useEffect } from 'react';
import Header from '../layout/Header';
import Footer from '../layout/Footer';
import SellerSidebar from './SellerSidebar';
import SellerHeader from './SellerHeader';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://127.0.0.1:8001/api';

const SellerAnalytics = (props) => {
  const { language, user } = props;
  const [analyticsData, setAnalyticsData] = useState(null);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    const fetchAnalytics = async () => {
        if (user) {
            try {
                setLoading(true);
                const response = await fetch(`${API_BASE_URL}/sellers/${user.id}/analytics`);
                if (!response.ok) {
                    throw new Error('Failed to fetch analytics');
                }
                const data = await response.json();
                setAnalyticsData(data);
            } catch (error) {
                console.error('Error fetching analytics:', error);
            } finally {
                setLoading(false);
            }
        }
    };
    fetchAnalytics();
  }, [user]);

  const formatPrice = (price) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'XAF',
      minimumFractionDigits: 0,
    }).format(price);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header {...props} />
        <div className="container mx-auto px-4 py-8">
          <p>Chargement des analyses...</p>
        </div>
        <Footer language={language} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header {...props} />
      
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Sidebar */}
          <div className="lg:col-span-1">
            <SellerSidebar currentPage="analytics" language={language} />
          </div>
          
          {/* Main Content */}
          <div className="lg:col-span-3">
            <SellerHeader title="Analyses et Statistiques" language={language} />
            
            {/* Key Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <div className={`bg-gradient-to-r from-green-400 to-green-600 text-white rounded-lg p-6 shadow-lg`}>
                <p className="text-sm opacity-90">Revenus Total</p>
                <p className="text-2xl font-bold">{formatPrice(analyticsData?.total_revenue || 0)}</p>
              </div>
              <div className={`bg-gradient-to-r from-blue-400 to-blue-600 text-white rounded-lg p-6 shadow-lg`}>
                <p className="text-sm opacity-90">Commandes</p>
                <p className="text-2xl font-bold">{analyticsData?.total_orders || 0}</p>
              </div>
              <div className={`bg-gradient-to-r from-purple-400 to-purple-600 text-white rounded-lg p-6 shadow-lg`}>
                <p className="text-sm opacity-90">Clients</p>
                <p className="text-2xl font-bold">{analyticsData?.total_customers || 0}</p>
              </div>
            </div>

            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
              {/* Revenue Chart */}
              <div className="bg-white rounded-lg shadow-lg p-6">
                <h3 className="text-xl font-bold mb-6">Évolution du Chiffre d'Affaires</h3>
                <div className="h-64 bg-gradient-to-t from-purple-50 to-transparent rounded-lg flex items-end justify-around p-4">
                  {analyticsData?.monthly_revenue.map((value, index) => (
                    <div key={index} className="flex flex-col items-center">
                      <div 
                        className="bg-gradient-to-t from-purple-500 to-purple-300 rounded-t w-12"
                        style={{ height: `${(value.revenue / Math.max(...analyticsData.monthly_revenue.map(v => v.revenue))) * 200}px` }}
                      ></div>
                      <span className="text-xs mt-2 text-gray-600">
                        {value.month}
                      </span>
                      <span className="text-xs text-purple-600 font-semibold">
                        {(value.revenue / 1000000).toFixed(1)}M
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Top Products */}
              <div className="bg-white rounded-lg shadow-lg p-6">
                <h3 className="text-xl font-bold mb-6">Produits les Plus Vendus</h3>
                <div className="space-y-4">
                  {analyticsData?.top_products.map((product, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-purple-500 text-white rounded-lg flex items-center justify-center text-sm font-bold">
                          {index + 1}
                        </div>
                        <div>
                          <p className="font-semibold">{product.name}</p>
                          <p className="text-sm text-gray-600">{product.sales} ventes</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-purple-600">
                          {formatPrice(product.revenue)}
                        </p>
                      </div>
                    </div>
                  ))}
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

export default SellerAnalytics;
