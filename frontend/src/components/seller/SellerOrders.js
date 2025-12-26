
import React, { useState, useEffect } from 'react';
import SellerHeader from './SellerHeader';

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
                  <p><strong>Acheteur:</strong> {order.buyerName}</p>
                  <p><strong>Moyen de livraison:</strong> {order.pickupPointName ? `Retrait au point: ${order.pickupPointName}` : 'Livraison à domicile'}</p>
                  {order.shippingAddress && (
                     <div className="bg-gray-50 p-3 rounded">
                       <p className="font-semibold text-sm">Adresse de livraison:</p>
                       <p className="text-sm">{order.shippingAddress}</p>
                       <p className="text-sm">{order.shippingCity}, {order.shippingRegion}</p>
                       <p className="text-sm">Tél: {order.shippingPhone}</p>
                     </div>
                  )}
                  
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

const SellerOrders = (props) => {
  const { language, user } = props;
  const [orders, setOrders] = useState([]);
  const [filterStatus, setFilterStatus] = useState('all');
  const [selectedOrder, setSelectedOrder] = useState(null);

  useEffect(() => {
    const fetchOrders = async () => {
      if (!user) return;
      try {
        const sellerId = user.id; 
        const response = await fetch(`${API_BASE_URL}/orders?seller_id=${sellerId}`);
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
  }, [user]);

  const filteredOrders = filterStatus === 'all' 
    ? orders 
    : orders.filter(order => order.status === filterStatus);

  const updateOrderStatus = async (orderId, newStatus) => {
    try {
      const response = await fetch(`${API_BASE_URL}/orders/${orderId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'X-Seller-Id': user.id,
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
    <div className="lg:col-span-3">
      <SellerHeader title="Gestion des Commandes" language={language} user={user} />
      <OrderDetailModal order={selectedOrder} onClose={() => setSelectedOrder(null)} formatPrice={formatPrice} />
      
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
                <button 
                  onClick={() => setSelectedOrder(order)}
                  className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                >
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
  );
};

export default SellerOrders;
