import React, { useState, useEffect } from 'react';
import AdminSidebar from './AdminSidebar';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:8000/api';

export const AdminOrders = (props) => {
  const { setUser } = props;
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('all');

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/admin/orders`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setOrders(data);
      } else {
        console.error('Erreur lors de la récupération des commandes');
      }
    } catch (error) {
      console.error('Erreur:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateOrderStatus = async (orderId, newStatus) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/admin/orders/${orderId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status: newStatus })
      });

      if (response.ok) {
        // Update the order in the local state
        setOrders(orders.map(order =>
          order.id === orderId
            ? { ...order, status: newStatus }
            : order
        ));
      } else {
        console.error('Erreur lors de la mise à jour du statut');
      }
    } catch (error) {
      console.error('Erreur:', error);
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
      case 'confirmed': return 'bg-blue-100 text-blue-800';
      case 'shipped': return 'bg-purple-100 text-purple-800';
      case 'delivered': return 'bg-green-100 text-green-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'pending': return '⏳';
      case 'confirmed': return '✅';
      case 'shipped': return '🚚';
      case 'delivered': return '📦';
      case 'cancelled': return '❌';
      default: return '📋';
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'pending': return 'En attente';
      case 'confirmed': return 'Confirmée';
      case 'shipped': return 'Expédiée';
      case 'delivered': return 'Livrée';
      case 'cancelled': return 'Annulée';
      default: return status;
    }
  };

  const filteredOrders = filterStatus === 'all'
    ? orders
    : orders.filter(order => order.status === filterStatus);

  console.log('Filtered orders:', filteredOrders);

  return (
    <div className="flex min-h-screen bg-gray-100">
      <AdminSidebar setUser={setUser} />

      <div className="flex-1 p-8">
        <div className="max-w-7xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-800">Gestion des Commandes</h1>
            <p className="text-gray-600 mt-2">
              Gérez toutes les commandes de la plateforme
            </p>
          </div>

          {loading ? (
            <div className="bg-white rounded-lg shadow-md p-12 text-center">
              <div className="text-6xl mb-4">⏳</div>
              <h2 className="text-2xl font-bold text-gray-800 mb-3">
                Chargement des commandes...
              </h2>
            </div>
          ) : (
            <>
              {/* Filters */}
              <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
                <div className="flex flex-col sm:flex-row justify-between items-center space-y-4 sm:space-y-0">
                  <div>
                    <h2 className="text-xl font-bold">Toutes les Commandes ({filteredOrders.length})</h2>
                    <p className="text-gray-600">Gérez le statut de toutes les commandes</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {['all', 'pending', 'confirmed', 'shipped', 'delivered', 'cancelled'].map(status => (
                      <button
                        key={status}
                        onClick={() => setFilterStatus(status)}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                          filterStatus === status
                            ? 'bg-blue-600 text-white'
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
                    <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-6 space-y-4 lg:space-y-0">
                      <div className="flex-1">
                        <div className="flex items-center space-x-4 mb-3">
                          <h3 className="text-lg font-bold">Commande #{order.id.slice(-6)}</h3>
                          <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(order.status)}`}>
                            {getStatusIcon(order.status)} {getStatusText(order.status)}
                          </span>
                        </div>

                        {/* Customer Info */}
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-3">
                          <h4 className="font-semibold text-blue-900 mb-2">👤 Informations Client</h4>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                            <div><span className="font-medium">Nom:</span> {order.buyerName || 'N/A'}</div>
                            <div><span className="font-medium">WhatsApp:</span> {order.buyerWhatsapp || order.deliveryPhone || 'N/A'}</div>
                            <div><span className="font-medium">Email:</span> {order.buyerEmail || 'N/A'}</div>
                            <div><span className="font-medium">Ville:</span> {order.deliveryCity || 'N/A'}</div>
                          </div>
                          {order.deliveryAddress && (
                            <div className="mt-2 text-sm"><span className="font-medium">Adresse:</span> {order.deliveryAddress}</div>
                          )}
                        </div>

                        <div className="flex items-center space-x-6 text-sm text-gray-600">
                          <span>📅 {new Date(order.createdDate).toLocaleDateString('fr-FR')}</span>
                          <span className="font-semibold text-green-600">
                            {formatPrice(order.total)}
                          </span>
                        </div>
                      </div>

                      <div className="flex space-x-2">
                        <select
                          value={order.status}
                          onChange={(e) => updateOrderStatus(order.id, e.target.value)}
                          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="pending">En attente</option>
                          <option value="confirmed">Confirmée</option>
                          <option value="shipped">Expédiée</option>
                          <option value="delivered">Livrée</option>
                          <option value="cancelled">Annulée</option>
                        </select>
                      </div>
                    </div>

                    {/* Order Items */}
                    <div className="border-t pt-4">
                      <h4 className="font-semibold mb-3">📦 Articles commandés:</h4>
                      <div className="space-y-3">
                        {order.items.map((item, index) => (
                          <div key={index} className="border border-gray-200 rounded-lg p-4">
                            <div className="flex justify-between items-start mb-2">
                              <div className="flex-1">
                                <div className="font-medium text-lg">{item.productName}</div>
                                <div className="text-sm text-gray-600">
                                  Quantité: × {item.quantity} | Prix unitaire: {formatPrice(item.price)}
                                </div>
                              </div>
                              <div className="font-semibold text-green-600">
                                {formatPrice(item.price * item.quantity)}
                              </div>
                            </div>

                            {/* Seller Info */}
                            <div className="bg-purple-50 border border-purple-200 rounded-lg p-3 mt-2">
                              <div className="text-sm">
                                <span className="font-semibold text-purple-900">🏪 Vendeur:</span>
                                <div className="mt-1 grid grid-cols-1 md:grid-cols-2 gap-2">
                                  <div><span className="font-medium">Nom:</span> {item.sellerName || 'N/A'}</div>
                                  <div><span className="font-medium">Entreprise:</span> {item.sellerBusinessName || 'N/A'}</div>
                                  <div><span className="font-medium">WhatsApp:</span> {item.sellerWhatsapp || 'N/A'}</div>
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Notes */}
                    {order.notes && (
                      <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                        <span className="font-semibold">📝 Notes:</span> {order.notes}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {filteredOrders.length === 0 && (
                <div className="bg-white rounded-lg shadow-md p-12 text-center">
                  <div className="text-6xl mb-4">📋</div>
                  <h3 className="text-xl font-semibold mb-2">Aucune commande trouvée</h3>
                  <p className="text-gray-600">
                    {filterStatus === 'all'
                      ? "Aucune commande n'a encore été passée."
                      : `Aucune commande avec le statut "${getStatusText(filterStatus)}".`
                    }
                  </p>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminOrders;
