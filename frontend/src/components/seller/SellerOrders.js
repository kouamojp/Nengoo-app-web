
import React, { useState, useEffect } from 'react';
import Header from '../layout/Header';
import Footer from '../layout/Footer';
import SellerSidebar from './SellerSidebar';
import SellerHeader from './SellerHeader';

const SellerOrders = (props) => {
  const { language } = props;
  const [orders, setOrders] = useState([]);
  const [filterStatus, setFilterStatus] = useState('all');

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        // TODO: Replace with dynamic seller ID from auth context
        const sellerId = 'seller_1'; 
        const response = await fetch(`http://localhost:8000/api/orders?seller_id=${sellerId}`);
        if (!response.ok) {
          throw new Error('Failed to fetch orders');
        }
        const data = await response.json();
        setOrders(data);
      } catch (error) {
        console.error("Error fetching orders:", error);
        // Handle error, e.g., show a toast message
      }
    };

    fetchOrders();
  }, []);

  const filteredOrders = filterStatus === 'all' 
    ? orders 
    : orders.filter(order => order.status === filterStatus);

  const updateOrderStatus = async (orderId, newStatus) => {
    try {
      const response = await fetch(`http://localhost:8000/api/orders/${orderId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          // TODO: Add authorization headers if required
        },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!response.ok) {
        throw new Error('Failed to update order status');
      }

      const updatedOrder = await response.json();

      setOrders(orders.map(order => 
        order.id === orderId 
          ? updatedOrder
          : order
      ));
    } catch (error) {
      console.error("Error updating order status:", error);
      // Handle error, e.g., show a toast message
    }
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
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'shipped': return 'bg-blue-100 text-blue-800';
      case 'delivered': return 'bg-green-100 text-green-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'pending': return '⏳';
      case 'shipped': return '🚚';
      case 'delivered': return '✅';
      case 'cancelled': return '❌';
      default: return '📋';
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'pending': return 'En attente';
      case 'shipped': return 'Expédiée';
      case 'delivered': return 'Livrée';
      case 'cancelled': return 'Annulée';
      default: return status;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header {...props} />
      
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Sidebar */}
          <div className="lg:col-span-1">
            <SellerSidebar currentPage="orders" language={language} />
          </div>
          
          {/* Main Content */}
          <div className="lg:col-span-3">
            <SellerHeader title="Gestion des Commandes" language={language} />
            
            {/* Filters and Stats */}
            <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
              <div className="flex flex-col sm:flex-row justify-between items-center space-y-4 sm:space-y-0">
                <div>
                  <h2 className="text-xl font-bold">Mes Commandes ({filteredOrders.length})</h2>
                  <p className="text-gray-600">Gérez le statut de vos commandes</p>
                </div>
                <div className="flex space-x-2">
                  {['all', 'pending', 'shipped', 'delivered', 'cancelled'].map(status => (
                    <button
                      key={status}
                      onClick={() => setFilterStatus(status)}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                        filterStatus === status
                          ? 'bg-purple-600 text-white'
                          : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                      }`}
                    >
                      {status === 'all' ? 'Toutes' : getStatusText(status)}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Orders List */}
            <div className="space-y-6">
              {filteredOrders.map(order => (
                <div key={order.id} className="bg-white rounded-lg shadow-lg p-6">
                  {/* Order Header */}
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 space-y-4 sm:space-y-0">
                    <div>
                      <div className="flex items-center space-x-4">
                        <h3 className="text-lg font-bold">Commande {order.id}</h3>
                        <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(order.status)}`}>
                          {getStatusIcon(order.status)} {getStatusText(order.status)}
                        </span>
                      </div>
                      <div className="flex items-center space-x-6 text-sm text-gray-600 mt-2">
                        <span>👤 {order.buyerName}</span>
                        <span>📅 {new Date(order.orderedDate).toLocaleDateString('fr-FR')}</span>
                        <span className="font-semibold text-purple-600">
                          {formatPrice(order.totalAmount)}
                        </span>
                      </div>
                    </div>
                    
                    <div className="flex space-x-2">
                      <select
                        value={order.status}
                        onChange={(e) => updateOrderStatus(order.id, e.target.value)}
                        className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                      >
                        <option value="pending">En attente</option>
                        <option value="shipped">Expédiée</option>
                        <option value="delivered">Livrée</option>
                        <option value="cancelled">Annulée</option>
                      </select>
                      <button className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
                        Détails
                      </button>
                    </div>
                  </div>
                  
                  {/* Order Items */}
                  <div className="border-t pt-4">
                    <h4 className="font-semibold mb-3">Articles commandés:</h4>
                    <div className="space-y-2">
                      {order.products.map((item, index) => (
                        <div key={index} className="flex justify-between items-center py-2 px-4 bg-gray-50 rounded-lg">
                          <div>
                            <span className="font-medium">{item.name}</span>
                            <span className="text-gray-600 ml-2">× {item.quantity}</span>
                          </div>
                          <span className="font-semibold">{formatPrice(item.price * item.quantity)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {filteredOrders.length === 0 && (
              <div className="text-center py-16">
                <div className="text-6xl mb-4">📋</div>
                <h3 className="text-xl font-semibold mb-2">Aucune commande trouvée</h3>
                <p className="text-gray-600">
                  {filterStatus === 'all' 
                    ? "Vous n'avez pas encore de commandes."
                    : `Aucune commande avec le statut "${getStatusText(filterStatus)}".`
                  }
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
      
      <Footer language={language} />
    </div>
  );
};

export default SellerOrders;
